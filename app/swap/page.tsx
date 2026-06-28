"use client";

import { useState, useEffect, useCallback } from "react";
import { useCustomWallet } from "@/contexts/CustomWallet";
import LayoutShell from "@/components/LayoutShell";
import { useDeepBook } from "@/hooks/useDeepBook";
import { useFluxStream } from "@/hooks/useFluxStream";
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
  FileText,
  Zap,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  POOL_LIST,
  parseUserAmount,
  getSwapQuote,
  formatAmount,
  getSwapLabels,
} from "@/lib/DeepBookService";
import { useSuiClient } from "@mysten/dapp-kit";
import { useBalances } from "@/hooks/useBalances";
import { useLoadingDeadlock } from "@/lib/demoProof";

export default function SwapPage() {
  const { isUsingEnoki, redirectToAuthUrl, address, authLoading } = useCustomWallet();
  const suiClient = useSuiClient();
  const { loading, error, lastReceipt, executeSwap, checkPoolViability } = useDeepBook();
  const { sui, usdc, deep, refetch: refetchBalances } = useBalances();
  // Real-time DeepBook Flux Stream
  const fluxState = useFluxStream(isUsingEnoki);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ── State ──────────────────────────────────────────────────────────────
  const [selectedPool, setSelectedPool] = useState(POOL_LIST[0]);
  const [sellBase, setSellBase] = useState(true);
  const [inputAmount, setInputAmount] = useState("");
  const [slippage, setSlippage] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);
  const [txDigest, setTxDigest] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [txError, setTxError] = useState<string | null>(null);
  const [estimatedOutput, setEstimatedOutput] = useState<bigint | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [poolMsg, setPoolMsg] = useState<string | null>(null);
  const [poolViable, setPoolViable] = useState(true);
  const [isSponsorable, setIsSponsorable] = useState(false);

  // ── Loading deadlock protection ──────────────────────────────────────
  // Covers both the swap transaction and pool-check loading state
  const isPending = loading || txStatus === "pending";

  // ── Derived ────────────────────────────────────────────────────────────
  const labels = getSwapLabels(selectedPool, sellBase);
  const fromLabel = labels.sellAsset;
  const toLabel = labels.buyAsset;

  // Live price from Flux stream for the selected pool
  const livePoolState = fluxState.pools[selectedPool.key];
  const livePrice = livePoolState?.lastPrice ?? null;
  const recentTrades = livePoolState?.recentTrades ?? [];

  // ── Pool validation on selection / direction change ────────────────────
  useEffect(() => {
    let cancelled = false;
    const validate = async () => {
      if (!address) {
        setPoolMsg("Connect wallet to swap");
        setPoolViable(false);
        setIsSponsorable(false);
        return;
      }
      setPoolMsg("Checking pool…");
      setPoolViable(false);
      try {
        const result = await checkPoolViability(selectedPool, sellBase);
        if (!cancelled) {
          setPoolMsg(result.viable ? null : result.message);
          setPoolViable(result.viable);
          setIsSponsorable(result.sponsorable);
        }
      } catch {
        if (!cancelled) {
          setPoolMsg("Could not validate pool");
          setPoolViable(false);
        }
      }
    };
    // Reset state on pool/direction change
    setInputAmount("");
    setTxStatus("idle");
    setTxDigest(null);
    setEstimatedOutput(null);
    validate();
    return () => { cancelled = true; };
  }, [selectedPool, sellBase, address, checkPoolViability]);

  // ── Live price quoting via devInspectTransactionBlock ─────────────────
  useEffect(() => {
    let cancelled = false;
    const fetchQuote = async () => {
      setEstimatedOutput(null);
      if (!inputAmount || parseFloat(inputAmount) <= 0 || !address || !poolViable) return;
      setQuoteLoading(true);
      try {
        const sellAmount = parseUserAmount(inputAmount, selectedPool.decimals);
        if (sellAmount <= 0n) return;
        const quote = await getSwapQuote(
          suiClient,
          address,
          selectedPool,
          sellAmount,
          sellBase,
        );
        if (!cancelled) setEstimatedOutput(quote);
      } catch {
        if (!cancelled) setEstimatedOutput(null);
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    };
    const timer = setTimeout(fetchQuote, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [inputAmount, selectedPool, sellBase, address, suiClient, poolViable]);

  // ── Balance display helper ────────────────────────────────────────────
  const balanceLabel = (asset: string): string => {
    switch (asset) {
      case "SUI": return `${sui.toFixed(4)} SUI`;
      case "USDC": return `${usdc.toFixed(4)} USDC`;
      case "DEEP": return `${deep.toFixed(4)} DEEP`;
      default: return "";
    }
  };

  // ── Swap handler ───────────────────────────────────────────────────────
  const handleSwap = useCallback(async () => {
    if (!inputAmount || parseFloat(inputAmount) <= 0 || !poolViable) return;

    setTxDigest(null);
    setTxStatus("pending");

    try {
      const sellAmount = parseUserAmount(inputAmount, selectedPool.decimals);
      if (sellAmount <= 0n) throw new Error("Invalid amount");

      // Apply slippage to get minOut
      let minOut = 0n;
      if (estimatedOutput && estimatedOutput > 0n) {
        const slippageBps = BigInt(Math.round(slippage * 100));
        minOut = estimatedOutput * (10000n - slippageBps) / 10000n;
      }

      const digest = await executeSwap(
        selectedPool,
        sellAmount,
        minOut,
        sellBase,
      );

      setTxDigest(digest);
      setTxStatus("success");
      setInputAmount("");
      setEstimatedOutput(null);
      // Force refresh all balances
      refetchBalances();
    } catch (err: any) {
      const msg = err?.message || "Swap failed";
      setTxError(msg);
      setTxStatus("error");
    }
  }, [inputAmount, selectedPool, sellBase, estimatedOutput, slippage, executeSwap, poolViable]);

  const resetSwap = () => {
    setInputAmount("");
    setTxDigest(null);
    setTxError(null);
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
          <div className="flex items-center gap-4 mb-2">
            <img src="/deepbook.png" alt="DeepBook" className="w-12 h-12 object-contain rounded-xl" />
            <div>
              <h1 className="font-heading text-3xl lg:text-4xl font-semibold tracking-tight text-[#F4F6FF]">Swap</h1>
              <p className="text-base text-[#A7B0C8] mt-1">
                Swap tokens via DeepBook V3 — powered by Sui CLOB
              </p>
            </div>
          </div>
        </motion.div>

        {!mounted ? null : !isUsingEnoki ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-24 gap-6"
          >
            <img src="/images/ghost-mascot.png" alt="GhostPay Mascot" className="w-24 h-24 object-contain animate-float" />
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
                      setSellBase(pool.key === "DEEP_SUI" ? false : true);
                      setTxStatus("idle");
                    }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap border",
                      selectedPool.key === pool.key
                        ? "bg-[rgba(179,71,255,0.1)] border-[#B347FF]/30 text-[#B347FF]"
                        : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.05)] text-[#A7B0C8] hover:border-[#B347FF]/20 hover:text-[#F4F6FF]"
                    )}
                  >
                    <Coins className="w-4 h-4" />
                    {pool.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Pool Validation Warning ──────────────────────────── */}
            {poolMsg && !poolViable && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mb-4 p-3 rounded-xl bg-warning/10 border border-warning/20 text-xs text-warning"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{poolMsg}</span>
                </div>
              </motion.div>
            )}

            {/* ── Flux Stream: Live Price Ticker ───────────────────── */}
            <AnimatePresence>
              {!fluxState.subscriptionUnsupported && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        fluxState.connected ? "bg-success animate-pulse" : "bg-muted"
                      )} />
                      <span className="text-xs text-muted-foreground">
                        {fluxState.connected
                          ? `Flux Stream · ${fluxState.eventCount} events`
                          : "Connecting to DeepBook Flux Stream…"}
                      </span>
                    </div>
                    {livePrice !== null && (
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-warning" />
                        <span className="text-sm font-medium font-mono text-[#F4F6FF]">
                          {livePrice < 1
                            ? livePrice.toFixed(6)
                            : livePrice.toFixed(4)}{" "}
                          {toLabel}/{fromLabel}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Recent trades mini-tape */}
                  {recentTrades.length > 0 && (
                    <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
                      {recentTrades.slice(0, 8).map((trade, i) => (
                        <div
                          key={`${trade.txDigest}-${i}`}
                          className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap border flex-shrink-0",
                            trade.side === "buy"
                              ? "border-success/20 bg-success/5 text-success"
                              : "border-destructive/20 bg-destructive/5 text-destructive"
                          )}
                        >
                          {trade.side === "buy"
                            ? <TrendingUp className="w-2.5 h-2.5" />
                            : <TrendingDown className="w-2.5 h-2.5" />}
                          {trade.price < 1
                            ? trade.price.toFixed(5)
                            : trade.price.toFixed(3)}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Swap Card ──────────────────────────────────────────── */}
            <div className="rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] shadow-sm overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.05)]">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-[#B347FF]" />
                  <span className="font-heading text-lg font-medium text-[#F4F6FF]">Swap</span>
                </div>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                >
                  <Settings2 className="w-4 h-4 text-[#A7B0C8]" />
                </button>
              </div>

              {/* Settings */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-b border-[rgba(255,255,255,0.05)]"
                  >
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-[#A7B0C8]">Slippage Tolerance</label>
                        <div className="flex items-center gap-1">
                          {[0.1, 0.5, 1.0].map((val) => (
                            <button
                              key={val}
                              onClick={() => setSlippage(val)}
                              className={cn(
                                "px-2 py-1 text-xs rounded-lg transition-colors",
                                slippage === val
                                  ? "bg-[rgba(179,71,255,0.1)] text-[#B347FF]"
                                  : "bg-[rgba(255,255,255,0.03)] text-[#A7B0C8] hover:text-[#F4F6FF]"
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
                <div className="rounded-xl bg-[rgba(255,255,255,0.03)] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-[#A7B0C8]">You pay</label>
                    <span className="text-xs text-[#A7B0C8]">
                      Balance: {balanceLabel(fromLabel)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={inputAmount}
                      onChange={(e) => setInputAmount(e.target.value)}
                      className="font-heading text-3xl font-semibold border-0 bg-transparent p-0 h-auto focus-visible:ring-0 text-[#F4F6FF]"
                      min={0}
                    />
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-sm font-medium whitespace-nowrap text-[#F4F6FF]">
                      <Coins className="w-4 h-4 text-[#B347FF]" />
                      {fromLabel}
                    </div>
                  </div>
                </div>

                {/* Direction indicator */}
                <div className="flex justify-center -my-3 relative z-10">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#0B0C10] bg-[rgba(255,255,255,0.05)]">
                    <ArrowDownUp className="w-4 h-4 text-[#A7B0C8]" />
                  </div>
                </div>

                {/* To (you receive) */}
                <div className="rounded-xl bg-[rgba(255,255,255,0.03)] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-[#A7B0C8]">You receive</label>
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
                    <span className="flex-1 font-heading text-3xl font-semibold">
                      {!inputAmount ? (
                        <span className="text-[#A7B0C8]/40">0.0</span>
                      ) : quoteLoading ? (
                        <span className="text-muted-foreground/40">~</span>
                      ) : estimatedOutput && estimatedOutput > 0n ? (
                        <span className="text-[#F4F6FF]">
                          {formatAmount(estimatedOutput, selectedPool.decimals)}
                        </span>
                      ) : (
                        <span className="text-[#A7B0C8]/40">
                          {address ? "Simulating…" : "Connect wallet"}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-sm font-medium whitespace-nowrap text-[#F4F6FF]">
                      <Coins className="w-4 h-4 text-[#B347FF]" />
                      {toLabel}
                    </div>
                  </div>
                </div>

                {/* Pool info */}
                <div className="flex items-center justify-between px-1 py-2 text-xs text-[#A7B0C8]">
                  <div className="flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    <span>Via DeepBook V3 — {selectedPool.label}</span>
                  </div>
                  <span>{isSponsorable ? "Gas: sponsored (gasless)" : "Gas: user pays (gas coin used)"}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 pt-0 space-y-3">
                {poolViable ? (
                  <Button
                    className="w-full h-12 text-base font-semibold gap-2 bg-[#B347FF] text-[#0B0C10] hover:scale-105 transition-all duration-300 rounded-full"
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
                ) : (
                  <Button
                    className="w-full h-12 text-base font-semibold gap-2 bg-[rgba(255,255,255,0.05)] text-[#A7B0C8] rounded-full cursor-not-allowed"
                    disabled
                  >
                    {poolMsg || "Pool not available"}
                  </Button>
                )}

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

                {txStatus === "success" && lastReceipt && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(255,255,255,0.02)] text-xs text-[#A7B0C8]"
                  >
                    <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Swap receipt stored on Walrus + on-chain memory</span>
                  </motion.div>
                )}

                {txStatus === "error" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive"
                  >
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1">{txError || error || "Transaction failed"}</span>
                    <Button variant="ghost" size="sm" onClick={resetSwap}>
                      Dismiss
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Pool Info */}
            <div className="mt-4 rounded-xl bg-[rgba(255,255,255,0.02)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-[#A7B0C8]" />
                <h3 className="font-heading text-lg font-medium text-[#F4F6FF]">Pool Info</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-[rgba(255,255,255,0.03)]">
                  <span className="text-[#A7B0C8]">Pool</span>
                  <span className="font-medium text-[#F4F6FF]">{selectedPool.label}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[rgba(255,255,255,0.03)]">
                  <span className="text-[#A7B0C8]">Route</span>
                  <span className="font-medium text-[#F4F6FF]">sell {fromLabel} → buy {toLabel}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[rgba(255,255,255,0.03)]">
                  <span className="text-[#A7B0C8]">Gas</span>
                  <span className={cn(
                    "font-medium",
                    isSponsorable ? "text-success" : "text-[#A7B0C8]"
                  )}>
                    {isSponsorable ? "Sponsored (gasless)" : "User pays gas"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[rgba(255,255,255,0.03)]">
                  <span className="text-[#A7B0C8]">Protocol</span>
                  <span className="font-medium text-[#F4F6FF]">DeepBook V3</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </LayoutShell>
  );
}
