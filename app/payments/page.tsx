"use client";

import { useCustomWallet } from "@/contexts/CustomWallet";
import { useState, useCallback, useMemo, useEffect } from "react";
import { usePayments } from "@/hooks/usePaymentQuery";
import { useBalances } from "@/hooks/useBalances";
import { usePaymentEngine } from "@/hooks/usePaymentEngine";
import LayoutShell from "@/components/LayoutShell";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  ChevronDown,
  Calendar,
  Repeat,
  RotateCcw,
  FileText,
  Shield,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import clientConfig from "@/config/clientConfig";
import type { PaymentStatus, RecurringFrequency } from "@/lib/paymentEngine";
import { useLoadingDeadlock } from "@/lib/demoProof";

const isPackageDeployed =
  !!(clientConfig.PACKAGE_ID && clientConfig.PACKAGE_ID !== "0x0");

// ── Status filter tabs ─────────────────────────────────────────────────┐

type FilterTab = "all" | PaymentStatus;

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "scheduled", label: "Scheduled" },
  { key: "completed", label: "Completed" },
  { key: "failed", label: "Failed" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  scheduled: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  failed: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted/10 text-muted-foreground",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Loader2 className="w-3 h-3 animate-spin" />,
  scheduled: <Clock className="w-3 h-3" />,
  completed: <CheckCircle2 className="w-3 h-3" />,
  failed: <XCircle className="w-3 h-3" />,
  cancelled: <XCircle className="w-3 h-3" />,
};

