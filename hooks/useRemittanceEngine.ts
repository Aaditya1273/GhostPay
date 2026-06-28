"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { useCustomWallet } from "@/contexts/CustomWallet";
import { useBalances } from "./useBalances";
import { usePaymentTransaction } from "./usePaymentTransaction";
import { useMemoryTransaction } from "./useMemoryTransaction";
import { useComplianceTransaction } from "./useComplianceTransaction";
import { useAgent } from "./useAgentQuery";
import { uploadToWalrus } from "@/lib/WalrusService";
import clientConfig from "@/config/clientConfig";
import {
  type RemittanceStep,
  getConversionQuote,
  buildConversionSwapTx,
  formatReceiptPayload,
  parseSwapOutput,
  shouldAutoConvert,
  calculateMinOut,
} from "@/lib/autoRemittance";

// ── Public Types ────────────────────────────────────────────────────────

export interface EngineStatus {
  /** Current pipeline step. "idle" when nothing is running. */
  step: RemittanceStep;
  /** Timestamp of the last completed pipeline run (ms). */
  lastRunAt: number | null;
  /** Error message from the last failed run. */
  lastError: string | null;
  /** Amount of SUI being converted in the current run. */
  currentAmount: number;
}

// ── Hook ────────────────────────────────────────────────────────────────

/**
 * useRemittanceEngine — Runs as a background observer inside the app layout.
 *
 * Behaviour:
 *  1. Watches the SUI balance from useBalances (which polls every 15s).
 *  2. When the SUI balance increases by >= 0.5 SUI, triggers the pipeline.
 *  3. Pipeline is serialised — only one conversion runs at a time.
 *  4. Each step is sequential and each intermediate result is
 *     consumed by the next step (no mock data, no fake transitions).
 *  5. On success, balances are force-refreshed so the UI picks up the new
 *     USDC balance after the swap.
 *
 * Returns a lightweight status object that can drive a toast or badge
 * without modifying any existing UI.
 */
