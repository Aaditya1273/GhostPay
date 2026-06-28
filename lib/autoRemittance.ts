/**
 * autoRemittance — Automated remittance pipeline for GhostPay.
 *
 * Orchestrates the end-to-end flow:
 *   detect SUI inflow
 *   → record payment on-chain
 *   → get DeepBook quote
 *   → execute swap (SUI → USDC via SUI_DBUSDC pool)
 *   → store receipt on Walrus
 *   → create memory record
 *   → log compliance audit
 *   → update payment status
 *   → notify UI
 *
 * Pure functions and types live here. React integration is in
 * hooks/useRemittanceEngine.ts.
 *
 * ── Runtime Behaviour ──────────────────────────────────────────────
 * No polling. No timers. No mocks. The engine hook observes the
 * existing balances query (which refetches every 15s) and reacts
 * to increases. Each pipeline run is sequential and serialised so
 * only one conversion can be in-flight at a time.
 */

import { Transaction } from "@mysten/sui/transactions";
import type { SuiClient, BalanceChange } from "@mysten/sui/client";
import { POOLS, buildSwapTx, getSwapQuote } from "./DeepBookService";
import { DBUSDC_COIN } from "./constants";

// ── Types ────────────────────────────────────────────────────────────────

/** Every discrete state the pipeline can be in. */
export type RemittanceStep =
  | "idle"
  | "detected"
  | "recording_payment"
  | "quoting"
  | "swapping"
  | "confirming"
  | "storing_walrus"
  | "storing_memory"
  | "compliance_log"
  | "updating_status"
  | "completed"
  | "failed";

/** Full state returned by the engine hook. */
export interface RemittanceState {
  step: RemittanceStep;
  /** Amount of SUI detected (human-readable). */
  amountIn: number;
  /** Amount of USDC received after swap (human-readable). */
  amountOut: number;
  /** On-chain PaymentReceipt object ID. */
  receiptId?: string;
  /** DeepBook swap transaction digest. */
  swapDigest?: string;
  /** Walrus blob ID for the stored receipt. */
  blobId?: string;
  error?: string;
  startedAt: number;
  updatedAt: number;
}

// ── Pool Configuration ──────────────────────────────────────────────────

/** The SUI → USDC pool — the only pool that works for auto-conversion. */
const SUI_USDC_POOL = POOLS.SUI_DBUSDC;

/** Minimum SUI inflow to trigger conversion (prevents dust). */
const MIN_SWAP_AMOUNT_SUI = 0.5;

/** Slippage tolerance: 0.5 %. */
const SLIPPAGE_BPS = 50n; // 0.5 % = 50 basis points

// ── Guard ───────────────────────────────────────────────────────────────

/**
 * Returns true if the incoming SUI amount is worth auto-converting.
 */
export function shouldAutoConvert(amountSui: number): boolean {
  return amountSui >= MIN_SWAP_AMOUNT_SUI;
}

// ── Quoting ─────────────────────────────────────────────────────────────

/**
 * Simulate the swap to get the expected USDC output.
 * Delegates to DeepBookService.getSwapQuote with sellBase=true
 * (sell SUI → buy DBUSDC).
 */
export async function getConversionQuote(
  suiClient: SuiClient,
  sender: string,
  suiAmountMist: bigint,
): Promise<bigint> {
  return getSwapQuote(
    suiClient as any,
    sender,
    SUI_USDC_POOL,
    suiAmountMist,
    true, // sellBase=true: sell BASE (SUI) → buy QUOTE (DBUSDC)
  );
}

// ── Swap Building ───────────────────────────────────────────────────────

/**
 * Build the Transaction that swaps SUI → USDC via the SUI_DBUSDC pool.
 * Splits from gas (SUI is merged into the user's gas coin).
 */
export function buildConversionSwapTx(
  amountMist: bigint,
  minOutMist: bigint,
  recipient: string,
): Transaction {
  return buildSwapTx(SUI_USDC_POOL, amountMist, minOutMist, true, recipient);
}

/**
 * Calculate the minimum output with built-in slippage protection.
 * minOut = expectedOut × (1 − SLIPPAGE_BPS/10000)
 */
export function calculateMinOut(expectedOut: bigint): bigint {
  // expectedOut * (10000 - SLIPPAGE_BPS) / 10000
  return expectedOut * (10000n - SLIPPAGE_BPS) / 10000n;
}

// ── Receipt Formatting ──────────────────────────────────────────────────

/**
 * Build the JSON payload that will be stored on Walrus as proof of
 * the auto-conversion. Contains all metadata for audit.
 */
export function formatReceiptPayload(params: {
  amountSui: number;
  amountUsdc: number;
  swapDigest: string;
  paymentReceiptId: string;
  timestamp: number;
}): string {
  return JSON.stringify({
    type: "auto_remittance",
    version: 1,
    network: "testnet",
    pool: "SUI_DBUSDC",
    ...params,
  });
}

/**
 * Parse the USDC output amount from a swap's balance changes.
 * Returns the human-readable USDC amount (0 if not found).
 */
export function parseSwapOutput(
  balanceChanges: BalanceChange[] | null | undefined,
): number {
  if (!balanceChanges) return 0;
  for (const bc of balanceChanges) {
    if (bc.coinType === DBUSDC_COIN) {
      const amount = Number(bc.amount);
      if (amount > 0) return amount / 1_000_000; // DBUSDC has 6 decimals
    }
  }
  return 0;
}

export { SUI_USDC_POOL };
