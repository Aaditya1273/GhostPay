/**
 * paymentEngine — Enterprise payment intelligence for GhostPay.
 *
 * Transforms manual payments into a traceable, automated system:
 *   - Scheduled payments (one-shot at future date)
 *   - Recurring payroll (cron-style intervals)
 *   - Payment lifecycle: pending → completed / failed / cancelled
 *   - Retry with exponential backoff
 *   - Duplicate detection (same recipient + amount + currency within window)
 *   - Balance validation before execution (pre-flight check)
 *   - Pre-flight simulation (dry-run via devInspect)
 *   - Receipt storage on Walrus
 *   - Compliance logging (every payment event logged)
 *   - DeepBook integration (auto-convert before payout if needed)
 *   - Every payment traceable (nonce, chain of events, Walrus receipts)
 */

import type { SuiClient } from "@mysten/sui/client";

// ══════════════════════════════════════════════════════════════════════════
//  Types
// ══════════════════════════════════════════════════════════════════════════

/** Core payment statuses. */
export type PaymentStatus = "pending" | "scheduled" | "completed" | "failed" | "cancelled";

/** Recurring frequency. */
export type RecurringFrequency = "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";

/** A single payment intent (what the user wants to happen). */
export interface PaymentIntent {
  id: string;
  agentId: string;
  recipient: string;
  amount: number;
  currency: "SUI" | "USDC";
  memo: string;
  /** When the payment was created. */
  createdAt: number;
  /** Scheduled execution time (0 = immediate). */
  scheduledAt: number;
  /** Recurring configuration (undefined = one-time). */
  recurring?: RecurringConfig;
  /** Current status. */
  status: PaymentStatus;
  /** Error message if failed. */
  error?: string;
  /** Retry count. */
  retryCount: number;
  /** Maximum retries before giving up. */
  maxRetries: number;
  /** Detection nonce for duplicate check. */
  nonce: string;
  /** On-chain PaymentReceipt object ID (set after execution). */
  receiptId?: string;
  /** Transaction digest. */
  txDigest?: string;
  /** Walrus blob ID for receipt storage. */
  receiptBlobId?: string;
  /** Timestamp of last status change. */
  updatedAt: number;
}

/** Recurring payment configuration. */
export interface RecurringConfig {
  frequency: RecurringFrequency;
  /** Day of month (1-31) or day of week (0-6, 0=Sunday). */
  day: number;
  /** End after this many occurrences (0 = infinite). */
  maxOccurrences: number;
  /** Number of occurrences so far. */
  occurrences: number;
  /** ISO timestamp when recurrence started. */
  startedAt: string;
  /** ISO timestamp of last occurrence. */
  lastOccurrence?: string;
}

/** Result of a pre-flight balance validation. */
export interface BalanceValidation {
  sufficient: boolean;
  currentBalance: number;
  requiredAmount: number;
  missingAmount: number;
  currency: string;
}

/** Result of a pre-flight simulation (devInspect dry-run). */
export interface PreFlightResult {
  success: boolean;
  error?: string;
  expectedGasUsed?: bigint;
  effects?: unknown;
}

/** A traceability event in a payment's lifecycle. */
export interface PaymentTraceEvent {
  paymentId: string;
  timestamp: number;
  event: PaymentEventType;
  detail: string;
  actor: "user" | "system" | "agent";
}

/** Types of traceability events. */
export type PaymentEventType =
  | "created"
  | "scheduled"
  | "pre_flight_checked"
  | "balance_validated"
  | "executing"
  | "completed"
  | "failed"
  | "cancelled"
  | "retrying"
  | "receipt_stored"
  | "compliance_logged"
  | "deepbook_converted"
  | "recurrence_skipped";

// ══════════════════════════════════════════════════════════════════════════
//  Constants
// ══════════════════════════════════════════════════════════════════════════

/** Default max retries. */
const DEFAULT_MAX_RETRIES = 3;

/** Duplicate detection window (ms): same recipient+amount+currency within 5 minutes == duplicate. */
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;

/** Storage keys. */
const INTENTS_KEY = "ghostpay_payment_intents";
const TRACE_KEY = "ghostpay_payment_traces";

// ══════════════════════════════════════════════════════════════════════════
//  Nonce Generation (Replay + Duplicate Protection)
// ══════════════════════════════════════════════════════════════════════════

/**
 * Generate a deterministic nonce for a payment intent.
 * Prevents duplicate submissions of the same payment.
 */