export default function PaymentsPage() {
  const { isUsingEnoki, address, redirectToAuthUrl, authLoading } = useCustomWallet();
  const { payments: chainPayments, isPending } = usePayments();
  const { sui: suiBalance, usdc: usdcBalance } = useBalances();

  // ── Payment Engine ────────────────────────────────────────────────────
  const {
    intents,
    executing,
    error: engineError,
    sendPayment,
    retryPayment,
    cancelPayment,
    getIntentsByStatus,
    checkBalance,
    getPaymentTraces,
  } = usePaymentEngine();

  // ── Local state ───────────────────────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Send Modal
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendRecipient, setSendRecipient] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendMemo, setSendMemo] = useState("");
  const [sendCurrency, setSendCurrency] = useState<"SUI" | "USDC">("SUI");
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  // Recurring
  const [enableRecurring, setEnableRecurring] = useState(false);
  const [recurFrequency, setRecurFrequency] = useState<RecurringFrequency>("weekly");
  const [recurDay, setRecurDay] = useState("1");
  const [recurMax, setRecurMax] = useState("0");

  // Traceability panel
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ── Loading deadlock protection ──────────────────────────────────────
  const { timedOut: sendTimedOut } = useLoadingDeadlock(executing);

  // ── Escape key handler ─────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showSendModal && !executing) { setShowSendModal(false); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showSendModal, executing]);

  // ── Derived ───────────────────────────────────────────────────────────

  const allIntents = useMemo(() => {
    // Merge engine intents with chain payments for display
    const merged = [...intents];
    for (const cp of chainPayments) {
      const exists = merged.some(i => i.receiptId === cp.id);
      if (!exists) {
        merged.push({
          id: cp.id,
          agentId: "",
          recipient: cp.recipient,
          amount: cp.amount,
          currency: cp.currency as "SUI" | "USDC",
          memo: cp.memo || "",
          createdAt: cp.timestamp,
          scheduledAt: 0,
          status: cp.status as PaymentStatus,
          retryCount: 0,
          maxRetries: 0,
          nonce: "",
          receiptId: cp.id,
          txDigest: "", // not available from chain query
          updatedAt: cp.timestamp,
        });
      }
    }
    // Sort by created date desc
    return merged.sort((a, b) => b.createdAt - a.createdAt);
  }, [intents, chainPayments]);

  const filteredIntents = useMemo(() => {
    let items = activeFilter === "all" ? allIntents : getIntentsByStatus(activeFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        i =>
          i.recipient.toLowerCase().includes(q) ||
          i.memo.toLowerCase().includes(q) ||
          i.amount.toString().includes(q) ||
          (i.receiptId || "").toLowerCase().includes(q),
      );
    }
    return items;
  }, [allIntents, activeFilter, getIntentsByStatus, searchQuery]);

  const selectedTraces = useMemo(
    () => (selectedIntent ? getPaymentTraces(selectedIntent) : []),
    [selectedIntent, getPaymentTraces],
  );

  // ── Summary stats ─────────────────────────────────────────────────────

  const totalSent = allIntents
    .filter(i => i.status === "completed" && i.recipient !== address)
    .reduce((s, i) => s + i.amount, 0);
  const totalReceived = chainPayments
    .filter(p => p.recipient === address)
    .reduce((s, p) => s + p.amount, 0);
  const pendingCount = allIntents.filter(i => i.status === "pending").length;
  const scheduledCount = allIntents.filter(i => i.status === "scheduled").length;

  // ── Send handler ──────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const recipient = sendRecipient.trim();
    const amount = parseFloat(sendAmount);
    const memo = sendMemo.trim();

    if (!recipient || !recipient.startsWith("0x") || recipient.length < 40) {
      toast.error("Enter a valid Sui address");
      return;
    }
    if (!amount || amount <= 0 || isNaN(amount)) {
      toast.error("Enter a valid amount");
      return;
    }

    // Balance check
    const balance = checkBalance(amount, sendCurrency);
    if (!balance.sufficient) {
      toast.error(
        `Insufficient ${sendCurrency} balance. You have ${balance.currentBalance.toFixed(4)} ${sendCurrency}, need ${balance.requiredAmount}.`,
      );
      return;
    }

    // Build scheduled datetime
    let scheduledAt: number | undefined;
    if (scheduledDate) {
      const dtStr = scheduledTime ? `${scheduledDate}T${scheduledTime}:00` : `${scheduledDate}T12:00:00`;
      scheduledAt = new Date(dtStr).getTime();
      if (scheduledAt <= Date.now()) {
        toast.error("Scheduled time must be in the future");
        return;
      }
    }

    // Recurring config
    const recurring = enableRecurring
      ? {
          frequency: recurFrequency,
          day: parseInt(recurDay, 10) || 1,
          maxOccurrences: parseInt(recurMax, 10) || 0,
        }
      : undefined;

    const digest = await sendPayment({
      recipient,
      amount,
      currency: sendCurrency,
      memo: memo || `Payment to ${recipient.slice(0, 8)}`,
      scheduledAt,
      recurring,
    });

    if (digest) {
      toast.success(`Sent ${amount} ${sendCurrency} successfully`);
    }

    // Close modal even if scheduled (no digest returned)
    if (!digest && scheduledAt) {
      toast.success(`Payment scheduled for ${new Date(scheduledAt).toLocaleString()}`);
    }

    setShowSendModal(false);
    setSendRecipient("");
    setSendAmount("");
    setSendMemo("");
    setSendCurrency("SUI");
    setScheduledDate("");
    setScheduledTime("");
    setEnableRecurring(false);
  }, [sendRecipient, sendAmount, sendMemo, sendCurrency, scheduledDate, scheduledTime, enableRecurring, recurFrequency, recurDay, recurMax, sendPayment, checkBalance]);

  // ── Retry handler ─────────────────────────────────────────────────────

  const handleRetry = useCallback(
    async (intentId: string) => {
      toast.info("Retrying payment...");
      await retryPayment(intentId);
    },
    [retryPayment],
  );

  // ── Cancel handler ────────────────────────────────────────────────────

  const handleCancel = useCallback(
    (intentId: string) => {
      cancelPayment(intentId);
      toast.info("Payment cancelled");
    },
    [cancelPayment],
  );

  // ── Export trace ──────────────────────────────────────────────────────

  const handleExportTrace = useCallback((intentId: string) => {
    const traces = getPaymentTraces(intentId);
    const blob = new Blob([JSON.stringify(traces, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payment-trace-${intentId.slice(0, 12)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Trace exported");
  }, [getPaymentTraces]);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <LayoutShell>
      <div className="p-4 lg:p-8 pb-24 lg:pb-8 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 mb-2">
              <img src="/sui.png" alt="Sui" className="w-12 h-12 object-contain rounded-xl" />
              <div>
                <h1 className="font-heading text-3xl lg:text-4xl font-semibold tracking-tight text-[#F4F6FF]">
                  Payments
                </h1>
                <p className="text-base text-[#A7B0C8] mt-1">
                  Send, schedule, and manage payments with intelligent routing
                </p>
              </div>
            </div>
            {mounted && isUsingEnoki && (
              <Button className="gap-2 hidden sm:flex" onClick={() => setShowSendModal(true)}>
                <Send className="w-4 h-4" />
                New Payment
              </Button>
            )}
          </div>
        </motion.div>

        {!mounted ? null : !isUsingEnoki ? (
          /* ── Not signed in ──────────────────────────────────────────── */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-24 gap-6"
          >
            <img
              src="/images/ghost-mascot.png"
              alt="GhostPay Mascot"
              className="w-24 h-24 object-contain animate-float"
            />
            <div className="text-center max-w-md">
              <h2 className="text-xl font-semibold mb-2">Payments Require a Wallet</h2>
              <p className="text-muted-foreground mb-4">
                Sign in to send payments, view history, and manage your transactions.
              </p>
              <Button onClick={redirectToAuthUrl} size="lg" className="gap-2" disabled={authLoading}>
                {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {authLoading ? "Redirecting…" : "Sign in with Google"}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* ── Summary Cards ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Total Sent",
                  value: totalSent.toFixed(2),
                  unit: "USD",
                  icon: ArrowUpRight,
                  color: "text-destructive",
                },
                {
                  label: "Total Received",
                  value: totalReceived.toFixed(2),
                  unit: "USD",
                  icon: ArrowDownRight,
                  color: "text-success",
                },
                {
                  label: "Pending",
                  value: String(pendingCount),
                  unit: "transactions",
                  icon: Loader2,
                  color: "text-warning",
                },
                {
                  label: "Scheduled",
                  value: String(scheduledCount),
                  unit: "upcoming",
                  icon: Calendar,
                  color: "text-primary",
                },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="rounded-xl bg-[rgba(255,255,255,0.02)] p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={cn("w-4 h-4", stat.color)} />
                      <span className="text-xs text-[#A7B0C8]">{stat.label}</span>
                    </div>
                    <p className="font-heading text-2xl font-semibold text-[#F4F6FF]">{stat.value}</p>
                    <p className="text-xs text-[#A7B0C8]">{stat.unit}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* ── Status Filter Tabs ───────────────────────────────────── */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                    activeFilter === tab.key
                      ? "bg-primary/20 text-primary"
                      : "text-[#A7B0C8] hover:text-[#F4F6FF] hover:bg-[rgba(255,255,255,0.04)]",
                  )}
                >
                  {tab.label}
                  {tab.key !== "all" && (
                    <span className="ml-1.5 text-[10px] opacity-60">
                      {allIntents.filter(i => i.status === tab.key).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Engine Error Banner ──────────────────────────────────── */}
            {engineError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-2 text-sm text-destructive"
              >
                {engineError}
              </motion.div>
            )}

            {/* ── Search & Actions ─────────────────────────────────────── */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A7B0C8]" />
                <Input
                  placeholder="Search by address, memo, amount..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              {mounted && isUsingEnoki && (
                <Button size="sm" className="gap-2 sm:hidden" onClick={() => setShowSendModal(true)}>
                  <Send className="w-4 h-4" />
                  Send
                </Button>
              )}
            </div>

            {/* ── Payments Table ───────────────────────────────────────── */}
            <div className="rounded-xl bg-[rgba(255,255,255,0.02)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.05)]">
                      <th className="text-left text-xs font-medium text-[#A7B0C8] uppercase tracking-wider px-4 py-3">Status</th>
                      <th className="text-left text-xs font-medium text-[#A7B0C8] uppercase tracking-wider px-4 py-3">To / From</th>
                      <th className="text-right text-xs font-medium text-[#A7B0C8] uppercase tracking-wider px-4 py-3">Amount</th>
                      <th className="text-left text-xs font-medium text-[#A7B0C8] uppercase tracking-wider px-4 py-3 hidden md:table-cell">Memo</th>
                      <th className="text-right text-xs font-medium text-[#A7B0C8] uppercase tracking-wider px-4 py-3">Date</th>
                      <th className="text-center text-xs font-medium text-[#A7B0C8] uppercase tracking-wider px-4 py-3 w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
                    {filteredIntents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-sm text-[#A7B0C8]">
                          {isPending
                            ? "Loading..."
                            : "No payments yet. Create one to get started."}
                        </td>
                      </tr>
                    ) : (
                      filteredIntents.map((intent, i) => {
                        const dateStr = new Date(intent.createdAt).toLocaleDateString();
                        const timeStr = new Date(intent.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                        return (
                          <motion.tr
                            key={intent.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className={cn(
                              "transition-colors text-[#F4F6FF]",
                              selectedIntent === intent.id ? "bg-[rgba(255,255,255,0.04)]" : "hover:bg-[rgba(255,255,255,0.02)]",
                            )}
                          >
                            {/* Status */}
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium",
                                  STATUS_COLORS[intent.status] || "",
                                )}
                              >
                                {STATUS_ICONS[intent.status]}
                                {intent.status}
                                {intent.status === "scheduled" && intent.scheduledAt > 0 && (
                                  <span className="ml-0.5 opacity-60">
                                    {new Date(intent.scheduledAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                                  </span>
                                )}
                              </span>
                            </td>

                            {/* To / From */}
                            <td className="px-4 py-3">
                              <span className="text-sm font-mono text-[#F4F6FF]">
                                {intent.recipient.slice(0, 6)}...{intent.recipient.slice(-4)}
                              </span>
                            </td>

                            {/* Amount */}
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm font-medium">
                                {intent.amount.toFixed(2)} {intent.currency}
                              </span>
                            </td>

                            {/* Memo */}
                            <td className="px-4 py-3 hidden md:table-cell">
                              <span className="text-sm text-[#A7B0C8] truncate max-w-[160px] inline-block">
                                {intent.memo || "—"}
                              </span>
                            </td>

                            {/* Date */}
                            <td className="px-4 py-3 text-right">
                              <div>
                                <p className="text-sm text-[#F4F6FF]">{timeStr}</p>
                                <p className="text-xs text-[#A7B0C8]">{dateStr}</p>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {/* Traceability / Info */}
                                <button
                                  onClick={() =>
                                    setSelectedIntent(selectedIntent === intent.id ? null : intent.id)
                                  }
                                  title="View traceability"
                                  className="p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5 text-[#A7B0C8]" />
                                </button>

                                {/* Retry (failed only) */}
                                {intent.status === "failed" && (
                                  <button
                                    onClick={() => handleRetry(intent.id)}
                                    disabled={executing}
                                    title="Retry payment"
                                    className="p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 text-warning" />
                                  </button>
                                )}

                                {/* Cancel (pending/scheduled only) */}
                                {(intent.status === "pending" || intent.status === "scheduled") && (
                                  <button
                                    onClick={() => handleCancel(intent.id)}
                                    title="Cancel payment"
                                    className="p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                                  >
                                    <XCircle className="w-3.5 h-3.5 text-destructive" />
                                  </button>
                                )}

                                {/* Export trace */}
                                <button
                                  onClick={() => handleExportTrace(intent.id)}
                                  title="Export trace"
                                  className="p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                                >
                                  <Download className="w-3.5 h-3.5 text-[#A7B0C8]" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Traceability Panel ────────────────────────────────────── */}
            <AnimatePresence>
              {selectedIntent && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="rounded-xl bg-[rgba(255,255,255,0.02)] p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold text-[#F4F6FF]">Payment Traceability</h3>
                      <span className="text-xs text-[#A7B0C8]">
                        {selectedTraces.length} events
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExportTrace(selectedIntent)}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        Export
                      </button>
                      <button
                        onClick={() => setSelectedIntent(null)}
                        className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.06)]"
                      >
                        <X className="w-3.5 h-3.5 text-[#A7B0C8]" />
                      </button>
                    </div>
                  </div>

                  {selectedTraces.length === 0 ? (
                    <p className="text-xs text-[#A7B0C8] py-2">
                      No trace events recorded for this payment yet.
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {selectedTraces.map((t, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-2 rounded-lg hover:bg-[rgba(255,255,255,0.02)]"
                        >
                          <div className="flex flex-col items-center">
                            <div
                              className={cn(
                                "w-2 h-2 rounded-full mt-1.5",
                                t.event === "completed" || t.event === "receipt_stored"
                                  ? "bg-success"
                                  : t.event === "failed" || t.event === "cancelled"
                                  ? "bg-destructive"
                                  : "bg-primary",
                              )}
                            />
                            {i < selectedTraces.length - 1 && (
                              <div className="w-px h-full min-h-[16px] bg-[rgba(255,255,255,0.06)]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-[#F4F6FF] capitalize">
                                {t.event.replace(/_/g, " ")}
                              </span>
                              <span className="text-[10px] text-[#A7B0C8]">
                                {new Date(t.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#A7B0C8] truncate">{t.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Compliance link */}
                  <div className="flex items-center gap-2 pt-1">
                    <Shield className="w-3.5 h-3.5 text-[#A7B0C8]" />
                    <a
                      href="/compliance"
                      className="text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      View full compliance audit trail →
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* ── Send Payment Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showSendModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) =>
              e.target === e.currentTarget && !executing && setShowSendModal(false)
            }
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">
                    <Send className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">New Payment</h3>
                    <p className="text-xs text-muted-foreground">
                      Send, schedule, or set up recurring payments
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => !executing && setShowSendModal(false)}
                  className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
                {/* Recipient */}
                <div>
                  <Label htmlFor="pay-recipient" className="text-xs text-muted-foreground mb-2 block">
                    Recipient Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="pay-recipient"
                    placeholder="0x..."
                    value={sendRecipient}
                    onChange={(e) => setSendRecipient(e.target.value)}
                    className="h-9 text-sm font-mono"
                    disabled={executing}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSend();
                    }}
                  />
                </div>

                {/* Amount + Currency */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Label htmlFor="pay-amount" className="text-xs text-muted-foreground mb-2 block">
                      Amount <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="pay-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                      className="h-9 text-sm"
                      disabled={executing}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSend();
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Currency
                    </Label>
                    <div className="relative">
                      <button
                        onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}
                        className="flex items-center justify-between w-full h-9 px-3 rounded-lg border border-input bg-background text-sm hover:bg-accent/30 transition-colors"
                        disabled={executing}
                      >
                        <span>{sendCurrency}</span>
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 text-muted-foreground transition-transform",
                            showCurrencyPicker && "rotate-180",
                          )}
                        />
                      </button>
                      <AnimatePresence>
                        {showCurrencyPicker && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden"
                          >
                            {["SUI", "USDC"].map((cur) => (
                              <button
                                key={cur}
                                onClick={() => {
                                  setSendCurrency(cur as "SUI" | "USDC");
                                  setShowCurrencyPicker(false);
                                }}
                                className={cn(
                                  "flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-left",
                                  sendCurrency === cur && "bg-accent",
                                )}
                              >
                                {cur}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Memo */}
                <div>
                  <Label htmlFor="pay-memo" className="text-xs text-muted-foreground mb-2 block">
                    Memo
                  </Label>
                  <Input
                    id="pay-memo"
                    placeholder="e.g. Payment for services"
                    value={sendMemo}
                    onChange={(e) => setSendMemo(e.target.value)}
                    className="h-9 text-sm"
                    disabled={executing}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSend();
                    }}
                  />
                </div>

                {/* ── Schedule ──────────────────────────────────────────── */}
                <div className="border-t border-border pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Schedule</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Date</Label>
                      <Input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="h-9 text-sm"
                        disabled={executing}
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Time</Label>
                      <Input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="h-9 text-sm"
                        disabled={executing}
                      />
                    </div>
                  </div>
                </div>

                {/* ── Recurring ─────────────────────────────────────────── */}
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Repeat className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Recurring Payroll</span>
                    </div>
                    <button
                      onClick={() => setEnableRecurring(!enableRecurring)}
                      className={cn(
                        "relative w-9 h-5 rounded-full transition-colors",
                        enableRecurring ? "bg-primary" : "bg-muted",
                      )}
                    >
                      <div
                        className={cn(
                          "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                          enableRecurring ? "translate-x-4.5 left-0.5" : "left-0.5",
                        )}
                      />
                    </button>
                  </div>

                  <AnimatePresence>
                    {enableRecurring && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 overflow-hidden"
                      >
                        {/* Frequency */}
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Frequency</Label>
                          <div className="grid grid-cols-3 gap-1">
                            {(["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"] as const).map(
                              (freq) => (
                                <button
                                  key={freq}
                                  onClick={() => setRecurFrequency(freq)}
                                  className={cn(
                                    "px-2 py-1.5 rounded-lg text-xs transition-colors capitalize",
                                    recurFrequency === freq
                                      ? "bg-primary/20 text-primary"
                                      : "bg-[rgba(255,255,255,0.03)] text-[#A7B0C8] hover:text-[#F4F6FF]",
                                  )}
                                >
                                  {freq === "biweekly" ? "Bi-Weekly" : freq}
                                </button>
                              ),
                            )}
                          </div>
                        </div>

                        {/* Day */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">
                              Day {recurFrequency === "weekly" ? "(0=Sun)" : "of month"}
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              max="31"
                              value={recurDay}
                              onChange={(e) => setRecurDay(e.target.value)}
                              className="h-9 text-sm"
                              disabled={executing}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">
                              Max occurrences (0 = infinite)
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              max="999"
                              value={recurMax}
                              onChange={(e) => setRecurMax(e.target.value)}
                              className="h-9 text-sm"
                              disabled={executing}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Summary */}
                {sendRecipient && sendAmount && (
                  <div className="p-3 rounded-lg bg-accent/30 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sending</span>
                      <span className="font-medium">
                        {sendAmount} {sendCurrency}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">To</span>
                      <span className="font-mono">
                        {sendRecipient.slice(0, 8)}...{sendRecipient.slice(-4)}
                      </span>
                    </div>
                    {enableRecurring && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Recurring</span>
                        <span className="capitalize">
                          {recurFrequency}
                          {parseInt(recurMax) > 0 ? ` (×${recurMax})` : " (infinite)"}
                        </span>
                      </div>
                    )}
                    {scheduledDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Scheduled</span>
                        <span>
                          {new Date(
                            `${scheduledDate}T${scheduledTime || "12:00"}:00`,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Balance</span>
                      <span>
                        {sendCurrency === "SUI"
                          ? `${suiBalance.toFixed(2)} SUI`
                          : `${usdcBalance.toFixed(2)} USDC`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gas</span>
                      <span className="text-success">Sponsored</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-5 border-t border-border bg-muted/20">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSendModal(false)}
                  disabled={executing}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={handleSend}
                  disabled={!sendRecipient.trim() || !sendAmount || executing}
                >
                  {executing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Sending…
                    </>
                  ) : scheduledDate ? (
                    <>
                      <Calendar className="w-4 h-4" /> Schedule
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Send {sendCurrency}
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </LayoutShell>
  );
}
