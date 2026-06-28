"use client";

import { useCustomWallet } from "@/contexts/CustomWallet";
import { useAgent } from "@/hooks/useAgentQuery";
import { usePayments } from "@/hooks/usePaymentQuery";
import { usePaymentTransaction } from "@/hooks/usePaymentTransaction";
import { useBalances } from "@/hooks/useBalances";
import LayoutShell from "@/components/LayoutShell";
import { motion, AnimatePresence } from "framer-motion";
import { useSuiClient } from "@mysten/dapp-kit";
import { QRCodeSVG } from "qrcode.react";
import { SUI_COIN, DBUSDC_COIN } from "@/lib/constants";
import {
  Wallet,
  Copy,
  ExternalLink,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Ghost,
  Key,
  Shield,
  QrCode,
  X,
  Loader2,
  Send,
  ChevronDown,
} from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import clientConfig from "@/config/clientConfig";
import { useLoadingDeadlock } from "@/lib/demoProof";

const isPackageDeployed =
  !!(clientConfig.PACKAGE_ID && clientConfig.PACKAGE_ID !== "0x0");

export default function WalletPage() {
  const { isUsingEnoki, address, emailAddress, redirectToAuthUrl, authLoading } = useCustomWallet();
  const { fields: agent, hasAgent, agentId, isPending: agentPending } = useAgent();
  const { payments } = usePayments();
  const { sui: suiBalance, usdc: usdcBalance, isLoading: balanceLoading, refetch: refetchBalances } = useBalances();
  const suiClient = useSuiClient();
  const [copied, setCopied] = useState(false);

  // ── Send Modal state ────────────────────────────────────────────────
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendRecipient, setSendRecipient] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendMemo, setSendMemo] = useState("");
  const [sendCurrency, setSendCurrency] = useState<"SUI" | "USDC">("SUI");
  const [sending, setSending] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  // ── Receive Modal state ─────────────────────────────────────────────
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  // ── Loading deadlock protection ──────────────────────────────────────
  const { timedOut: balanceTimedOut } = useLoadingDeadlock(balanceLoading);

  // ── Escape key handler ────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showSendModal && !sending) { setShowSendModal(false); return; }
      if (showReceiveModal) { setShowReceiveModal(false); return; }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showSendModal, showReceiveModal, sending]);

  const { transferTokens } = usePaymentTransaction();

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
      const coinType =
        sendCurrency === "SUI" ? SUI_COIN : DBUSDC_COIN;

      // Always query for the explicit coin owned by this address.
      // We cannot use txb.gas for SUI transfers when the transaction is sponsored
      // because the gas coin belongs to the Enoki sponsor, not the user.
      const coins = await suiClient.getCoins({
        owner: address!,
        coinType: coinType,
      });
      if (coins.data.length === 0) {
        throw new Error(`No ${sendCurrency} coins found in this wallet`);
      }
      // For simplicity, we just take the first coin.
      // In a robust implementation, we would merge coins if the amount exceeds the first coin's balance.
      const coinObjectId = coins.data[0].coinObjectId;
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

  const txnCount = payments.length;

  return (
    <LayoutShell>
      <div className="p-4 lg:p-8 pb-24 lg:pb-8 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-3xl lg:text-4xl font-semibold tracking-tight text-[#F4F6FF]">Agent Wallet</h1>
              <p className="text-base text-[#A7B0C8] mt-1">
                Your invisible wallet — powered by Sui zkLogin
              </p>
            </div>
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
              <h2 className="text-xl font-semibold mb-2">No Wallet Connected</h2>
              <p className="text-muted-foreground mb-4">
                Sign in with Google to create your invisible agent wallet instantly.
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
            {/* Balance Card */}
            <div className="relative overflow-hidden rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] p-6 lg:p-8">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#B347FF]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[rgba(179,71,255,0.1)]">
                      <Ghost className="w-5 h-5 text-[#B347FF]" />
                    </div>
                    <div>
                      <p className="font-heading text-sm font-medium text-[#F4F6FF]">
                        {isPackageDeployed && hasAgent
                          ? agent?.display_name || "GhostPay Agent"
                          : "GhostPay Agent"}
                      </p>
                      <p className="text-xs text-[#A7B0C8]">Invisible Wallet</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] text-[#F4F6FF] hover:bg-[rgba(255,255,255,0.05)]"
                    onClick={() => refetchBalances()}
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#B347FF]" />
                    Refresh
                  </Button>
                </div>

                <div className="mb-6 space-y-2">
                  <p className="text-xs text-[#A7B0C8] mb-1">Available Balance</p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-heading text-4xl lg:text-5xl font-bold tracking-tight text-[#F4F6FF]">
                      {balanceTimedOut ? "—" : balanceLoading ? "—" : suiBalance.toFixed(2)}
                    </span>
                    <span className="text-lg text-[#A7B0C8] font-medium">SUI</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-heading text-2xl font-bold tracking-tight text-[#A7B0C8]">
                      {balanceTimedOut ? "—" : balanceLoading ? "—" : usdcBalance.toFixed(2)}
                    </span>
                    <span className="text-sm text-[#A7B0C8] font-medium">USDC</span>
                  </div>
                  {balanceTimedOut && (
                    <p className="text-xs text-warning mt-1">Balance query taking longer than expected. <button className="underline" onClick={() => refetchBalances()}>Retry</button></p>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    className="gap-2 bg-[#B347FF] text-[#0B0C10] hover:scale-105 transition-all duration-300 rounded-full font-semibold"
                    onClick={() => setShowSendModal(true)}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Send
                  </Button>
                  <Button
                    variant="secondary"
                    className="gap-2 bg-[rgba(255,255,255,0.05)] text-[#F4F6FF] hover:bg-[rgba(255,255,255,0.08)] rounded-full border border-[rgba(255,255,255,0.1)]"
                    onClick={() => setShowReceiveModal(true)}
                  >
                    <ArrowDownRight className="w-4 h-4" />
                    Receive
                  </Button>
                </div>
              </div>
            </div>

            {/* Wallet Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Identity Card */}
              <div className="lg:col-span-2 rounded-xl bg-[rgba(255,255,255,0.02)] p-6">
                <h3 className="font-heading text-lg font-medium mb-4 text-[#F4F6FF]">
                  {isPackageDeployed && hasAgent ? "Agent Identity" : "Wallet Identity"}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[rgba(255,255,255,0.03)]">
                    <div className="flex items-center gap-3">
                      <Key className="w-4 h-4 text-[#A7B0C8]" />
                      <span className="text-sm text-[#A7B0C8]">Address</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-[#F4F6FF]">
                        {address?.slice(0, 8)}...{address?.slice(-6)}
                      </span>
                      <button onClick={copyAddress} className="p-1 hover:bg-[rgba(255,255,255,0.05)] rounded transition-colors">
                        <Copy className="w-3.5 h-3.5 text-[#A7B0C8]" />
                      </button>
                      <a
                        href={`https://suiscan.xyz/testnet/account/${address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-[rgba(255,255,255,0.05)] rounded transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[#A7B0C8]" />
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[rgba(255,255,255,0.03)]">
                    <div className="flex items-center gap-3">
                      <Shield className="w-4 h-4 text-[#A7B0C8]" />
                      <span className="text-sm text-[#A7B0C8]">Auth Method</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-success" />
                      <span className="text-sm text-[#F4F6FF]">zkLogin (Google)</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[rgba(255,255,255,0.03)]">
                    <div className="flex items-center gap-3">
                      <QrCode className="w-4 h-4 text-[#A7B0C8]" />
                      <span className="text-sm text-[#A7B0C8]">Email</span>
                    </div>
                    <span className="text-sm text-[#F4F6FF]">{emailAddress || "—"}</span>
                  </div>
                  {isPackageDeployed && hasAgent && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-[rgba(255,255,255,0.03)]">
                      <div className="flex items-center gap-3">
                        <Ghost className="w-4 h-4 text-[#B347FF]" />
                        <span className="text-sm text-[#A7B0C8]">Agent Name</span>
                      </div>
                      <span className="font-heading text-sm font-medium text-[#F4F6FF]">{agent?.display_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="rounded-xl bg-[rgba(255,255,255,0.02)] p-6">
                <h3 className="font-heading text-lg font-medium mb-4 text-[#F4F6FF]">Wallet Stats</h3>
                <div className="space-y-3">
                  {[
                    { label: "Network", value: "Sui Testnet" },
                    { label: "Gas", value: "Sponsored" },
                    { label: "Transactions", value: isPackageDeployed ? `${txnCount} total` : "0 total" },
                    { label: "Agent ID", value: isPackageDeployed && hasAgent ? agent?.id?.id?.slice(0, 8) || "—" : address?.slice(0, 8) || "—" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-sm py-1.5">
                      <span className="text-[#A7B0C8]">{item.label}</span>
                      <span className="font-medium text-[#F4F6FF]">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
      {/* ── Send Modal ──────────────────────────────────────────────────── */}
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
                    <h3 className="text-base font-semibold">Send Payment</h3>
                    <p className="text-xs text-muted-foreground">
                      Transfer USDC from your agent wallet
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
                  <Label htmlFor="send-recipient" className="text-xs text-muted-foreground mb-2 block">
                    Recipient Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="send-recipient"
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
                    <Label htmlFor="send-amount" className="text-xs text-muted-foreground mb-2 block">
                      Amount <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="send-amount"
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
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Currency
                    </Label>
                    <div className="relative">
                      <button
                        onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}
                        className="flex items-center justify-between w-full h-9 px-3 rounded-lg border border-input bg-background text-sm hover:bg-accent/30 transition-colors"
                        disabled={sending}
                      >
                        <span>{sendCurrency}</span>
                        <ChevronDown className={cn(
                          "w-4 h-4 text-muted-foreground transition-transform",
                          showCurrencyPicker && "rotate-180"
                        )} />
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
                                className={cn(
                                  "flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-left",
                                  sendCurrency === cur && "bg-accent"
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
                  <Label htmlFor="send-memo" className="text-xs text-muted-foreground mb-2 block">
                    Memo
                  </Label>
                  <Input
                    id="send-memo"
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSendModal(false)}
                  disabled={sending}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={handleSend}
                  disabled={!sendRecipient.trim() || !sendAmount || sending}
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Payment
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Receive Modal ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {showReceiveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setShowReceiveModal(false)}
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
                    <ArrowDownRight className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">Receive Funds</h3>
                    <p className="text-xs text-muted-foreground">
                      Share your address to receive USDC
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReceiveModal(false)}
                  className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                {/* QR Code */}
                <div className="flex items-center justify-center">
                  <div className="flex items-center justify-center w-48 h-48 rounded-2xl bg-white p-3 border border-[rgba(255,255,255,0.08)]">
                    {address ? (
                      <QRCodeSVG
                        value={address}
                        size={160}
                        bgColor="#ffffff"
                        fgColor="#000000"
                        level="M"
                      />
                    ) : (
                      <QrCode className="w-16 h-16 text-[#A7B0C8]" />
                    )}
                  </div>
                </div>

                {/* Address */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Your Address
                  </Label>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)]">
                    <code className="flex-1 text-xs font-mono text-[#F4F6FF] break-all">
                      {address}
                    </code>
                    <button
                      onClick={copyAddress}
                      className="shrink-0 p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                    >
                      <Copy className="w-4 h-4 text-[#A7B0C8]" />
                    </button>
                  </div>
                </div>

                {/* Network info */}
                <div className="p-3 rounded-lg bg-[rgba(179,71,255,0.05)] border border-[rgba(179,71,255,0.1)]">
                  <div className="flex items-start gap-3">
                    <Shield className="w-4 h-4 text-[#B347FF] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#F4F6FF] mb-1">Send only USDC on Sui Testnet</p>
                      <p className="text-xs text-[#A7B0C8]">
                        Make sure the sender uses Sui Testnet. 
                        Funds sent from other networks may be lost.
                      </p>
                    </div>
                  </div>
                </div>

                {/* View on Suiscan */}
                <a
                  href={`https://suiscan.xyz/testnet/account/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] transition-colors text-sm text-[#A7B0C8] hover:text-[#F4F6FF]"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on Suiscan
                </a>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end p-5 border-t border-border bg-muted/20">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReceiveModal(false)}
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </LayoutShell>
  );
}