export function useRemittanceEngine(): EngineStatus {
  const { address, executeTransactionBlockWithoutSponsorship, sponsorAndExecuteTransactionBlock } = useCustomWallet();
  const { sui, usdc, refetch } = useBalances();
  const { agentId } = useAgent();
  const suiClient = useSuiClient();

  const { recordPayment, updatePaymentStatus } = usePaymentTransaction();
  const { storeMemory } = useMemoryTransaction();
  const { logAccess } = useComplianceTransaction();

  // ── State ────────────────────────────────────────────────────────
  const [step, setStep] = useState<RemittanceStep>("idle");
  const [lastRunAt, setLastRunAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [currentAmount, setCurrentAmount] = useState(0);

  // Track previous SUI balance so we can detect increases.
  const prevSuiRef = useRef<number | null>(null);
  // Serialisation lock — prevents concurrent pipeline runs.
  const runningRef = useRef(false);

  // ── Pipeline ──────────────────────────────────────────────────────

  const runPipeline = useCallback(
    async (incomingSui: number) => {
      if (!address || !agentId || runningRef.current) return;
      runningRef.current = true;
      setCurrentAmount(incomingSui);

      try {
        const suiMist = BigInt(Math.floor(incomingSui * 1_000_000_000));

        // ── Step 1: Record payment receipt on-chain (best-effort) ──────────
        // If the Move package is not deployed the call will fail; we catch
        // and continue so the DeepBook swap still executes.
        setStep("recording_payment");
        let receiptId: string | undefined;
        try {
          const paymentResult = await recordPayment(
            agentId,
            address,
            Number(suiMist), // MUST be in smallest unit (MIST) to avoid EZeroAmount abort
            "SUI",
            `Auto-detected incoming SUI — queued for DeepBook conversion`,
          );
          receiptId =
            paymentResult.effects?.created?.[0]?.reference?.objectId;
        } catch (recordErr: any) {
          // Non-fatal — log and continue without a receipt ID
          console.warn(
            "[Remittance] recordPayment skipped (contract may not be deployed):",
            recordErr?.message,
          );
        }

        // ── Step 2: Get DeepBook quote ─────────────────────────────
        setStep("quoting");
        const expectedOut = await getConversionQuote(suiClient, address, suiMist);
        if (expectedOut === 0n) {
          throw new Error(
            "Swap quote returned 0 — DeepBook pool may be empty or package ID incorrect",
          );
        }

        // ── Step 3: Execute swap ───────────────────────────────────
        setStep("swapping");
        const minOut = calculateMinOut(expectedOut);
        const swapTx = buildConversionSwapTx(suiMist, minOut, address);

        const swapResult = await executeTransactionBlockWithoutSponsorship({
          tx: swapTx,
          options: {
            showEffects: true,
            showEvents: true,
            showBalanceChanges: true,
          },
        });

        if (!swapResult || !swapResult.digest) {
          throw new Error("Swap transaction failed — no digest returned");
        }
        if (swapResult.effects?.status?.status === "failure") {
          throw new Error(
            `Swap failed: ${swapResult.effects.status.error || "Unknown error"}`,
          );
        }

        const usdcOut = parseSwapOutput(swapResult.balanceChanges);

        // ── Step 4: Store receipt on Walrus ────────────────────────
        setStep("storing_walrus");
        const receiptPayload = formatReceiptPayload({
          amountSui: incomingSui,
          amountUsdc: usdcOut,
          swapDigest: swapResult.digest,
          paymentReceiptId: receiptId ?? "none",
          timestamp: Date.now(),
        });
        const encoder = new TextEncoder();
        const receiptBytes = encoder.encode(receiptPayload);
        const walrusResult = await uploadToWalrus(receiptBytes, 30, false);

        // ── Step 5: Store memory record on-chain (best-effort) ─────────────
        setStep("storing_memory");
        try {
          await storeMemory(
            agentId,
            walrusResult.blobId,
            "swap_receipt",
            receiptBytes.length,
            false,
            `Auto-convert ${incomingSui.toFixed(2)} SUI → ${usdcOut.toFixed(2)} USDC`,
          );
        } catch (memErr: any) {
          console.warn(
            "[Remittance] storeMemory skipped (contract may not be deployed):",
            memErr?.message,
          );
        }

        // ── Step 6: Log compliance audit trail (best-effort) ───────────────
        setStep("compliance_log");
        try {
          await logAccess(
            agentId,
            address,
            "auto_remittance",
            `swap_receipt:${walrusResult.blobId}`,
          );
        } catch (logErr: any) {
          console.warn(
            "[Remittance] logAccess skipped (contract may not be deployed):",
            logErr?.message,
          );
        }

        // ── Step 7: Update payment status (best-effort) ────────────────────
        if (receiptId) {
          setStep("updating_status");
          try {
            await updatePaymentStatus(receiptId, "converted", agentId);
          } catch (statusErr: any) {
            console.warn(
              "[Remittance] updatePaymentStatus skipped:",
              statusErr?.message,
            );
          }
        }

        // ── Success ────────────────────────────────────────────────
        setStep("completed");
        setLastRunAt(Date.now());
        setLastError(null);
        setCurrentAmount(0);

        // Force-refresh balances so the UI picks up USDC immediately.
        refetch();
      } catch (err: any) {
        const msg = err?.message || "Remittance pipeline failed";
        setStep("failed");
        setLastError(msg);
      } finally {
        runningRef.current = false;
      }
    },
    [
      address,
      agentId,
      suiClient,
      executeTransactionBlockWithoutSponsorship,
      recordPayment,
      updatePaymentStatus,
      storeMemory,
      logAccess,
      refetch,
    ],
  );

  // ── Balance Observer ──────────────────────────────────────────────

  useEffect(() => {
    if (!address || !agentId) {
      prevSuiRef.current = null;
      return;
    }

    const current = sui;

    if (prevSuiRef.current === null) {
      prevSuiRef.current = current;
      return;
    }

    const prev = prevSuiRef.current;

    if (current > prev) {
      const delta = current - prev;
      prevSuiRef.current = current;

      if (shouldAutoConvert(delta)) {
        // Fire-and-forget: the pipeline serialises itself via runningRef.
        setTimeout(() => runPipeline(delta), 0);
      }
    } else {
      prevSuiRef.current = current;
    }
  }, [sui, address, agentId, runPipeline]);

  // ── Reset "completed"/"failed" to "idle" after a short delay ─────
  useEffect(() => {
    if (step === "completed" || step === "failed") {
      const timer = setTimeout(() => {
        setStep("idle");
        if (step === "completed") setCurrentAmount(0);
      }, 8_000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  return {
    step,
    lastRunAt,
    lastError,
    currentAmount,
  };
}
