"use client";

import { useCustomWallet } from "@/contexts/CustomWallet";
import { useAgent } from "@/hooks/useAgentQuery";
import { usePayments } from "@/hooks/usePaymentQuery";
import { usePaymentTransaction } from "@/hooks/usePaymentTransaction";
import { useBalances } from "@/hooks/useBalances";
import LayoutShell from "@/components/LayoutShell";
import { motion, AnimatePresence } from "framer-motion";
import { useSuiClient } from "@mysten/dapp-kit";
import { DBUSDC_COIN, SUI_COIN } from "@/lib/constants";
import {
  Send,
  ArrowUpRight,
  ArrowDownRight,
  Ghost,
  Search,
  Filter,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  ChevronDown,
} from "lucide-react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import clientConfig from "@/config/clientConfig";

const isPackageDeployed =
  !!(clientConfig.PACKAGE_ID && clientConfig.PACKAGE_ID !== "0x0");

export default function PaymentsPage() {
  const { isUsingEnoki, address, redirectToAuthUrl } = useCustomWallet();
  const { fields: agent, hasAgent, agentId } = useAgent();
  const { payments: chainPayments, isPending } = usePayments();
  const { sui: suiBalance, usdc: usdcBalance, refetch: refetchBalances } = useBalances();
  const suiClient = useSuiClient();
  const { transferTokens } = usePaymentTransaction();

  // ── Send Modal state ────────────────────────────────────────────────
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendRecipient, setSendRecipient] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendMemo, setSendMemo] = useState("");
  const [sendCurrency, setSendCurrency] = useState<"SUI" | "USDC">("SUI");
  const [sending, setSending] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  // ── Send handler ─────────────────────────────────────────────────────
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
    if (!agentId) {
      toast.error("No agent found. Create one on the dashboard first.");
      return;
    }

    setSending(true);
    try {
      const coinType = sendCurrency === "SUI" ? SUI_COIN : DBUSDC_COIN;

      let coinObjectId: string | undefined;
      if (sendCurrency === "USDC") {
        const coins = await suiClient.getCoins({
          owner: address!,
          coinType: DBUSDC_COIN,
        });
        if (coins.data.length === 0) {
          throw new Error("No USDC coins found in this wallet");
        }
        coinObjectId = coins.data[0].coinObjectId;
      }

      const result = await transferTokens(
        agentId,
        recipient,
        amount,
        sendCurrency,
        memo || `Payment to ${recipient.slice(0, 8)}`,
        coinType,
        coinObjectId
      );

      const status = result.effects?.status?.status;
      if (status === "failure") {
        throw new Error(result.effects?.status?.error || "Transaction failed");
      }

      toast.success(`Sent ${amount} ${sendCurrency}`);
      setShowSendModal(false);
      setSendRecipient("");
      setSendAmount("");
      setSendMemo("");
      setSendCurrency("SUI");
      refetchBalances();
    } catch (err: any) {
      const msg = err?.message || "Failed to send payment";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }, [sendRecipient, sendAmount, sendMemo, sendCurrency, agentId, transferTokens, address, suiClient, refetchBalances]);

  const displayPayments = chainPayments.map((p) => ({
    id: p.id,
    type: (p.recipient === address ? "received" : "sent") as "received" | "sent",
    from: p.recipient === address ? p.recipient.slice(0, 10) + "..." : "",
    to: p.recipient !== address ? p.recipient.slice(0, 10) + "..." : "",
    amount: p.recipient === address ? `+${p.amount}` : `-${p.amount}`,
    currency: p.currency,
    status: p.status as "completed" | "pending" | "failed",
    date: new Date(p.timestamp).toISOString().split("T")[0],
    time: p.dateStr,
  }));

  const filteredPayments = displayPayments.filter((p: any) =>
    (p.from || p.to || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.amount.includes(searchQuery)
  );

  const totalSent = chainPayments
    .filter((p) => p.recipient !== address)
    .reduce((s, p) => s + p.amount, 0);
  const totalReceived = chainPayments
    .filter((p) => p.recipient === address)
    .reduce((s, p) => s + p.amount, 0);
  const pendingCount = chainPayments.filter((p) => p.status === "pending").length;

  return (
    <LayoutShell>
      <div className="p-4 lg:p-8 pb-24 lg:pb-8 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                <Send className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-heading text-3xl lg:text-4xl font-semibold tracking-tight text-[#F4F6FF]">Payments</h1>
                <p className="text-base text-[#A7B0C8] mt-1">Send and receive funds globally</p>
              </div>
            </div>
            {isUsingEnoki && (
              <Button className="gap-2 hidden sm:flex" onClick={() => setShowSendModal(true)}>
                <Send className="w-4 h-4" />
                New Payment
              </Button>
            )}
          </div>
        </motion.div>

        {!isUsingEnoki ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-24 gap-6"
          >
            <img src="/images/ghost-mascot.png" alt="GhostPay Mascot" className="w-24 h-24 object-contain animate-float" />
            <div className="text-center max-w-md">
              <h2 className="text-xl font-semibold mb-2">Payments Require a Wallet</h2>
              <p className="text-muted-foreground mb-4">
                Sign in to send payments, view history, and manage your transactions.
              </p>
              <Button onClick={redirectToAuthUrl} size="lg" className="gap-2">
                Sign in with Google
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Sent", value: totalSent.toFixed(2), unit: "USDC", icon: ArrowUpRight, color: "text-destructive" },
                { label: "Total Received", value: totalReceived.toFixed(2), unit: "USDC", icon: ArrowDownRight, color: "text-success" },
                { label: "Pending", value: String(pendingCount), unit: "transaction", icon: Loader2, color: "text-warning" },
                { label: "This Month", value: String(chainPayments.length), unit: "transactions", icon: Clock, color: "text-primary" },
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

            {/* Search & Filter */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A7B0C8]" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => toast.info(searchQuery ? "Filtered by search query" : "No filters applied")}>
                <Filter className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => toast.info("Export coming soon — feature in active development")}>
                <Download className="w-4 h-4" />
              </Button>
            </div>

            {/* Payments Table */}
            <div className="rounded-xl bg-[rgba(255,255,255,0.02)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.05)]">
                      <th className="text-left text-xs font-medium text-[#A7B0C8] uppercase tracking-wider px-4 py-3">Type</th>
                      <th className="text-left text-xs font-medium text-[#A7B0C8] uppercase tracking-wider px-4 py-3">From / To</th>
                      <th className="text-right text-xs font-medium text-[#A7B0C8] uppercase tracking-wider px-4 py-3">Amount</th>
                      <th className="text-center text-xs font-medium text-[#A7B0C8] uppercase tracking-wider px-4 py-3">Status</th>
                      <th className="text-right text-xs font-medium text-[#A7B0C8] uppercase tracking-wider px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-sm text-[#A7B0C8]">
                          {isPending ? "Loading..." : "No payments yet."}
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((payment: any, i: number) => (
                        <motion.tr
                          key={payment.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="hover:bg-[rgba(255,255,255,0.02)] transition-colors text-[#F4F6FF]"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "flex items-center justify-center w-7 h-7 rounded-full",
                                payment.type === "received" ? "bg-success/10" :
                                payment.type === "sent" ? "bg-destructive/10" : "bg-primary/10"
                              )}>
                                {payment.type === "received" ?
                                  <ArrowDownRight className="w-3.5 h-3.5 text-success" /> :
                                  <ArrowUpRight className="w-3.5 h-3.5 text-destructive" />
                                }
                              </div>
                              <span className="text-sm capitalize">{payment.type}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-mono text-[#F4F6FF]">{payment.from || payment.to}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={cn(
                              "text-sm font-medium",
                              payment.amount.startsWith("+") ? "text-success" :
                              payment.amount.startsWith("-") ? "text-destructive" : ""
                            )}>
                              {payment.amount} {payment.currency}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn(
                              "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium",
                              payment.status === "completed" ? "bg-success/10 text-success" :
                              payment.status === "pending" ? "bg-warning/10 text-warning" :
                              "bg-destructive/10 text-destructive"
                            )}>
                              {payment.status === "completed" ? <CheckCircle2 className="w-3 h-3" /> :
                               payment.status === "pending" ? <Loader2 className="w-3 h-3 animate-spin" /> :
                               <XCircle className="w-3 h-3" />}
                              {payment.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div>
                              <p className="text-sm text-[#F4F6FF]">{payment.time}</p>
                              <p className="text-xs text-[#A7B0C8]">{payment.date}</p>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </div>
      {/* ── Send Payment Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showSendModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && !sending && setShowSendModal(false)}
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
                      Send USDC or SUI from your agent wallet
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => !sending && setShowSendModal(false)}
                  className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-5">
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
                    disabled={sending}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
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
                      disabled={sending}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Currency</Label>
                    <div className="relative">
                      <button
                        onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}
                        className="flex items-center justify-between w-full h-9 px-3 rounded-lg border border-input bg-background text-sm hover:bg-accent/30 transition-colors"
                        disabled={sending}
                      >
                        <span>{sendCurrency}</span>
                        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", showCurrencyPicker && "rotate-180")} />
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
                                onClick={() => { setSendCurrency(cur as "SUI" | "USDC"); setShowCurrencyPicker(false); }}
                                className={cn("flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-left", sendCurrency === cur && "bg-accent")}
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
                  <Label htmlFor="pay-memo" className="text-xs text-muted-foreground mb-2 block">Memo</Label>
                  <Input
                    id="pay-memo"
                    placeholder="e.g. Payment for services"
                    value={sendMemo}
                    onChange={(e) => setSendMemo(e.target.value)}
                    className="h-9 text-sm"
                    disabled={sending}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
                  />
                </div>

                {/* Summary */}
                {sendRecipient && sendAmount && (
                  <div className="p-3 rounded-lg bg-accent/30 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sending</span>
                      <span className="font-medium">{sendAmount} {sendCurrency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">To</span>
                      <span className="font-mono">{sendRecipient.slice(0, 8)}...{sendRecipient.slice(-4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gas</span>
                      <span className="text-success">Sponsored</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Balance</span>
                      <span>{sendCurrency === "SUI" ? `${suiBalance.toFixed(2)} SUI` : `${usdcBalance.toFixed(2)} USDC`}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-5 border-t border-border bg-muted/20">
                <Button variant="outline" size="sm" onClick={() => setShowSendModal(false)} disabled={sending}>Cancel</Button>
                <Button size="sm" className="gap-2" onClick={handleSend} disabled={!sendRecipient.trim() || !sendAmount || sending}>
                  {sending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                  ) : (
                    <><Send className="w-4 h-4" /> Send {sendCurrency}</>
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
