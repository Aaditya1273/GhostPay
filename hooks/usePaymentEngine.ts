/**
 * usePaymentEngine — React hook for enterprise payment intelligence.
 *
 * Manages the full payment lifecycle:
 *   - Create payment intents with duplicate detection
 *   - Execute payments via existing transaction hooks
 *   - Pre-flight balance validation
 *   - Retry with configurable limits
 *   - Schedule management
 *   - Recurring payroll
 *   - Receipt storage on Walrus
 *   - Compliance logging
 *   - Full traceability
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCustomWallet } from "@/contexts/CustomWallet";
import { useAgent } from "@/hooks/useAgentQuery";
import { useBalances } from "@/hooks/useBalances";
import { usePaymentTransaction } from "@/hooks/usePaymentTransaction";
import { usePayments } from "@/hooks/usePaymentQuery";
import { useComplianceTransaction } from "@/hooks/useComplianceTransaction";
import { useMemoryTransaction } from "@/hooks/useMemoryTransaction";
import { uploadToWalrus } from "@/lib/WalrusService";
import { useSuiClient } from "@mysten/dapp-kit";
import { SUI_COIN, DBUSDC_COIN } from "@/lib/constants";
import {
  createPaymentIntent,
  completePayment,
  failPayment,
  cancelPayment,
  validateBalance,
  createTraceEvent,
  appendTraceEvent,
  loadTraceEvents,
  upsertIntent,
  loadPaymentIntents,
  savePaymentIntents,
  type PaymentIntent,
  type PaymentStatus,
  type RecurringFrequency,
  type PaymentEventType,
  type PaymentTraceEvent,
  type BalanceValidation,
} from "@/lib/paymentEngine";

// ── Types ────────────────────────────────────────────────────────────────

export interface PaymentEngineState {
  /** All payment intents (pending, scheduled, completed, failed, cancelled). */
  intents: PaymentIntent[];
  /** Trace events for all payments. */
  traces: PaymentTraceEvent[];
  /** Whether any payment is currently executing. */
  executing: boolean;
  /** Last error message. */
  error: string | null;
}

export interface PaymentEngineActions {
  /** Create and execute a payment (or schedule it). */
  sendPayment: (params: {
    recipient: string;
    amount: number;
    currency: "SUI" | "USDC";
    memo: string;
    scheduledAt?: number;
    recurring?: { frequency: RecurringFrequency; day: number; maxOccurrences: number };
  }) => Promise<string | null>;
  /** Retry a failed payment. */
  retryPayment: (intentId: string) => Promise<void>;
  /** Cancel a pending or scheduled payment. */
  cancelPayment: (intentId: string) => void;
  /** Get filtered intents by status. */
  getIntentsByStatus: (status: PaymentStatus) => PaymentIntent[];
  /** Validate balance before sending. */
  checkBalance: (amount: number, currency: "SUI" | "USDC") => BalanceValidation;
  /** Get trace events for a specific payment. */
  getPaymentTraces: (paymentId: string) => PaymentTraceEvent[];
}

// ── Hook ─────────────────────────────────────────────────────────────────

