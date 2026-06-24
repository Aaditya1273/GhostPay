"use client";

import { useState, useEffect, useCallback } from "react";
import { useCustomWallet } from "@/contexts/CustomWallet";
import LayoutShell from "@/components/LayoutShell";
import { useDeepBook } from "@/hooks/useDeepBook";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftRight,
  ArrowDownUp,
  Ghost,
  Coins,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Settings2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  POOL_LIST,
  parseUserAmount,
  getSwapQuote,
  formatAmount,
} from "@/lib/DeepBookService";
import { useSuiClient } from "@mysten/dapp-kit";

export default function SwapPage() {
  const { isConnected, redirectToAuthUrl, address } = useCustomWallet();
  const suiClient = useSuiClient();
  const { loading, error, executeSwap } = useDeepBook();

  // ── State ──────────────────────────────────────────────────────────────
  const [selectedPool, setSelectedPool] = useState(POOL_LIST[0]);
  const [inputAmount, setInputAmount] = useState("");
  const [slippage, setSlippage] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);
  const [txDigest, setTxDigest] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [estimatedOutput, setEstimatedOutput] = useState<bigint | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // ── Derived ────────────────────────────────────────────────────────────
  const fromLabel = selectedPool.sellAsset;
  const toLabel = selectedPool.buyAsset;

  // ── Live price quoting via devInspectTransactionBlock ─────────────────
  useEffect(() => {
    let cancelled = false;
    const fetchQuote = async () => {
      setEstimatedOutput(null);
      if (!inputAmount || parseFloat(inputAmount) <= 0 || !address) return;
      setQuoteLoading(true);
      try {
        const sellAmount = parseUserAmount(inputAmount, selectedPool.decimals);
        if (sellAmount <= 0n) return;
        const quote = await getSwapQuote(
          suiClient,
          address,
          selectedPool,
          sellAmount,
          true, // sellBase=true for all our pools
        );
        if (!cancelled) setEstimatedOutput(quote);
      } catch {
        if (!cancelled) setEstimatedOutput(null);
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    };
    // Debounce: wait 400ms after typing stops before fetching quote
    const timer = setTimeout(fetchQuote, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [inputAmount, selectedPool, address, suiClient]);

  // ── Swap handler ───────────────────────────────────────────────────────
  const handleSwap = useCallback(async () => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) return;

    setTxDigest(null);
    setTxStatus("pending");

    try {
      const sellAmount = parseUserAmount(inputAmount, selectedPool.decimals);
      if (sellAmount <= 0n) throw new Error("Invalid amount");

      // Use the real quote from devInspect, apply slippage to get minOut
      let minOut = 0n;
      if (estimatedOutput && estimatedOutput > 0n) {
        // Apply slippage: minOut = estimatedOutput * (100 - slippage) / 100
        const slippageBps = BigInt(Math.round(slippage * 100)); // e.g. 0.5% → 50 bps
        minOut = estimatedOutput * (10000n - slippageBps) / 10000n;
      }

      // Our pools: base → quote means selling BASE to buy QUOTE
      // For SUI_DBUSDC: sell SUI (base) → buy DBUSDC (quote) => sellBase = true
      // For DEEP_SUI: sell DEEP (base) → buy SUI (quote) => sellBase = true
      // For DEEP_DBUSDC: sell DEEP (base) → buy DBUSDC (quote) => sellBase = true
      const digest = await executeSwap(
        selectedPool,
        sellAmount,
        minOut,
        true, // All our pools sell BASE → buy QUOTE
      );

      setTxDigest(digest);
      setTxStatus("success");
      setInputAmount("");
      setEstimatedOutput(null);
    } catch (err: any) {
      const msg = err?.message || "Swap failed";
      setTxStatus("error");
    }
  }, [inputAmount, selectedPool, estimatedOutput, slippage, executeSwap]);

  const resetSwap = () => {
    setInputAmount("");
    setTxDigest(null);
    setTxStatus("idle");
  };

  return (
    <LayoutShell>
      <div className="p-4 lg:p-8 pb-24 lg:pb-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
              <ArrowLeftRight className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">Swap</h1>
              <p className="text-sm text-muted-foreground">
                Swap tokens via DeepBook V3 — powered by Sui CLOB
              </p>
            </div>
          </div>
        </motion.div>

        {!isConnected ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-24 gap-6"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
              <Ghost className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center max-w-md">
              <h2 className="text-xl font-semibold mb-2">Swap Requires a Wallet</h2>
              <p className="text-muted-foreground mb-4">
                Sign in to swap tokens on DeepBook V3. Sponsored gas for GhostPay users.
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
            className="max-w-lg mx-auto"
          >
            {/* ── Pool Selector ──────────────────────────────────────── */}
            <div className="mb-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {POOL_LIST.map((pool) => (
                  <button
                    key={pool.key}
                    onClick={() => {
                      setSelectedPool(pool);
                      setInputAmount("");
                      setTxStatus("idle");
                    }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap border",
                      selectedPool.key === pool.key
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-card border-border text-muted-foreground hover:border-primary/20 hover:text-foreground"
                    )}
                  >
                    <Coins className="w-4 h-4" />
                    {pool.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Swap Card ──────────────────────────────────────────── */}
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Swap</span>
                </div>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                >
                  <Settings2 className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Settings */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-b border-border"
                  >
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground">Slippage Tolerance</label>
                        <div className="flex items-center gap-1">
                          {[0.1, 0.5, 1.0].map((val) => (
                            <button
                              key={val}
                              onClick={() => setSlippage(val)}
                              className={cn(
                                "px-2 py-1 text-xs rounded-lg transition-colors",
                                slippage === val
                                  ? "bg-primary/10 text-primary"
                                  : "bg-accent text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {val}%
                            </button>
                          ))}
                          <Input
                            type="number"
                            value={slippage}
                            onChange={(e) => setSlippage(parseFloat(e.target.value) || 0.5)}
                            className="w-16 h-7 text-xs text-center"
                            min={0}
                            max={50}
                            step={0.1}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Swap form */}
              <div className="p-4 space-y-2">
                {/* From (you pay) */}
                <div className="rounded-xl bg-accent/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-muted-foreground">You pay</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={inputAmount}
                      onChange={(e) => setInputAmount(e.target.value)}
                      className="text-2xl font-semibold border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                      min={0}
                    />
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-sm font-medium whitespace-nowrap">
                      <Coins className="w-4 h-4 text-primary" />
                      {fromLabel}
                    </div>
                  </div>
                </div>

                {/* Direction indicator */}
                <div className="flex justify-center -my-3 relative z-10">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-card bg-accent">
                    <ArrowDownUp className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                {/* To (you receive) */}
                <div className="rounded-xl bg-accent/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-muted-foreground">You receive</label>
                    {inputAmount && (quoteLoading || estimatedOutput !== null) && (
                      <span className="text-xs">
                        {quoteLoading ? (
                          <span className="text-muted-foreground">Fetching quote…</span>
                        ) : estimatedOutput && estimatedOutput > 0n ? (
                          <span className="text-success">
                            ~${formatAmount(estimatedOutput, selectedPool.decimals)} {toLabel}
                          </span>
                        ) : (
                          <span className="text-warning">Quote unavailable</span>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex-1 text-2xl font-semibold">
                      {!inputAmount ? (
                        <span className="text-muted-foreground/40">0.0</span>
                      ) : quoteLoading ? (
                        <span className="text-muted-foreground/40">~</span>
                      ) : estimatedOutput && estimatedOutput > 0n ? (
                        <span className="text-foreground">
                          {formatAmount(estimatedOutput, selectedPool.decimals)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">
                          {address ? "Simulating…" : "Connect wallet"}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-sm font-medium whitespace-nowrap">
                      <Coins className="w-4 h-4 text-purple-500" />
                      {toLabel}
                    </div>
                  </div>
                </div>

                {/* Pool info */}
                <div className="flex items-center justify-between px-1 py-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    <span>Via DeepBook V3 — {selectedPool.label}</span>
                  </div>
                  <span>Gas: sponsored</span>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 pt-0 space-y-3">
                <Button
                  className="w-full h-12 text-base font-semibold gap-2"
                  onClick={handleSwap}
                  disabled={
                    loading ||
                    !inputAmount ||
                    parseFloat(inputAmount) <= 0 ||
                    txStatus === "pending"
                  }
                >
                  {txStatus === "pending" || loading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Swapping…</>
                  ) : !inputAmount || parseFloat(inputAmount) <= 0 ? (
                    "Enter an amount"
                  ) : (
                    <><ArrowLeftRight className="w-5 h-5" /> Swap {fromLabel} for {toLabel}</>
                  )}
                </Button>

                {txStatus === "success" && txDigest && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 rounded-xl bg-success/10 border border-success/20 text-sm text-success"
                  >
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium">Swap submitted!</p>
                      <a
                        href={`https://suiscan.xyz/testnet/tx/${txDigest}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs underline opacity-70 hover:opacity-100"
                      >
                        View on SuiScan →
                      </a>
                    </div>
                    <Button variant="ghost" size="sm" onClick={resetSwap}>
                      New swap
                    </Button>
                  </motion.div>
                )}

                {txStatus === "error" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive"
                  >
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1">{error || "Transaction failed"}</span>
                    <Button variant="ghost" size="sm" onClick={resetSwap}>
                      Dismiss
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Pool Info */}
            <div className="mt-4 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Pool Info</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-accent/30">
                  <span className="text-muted-foreground">Pool</span>
                  <span className="font-medium">{selectedPool.label}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-accent/30">
                  <span className="text-muted-foreground">Route</span>
                  <span className="font-medium">sell {fromLabel} → buy {toLabel}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-accent/30">
                  <span className="text-muted-foreground">Wallet</span>
                  <span className="font-medium font-mono">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-accent/30">
                  <span className="text-muted-foreground">Protocol</span>
                  <span className="font-medium">DeepBook V3</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </LayoutShell>
  );
}