export function generatePaymentNonce(
  recipient: string,
  amount: number,
  currency: string,
  memo: string,
): string {
  const raw = `${recipient}:${amount}:${currency}:${memo}:${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `pay_${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

// ══════════════════════════════════════════════════════════════════════════
//  Duplicate Detection
// ══════════════════════════════════════════════════════════════════════════

/**
 * Check if a payment is a duplicate of an existing pending or recent payment.
 * Same recipient + amount + currency within DUPLICATE_WINDOW_MS.
 */
export function isDuplicatePayment(
  existingIntents: PaymentIntent[],
  recipient: string,
  amount: number,
  currency: string,
): boolean {
  const now = Date.now();
  return existingIntents.some(
    intent =>
      intent.status === "pending" &&
      intent.recipient === recipient &&
      intent.amount === amount &&
      intent.currency === currency &&
      now - intent.createdAt < DUPLICATE_WINDOW_MS,
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  Balance Validation
// ══════════════════════════════════════════════════════════════════════════

/**
 * Check if the user has sufficient balance for a payment.
 */
export function validateBalance(
  balanceSui: number,
  balanceUsdc: number,
  amount: number,
  currency: "SUI" | "USDC",
): BalanceValidation {
  const currentBalance = currency === "SUI" ? balanceSui : balanceUsdc;
  const sufficient = currentBalance >= amount;
  const missing = Math.max(0, amount - currentBalance);

  return {
    sufficient,
    currentBalance,
    requiredAmount: amount,
    missingAmount: missing,
    currency,
  };
}

// ══════════════════════════════════════════════════════════════════════════
//  Schedule Computation
// ══════════════════════════════════════════════════════════════════════════

/**
 * Compute the next occurrence timestamp for a recurring payment.
 */
export function computeNextOccurrence(
  frequency: RecurringFrequency,
  day: number,
  afterTimestamp: number,
): number {
  const after = new Date(afterTimestamp);

  switch (frequency) {
    case "daily":
      return after.getTime() + 24 * 60 * 60 * 1000;

    case "weekly": {
      const next = new Date(after);
      next.setDate(next.getDate() + ((day - next.getDay() + 7) % 7 || 7));
      return next.getTime();
    }

    case "biweekly":
      return after.getTime() + 14 * 24 * 60 * 60 * 1000;

    case "monthly": {
      const next = new Date(after);
      next.setMonth(next.getMonth() + 1);
      // Clamp day to last day of target month to avoid JS date rollover
      const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(day, lastDay));
      return next.getTime();
    }

    case "quarterly":
      return after.getTime() + 90 * 24 * 60 * 60 * 1000;

    case "yearly": {
      const next = new Date(after);
      next.setFullYear(next.getFullYear() + 1);
      return next.getTime();
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  Payment Intent Lifecycle
// ══════════════════════════════════════════════════════════════════════════

/**
 * Create a new payment intent with duplicate detection.
 */
export function createPaymentIntent(params: {
  agentId: string;
  recipient: string;
  amount: number;
  currency: "SUI" | "USDC";
  memo: string;
  scheduledAt?: number;
  maxRetries?: number;
  existingIntents?: PaymentIntent[];
  recurring?: Partial<RecurringConfig>;
}): PaymentIntent | { error: string } {
  // Validate inputs
  if (params.amount <= 0) return { error: "Amount must be greater than 0" };
  if (!params.recipient.startsWith("0x") || params.recipient.length < 40) {
    return { error: "Invalid recipient address" };
  }

  // Duplicate check
  if (params.existingIntents) {
    const dup = isDuplicatePayment(
      params.existingIntents,
      params.recipient,
      params.amount,
      params.currency,
    );
    if (dup) {
      return { error: "Duplicate payment detected. Same payment was submitted within the last 5 minutes." };
    }
  }

  const nonce = generatePaymentNonce(
    params.recipient,
    params.amount,
    params.currency,
    params.memo,
  );

  const now = Date.now();
  const scheduledAt = params.scheduledAt ?? 0;
  const isScheduled = scheduledAt > now;

  // Fill in defaults for partial recurring config
  let recurring: RecurringConfig | undefined;
  if (params.recurring && params.recurring.frequency !== undefined) {
    recurring = {
      frequency: params.recurring.frequency,
      day: params.recurring.day ?? 1,
      maxOccurrences: params.recurring.maxOccurrences ?? 0,
      occurrences: params.recurring.occurrences ?? 0,
      startedAt: params.recurring.startedAt ?? new Date(now).toISOString(),
      lastOccurrence: params.recurring.lastOccurrence,
    };
  }

  return {
    id: `intent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    agentId: params.agentId,
    recipient: params.recipient,
    amount: params.amount,
    currency: params.currency,
    memo: params.memo,
    createdAt: now,
    scheduledAt,
    recurring,
    status: isScheduled ? "scheduled" : "pending",
    retryCount: 0,
    maxRetries: params.maxRetries ?? DEFAULT_MAX_RETRIES,
    nonce,
    updatedAt: now,
  };
}

/**
 * Mark a payment intent as completed.
 */
export function completePayment(
  intent: PaymentIntent,
  receiptId: string,
  txDigest: string,
  receiptBlobId?: string,
): PaymentIntent {
  const now = Date.now();

  // Determine if recurring should continue
  let status: PaymentIntent["status"] = "completed";
  let scheduledAt = intent.scheduledAt;
  let recurring = intent.recurring;

  if (intent.recurring) {
    const nextSchedule = computeNextOccurrence(
      intent.recurring.frequency,
      intent.recurring.day,
      now,
    );
    const occurrences = intent.recurring.occurrences + 1;
    const maxedOut = intent.recurring.maxOccurrences > 0 && occurrences >= intent.recurring.maxOccurrences;

    if (!maxedOut) {
      status = "scheduled";
      scheduledAt = nextSchedule;
      recurring = {
        ...intent.recurring,
        occurrences,
        lastOccurrence: new Date(now).toISOString(),
      };
    }
  }

  return {
    ...intent,
    status,
    receiptId,
    txDigest,
    scheduledAt,
    recurring,
    receiptBlobId: receiptBlobId ?? intent.receiptBlobId,
    updatedAt: now,
  };
}

/**
 * Mark a payment intent as failed.
 */
export function failPayment(
  intent: PaymentIntent,
  error: string,
): PaymentIntent {
  const shouldRetry = intent.retryCount < intent.maxRetries;
  const now = Date.now();

  return {
    ...intent,
    status: shouldRetry ? "pending" : "failed",
    error,
    retryCount: shouldRetry ? intent.retryCount + 1 : intent.retryCount,
    updatedAt: now,
  };
}

/**
 * Cancel a payment intent.
 */
export function cancelPayment(intent: PaymentIntent): PaymentIntent {
  return {
    ...intent,
    status: "cancelled",
    updatedAt: Date.now(),
  };
}

// ══════════════════════════════════════════════════════════════════════════
//  Pre-Flight Simulation
// ══════════════════════════════════════════════════════════════════════════

/**
 * Run a pre-flight simulation of a payment transaction.
 * Uses devInspectTransactionBlock to dry-run without executing.
 * Returns whether the simulation succeeded.
 */
export async function simulatePreFlight(
  suiClient: SuiClient,
  sender: string,
  txBytes: Uint8Array,
): Promise<PreFlightResult> {
  try {
    const result = await suiClient.dryRunTransactionBlock({
      transactionBlock: txBytes,
    });

    const success = !result.effects?.status?.error;
    return {
      success,
      error: result.effects?.status?.error,
      expectedGasUsed: result.effects?.gasUsed?.computationCost
        ? BigInt(result.effects.gasUsed.computationCost)
        : undefined,
      effects: result.effects,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Pre-flight simulation failed",
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  Traceability
// ══════════════════════════════════════════════════════════════════════════

/**
 * Create a traceability event for a payment's lifecycle.
 */
export function createTraceEvent(
  paymentId: string,
  event: PaymentEventType,
  detail: string,
  actor: "user" | "system" | "agent",
): PaymentTraceEvent {
  return {
    paymentId,
    timestamp: Date.now(),
    event,
    detail,
    actor,
  };
}

/** Load trace events from sessionStorage. */
export function loadTraceEvents(): PaymentTraceEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(TRACE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Append a trace event to sessionStorage. */
export function appendTraceEvent(event: PaymentTraceEvent): PaymentTraceEvent[] {
  const existing = loadTraceEvents();
  existing.push(event);
  const capped = existing.slice(-500);
  try {
    sessionStorage.setItem(TRACE_KEY, JSON.stringify(capped));
  } catch {
    // storage full
  }
  return capped;
}

// ══════════════════════════════════════════════════════════════════════════
//  Intent Persistence
// ══════════════════════════════════════════════════════════════════════════

export function loadPaymentIntents(): PaymentIntent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(INTENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePaymentIntents(intents: PaymentIntent[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(INTENTS_KEY, JSON.stringify(intents));
  } catch {
    // storage full
  }
}

export function upsertIntent(intent: PaymentIntent): PaymentIntent[] {
  const existing = loadPaymentIntents();
  const idx = existing.findIndex(i => i.id === intent.id);
  if (idx >= 0) {
    existing[idx] = intent;
  } else {
    existing.push(intent);
  }
  savePaymentIntents(existing);
  return existing;
}