export function usePaymentEngine(): PaymentEngineState & PaymentEngineActions {
  const suiClient = useSuiClient();
  const { address } = useCustomWallet();
  const { agentId } = useAgent();
  const { sui, usdc, refetch: refetchBalances } = useBalances();
  const { payments: chainPayments } = usePayments();
  const { transferTokens } = usePaymentTransaction();
  const { logAccess } = useComplianceTransaction();
  const { storeMemory } = useMemoryTransaction();

  const [intents, setIntents] = useState<PaymentIntent[]>(() => loadPaymentIntents());
  const [traces, setTraces] = useState<PaymentTraceEvent[]>(() => loadTraceEvents());
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync from storage on mount
  useEffect(() => {
    setIntents(loadPaymentIntents());
    setTraces(loadTraceEvents());
  }, []);

  // ── Trace helper ──────────────────────────────────────────────────

  const addTrace = useCallback(
    (paymentId: string, event: PaymentEventType, detail: string, actor: "user" | "system" | "agent") => {
      const trace = createTraceEvent(paymentId, event, detail, actor);
      const updated = appendTraceEvent(trace);
      setTraces([...updated]);
    },
    [],
  );

  // ── Balance check ─────────────────────────────────────────────────

  const checkBalance = useCallback(
    (amount: number, currency: "SUI" | "USDC"): BalanceValidation => {
      return validateBalance(sui, usdc, amount, currency);
    },
    [sui, usdc],
  );

  // ── Execute payment ───────────────────────────────────────────────

  const executePayment = useCallback(
    async (intent: PaymentIntent): Promise<string | null> => {
      if (!agentId || !address) return null;

      addTrace(intent.id, "executing", `Starting execution of ${intent.amount} ${intent.currency} to ${intent.recipient.slice(0, 8)}...`, "system");

      try {
        // Step 1: Pre-flight balance check
        const balance = checkBalance(intent.amount, intent.currency);
        if (!balance.sufficient) {
          addTrace(intent.id, "failed", `Insufficient balance: have ${balance.currentBalance.toFixed(4)} ${intent.currency}, need ${balance.requiredAmount.toFixed(4)} ${intent.currency}`, "system");

          // For USDC payments with insufficient USDC, check if SUI can be swapped
          if (intent.currency === "USDC" && balance.missingAmount > 0 && sui >= 0.5) {
            addTrace(intent.id, "deepbook_converted", `Insufficient USDC — SUI balance available for conversion`, "system");
          }

          const failed = failPayment(intent, `Insufficient ${intent.currency} balance`);
          const updated = upsertIntent(failed);
          setIntents([...updated]);
          setError(`Insufficient ${intent.currency} balance`);
          return null;
        }

        // Step 2: Execute the transfer
        const coinType = intent.currency === "SUI" ? SUI_COIN : DBUSDC_COIN;
        let coinObjectId: string | undefined;

        const coins = await suiClient.getCoins({ owner: address, coinType });
        if (coins.data.length > 0) {
          coinObjectId = coins.data[0].coinObjectId;
        } else {
          throw new Error(`No ${intent.currency} coins found in this wallet`);
        }

        const result = await transferTokens(
          agentId,
          intent.recipient,
          intent.amount,
          intent.currency,
          intent.memo,
          coinType,
          coinObjectId,
        );

        const status = result.effects?.status?.status;
        if (status === "failure") {
          throw new Error(result.effects?.status?.error || "Transaction failed");
        }

        const receiptId = result.effects?.created?.[0]?.reference?.objectId ?? "";
        const digest = result.digest;

        // Step 3: Store receipt on Walrus (best-effort)
        let receiptBlobId: string | undefined;
        try {
          const receiptPayload = JSON.stringify({
            type: "payment_receipt",
            version: 1,
            agentId,
            recipient: intent.recipient,
            amount: intent.amount,
            currency: intent.currency,
            memo: intent.memo,
            nonce: intent.nonce,
            digest,
            timestamp: Date.now(),
          });
          const encoder = new TextEncoder();
          const bytes = encoder.encode(receiptPayload);
          const walrusResult = await uploadToWalrus(bytes, 30, false);
          receiptBlobId = walrusResult.blobId;

          // Store on-chain memory reference
          if (agentId && receiptBlobId) {
            await storeMemory(
              agentId,
              receiptBlobId,
              "payment_receipt",
              bytes.length,
              false,
              `Payment ${intent.amount} ${intent.currency} → ${intent.recipient.slice(0, 8)}`,
            );
          }

          addTrace(intent.id, "receipt_stored", `Receipt stored on Walrus: ${receiptBlobId.slice(0, 12)}...`, "system");
        } catch {
          // Non-critical
        }

        // Step 4: Compliance log
        try {
          await logAccess(agentId, address, "payment_sent", intent.id);
          addTrace(intent.id, "compliance_logged", "Payment event logged to compliance", "system");
        } catch {
          // Non-critical
        }

        // Step 5: Mark completed (handles recurring rescheduling)
        const completed = completePayment(intent, receiptId, digest, receiptBlobId);
        const updated = upsertIntent(completed);
        setIntents([...updated]);

        addTrace(intent.id, "completed", `Payment completed: ${digest.slice(0, 10)}...`, "system");
        refetchBalances();
        return digest;
      } catch (err: any) {
        const msg = err?.message || "Payment execution failed";
        const failed = failPayment(intent, msg);
        const updated = upsertIntent(failed);
        setIntents([...updated]);

        addTrace(intent.id, "failed", msg, "system");
        setError(msg);
        return null;
      }
    },
    [agentId, address, sui, usdc, transferTokens, logAccess, storeMemory, suiClient, checkBalance, addTrace, refetchBalances],
  );

  // ── Check scheduled payments ──────────────────────────────────────
  const executeRef = useRef<(intent: PaymentIntent) => Promise<string | null>>();

  // Update ref after executePayment is defined
  useEffect(() => {
    executeRef.current = executePayment;
  }, [executePayment]);

  useEffect(() => {
    const checkScheduled = () => {
      const now = Date.now();
      const due = intents.filter(
        i => i.status === "scheduled" && i.scheduledAt > 0 && i.scheduledAt <= now,
      );

      for (const intent of due) {
        // Execute silently in background using ref to avoid stale closure
        executeRef.current?.(intent).catch(() => {});
      }
    };

    const interval = setInterval(checkScheduled, 15_000);
    return () => clearInterval(interval);
  }, [intents]);

  // ── Send payment ──────────────────────────────────────────────────

  const sendPayment = useCallback(
    async (params: {
      recipient: string;
      amount: number;
      currency: "SUI" | "USDC";
      memo: string;
      scheduledAt?: number;
      recurring?: { frequency: RecurringFrequency; day: number; maxOccurrences: number };
    }): Promise<string | null> => {
      if (!agentId || !address) {
        setError("Wallet not connected or no agent found");
        return null;
      }

      setError(null);
      setExecuting(true);

      try {
        // Create intent with duplicate detection
        const existing = loadPaymentIntents();
        const intent = createPaymentIntent({
          agentId,
          recipient: params.recipient,
          amount: params.amount,
          currency: params.currency,
          memo: params.memo,
          scheduledAt: params.scheduledAt,
          recurring: params.recurring,
          existingIntents: existing,
        });

        if ("error" in intent) {
          setExecuting(false);
          setError(intent.error ?? "Payment creation failed");
          return null;
        }

        // Save intent
        const updated = upsertIntent(intent);
        setIntents([...updated]);
        addTrace(intent.id, "created", `Payment intent created: ${intent.amount} ${intent.currency} → ${intent.recipient.slice(0, 8)}...`, "user");

        // If scheduled, don't execute now
        if (intent.status === "scheduled") {
          addTrace(intent.id, "scheduled", `Payment scheduled for ${new Date(intent.scheduledAt).toISOString()}`, "user");
          setExecuting(false);
          return null;
        }

        // Execute immediately
        const digest = await executePayment(intent);
        setExecuting(false);
        return digest;
      } catch (err: any) {
        setExecuting(false);
        setError(err?.message || "Failed to create payment");
        return null;
      }
    },
    [agentId, address, executePayment, addTrace],
  );

  // ── Retry ─────────────────────────────────────────────────────────

  const retryPayment = useCallback(
    async (intentId: string) => {
      const intent = intents.find(i => i.id === intentId);
      if (!intent || intent.status !== "failed") return;

      // Reset to pending with incremented retry
      const retried = {
        ...intent,
        status: "pending" as const,
        error: undefined,
        updatedAt: Date.now(),
      };
      const updated = upsertIntent(retried);
      setIntents([...updated]);
      addTrace(intentId, "retrying", `Retry attempt ${intent.retryCount + 1}/${intent.maxRetries}`, "user");

      setExecuting(true);
      await executePayment(retried);
      setExecuting(false);
    },
    [intents, executePayment, addTrace],
  );

  // ── Cancel ────────────────────────────────────────────────────────

  const cancelIntent = useCallback(
    (intentId: string) => {
      const intent = intents.find(i => i.id === intentId);
      if (!intent || (intent.status !== "pending" && intent.status !== "scheduled")) return;

      const cancelled = cancelPayment(intent);
      const updated = upsertIntent(cancelled);
      setIntents([...updated]);
      addTrace(intentId, "cancelled", "Payment cancelled by user", "user");
    },
    [intents, addTrace],
  );

  // ── Filter helpers ────────────────────────────────────────────────

  const getIntentsByStatus = useCallback(
    (status: PaymentStatus): PaymentIntent[] => {
      return intents.filter(i => i.status === status);
    },
    [intents],
  );

  const getPaymentTraces = useCallback(
    (paymentId: string): PaymentTraceEvent[] => {
      return traces.filter(t => t.paymentId === paymentId);
    },
    [traces],
  );

  // ── Sync from chain ───────────────────────────────────────────────

  // When chain payments update, match them to our intents
  useEffect(() => {
    if (chainPayments.length === 0) return;

    let changed = false;
    const updated = [...intents];

    for (const cp of chainPayments) {
      // Find matching intent by recipient + amount + currency
      const match = updated.find(
        i =>
          i.status !== "completed" &&
          i.recipient === cp.recipient &&
          i.amount === cp.amount &&
          i.currency === cp.currency &&
          Math.abs(i.createdAt - cp.timestamp) < 60_000,
      );

      if (match) {
        const idx = updated.indexOf(match);
        updated[idx] = {
          ...match,
          status: cp.status === "completed" ? "completed" : match.status === "failed" ? "failed" : match.status,
          receiptId: cp.id,
          updatedAt: Date.now(),
        };
        changed = true;
      }
    }

    if (changed) {
      savePaymentIntents(updated);
      setIntents(updated);
    }
  }, [chainPayments]);

  return {
    intents,
    traces,
    executing,
    error,
    sendPayment,
    retryPayment,
    cancelPayment: cancelIntent,
    getIntentsByStatus,
    checkBalance,
    getPaymentTraces,
  };
}
