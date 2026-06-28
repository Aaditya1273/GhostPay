"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useCustomWallet } from "@/contexts/CustomWallet";
import { useAgent } from "@/hooks/useAgentQuery";
import { useAgentTransaction } from "@/hooks/useAgentTransaction";
import { usePayments } from "@/hooks/usePaymentQuery";
import LayoutShell from "@/components/LayoutShell";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  Send,
  Database,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Clock,
  Ghost,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import clientConfig from "@/config/clientConfig";
import { toast } from "sonner";
import { useLoadingDeadlock } from "@/lib/demoProof";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const isPackageDeployed =
  !!(clientConfig.PACKAGE_ID && clientConfig.PACKAGE_ID !== "0x0");

/** Hash a string with SHA-256 and return hex digest. */
async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function DashboardPage() {
  const { isUsingEnoki, address, emailAddress, authLoading } = useCustomWallet();
  const { fields: agent, agentId, hasAgent, isPending: agentLoading, refetch: refetchAgent } = useAgent();
  const { createAgent, deactivateAgent } = useAgentTransaction();
  const { payments } = usePayments();

  // ── Create / Deactivate Agent state ─────────────────────────────────────
  const [agentName, setAgentName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Loading deadlock protection ──────────────────────────────────────
  const { timedOut: createTimedOut } = useLoadingDeadlock(creating);
  const isSubmittingAgent = useRef(false);

  const handleCreateAgent = useCallback(async () => {
    if (isSubmittingAgent.current) return;
    const name = (agentName || emailAddress?.split("@")[0] || "My Agent").trim();
    if (!name) {
      toast.error("Enter an agent name");
      return;
    }
    isSubmittingAgent.current = true;
    setCreating(true);
    try {
      const emailHash = emailAddress ? await sha256Hex(emailAddress) : "";
      const result = await createAgent(name, emailHash);
      const status = result.effects?.status?.status;
      if (status === "failure") {
        throw new Error(result.effects?.status?.error || "Transaction failed");
      }
      
      const digest = result.digest;
      const explorerLink = `https://suivision.xyz/txblock/${digest}?network=${clientConfig.SUI_NETWORK_NAME}`;
      
      toast.success(
        <div className="flex flex-col gap-1">
          <span>Agent "{name}" created successfully!</span>
          <a 
            href={explorerLink} 
            target="_blank" 
            rel="noreferrer"
            className="text-xs text-blue-500 hover:underline flex items-center gap-1"
          >
            View on SuiVision <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>,
        { duration: 6000 }
      );
      
      setAgentName(""); // Reset input
      await refetchAgent(); // Immediately refresh UI so the modal closes
    } catch (err: any) {
      const msg = err?.message || "Failed to create agent";
      toast.error(msg);
    } finally {
      setCreating(false);
      isSubmittingAgent.current = false;
    }
  }, [agentName, emailAddress, createAgent]);

  const isDeactivatingAgent = useRef(false);
  const handleDeactivateAgent = useCallback(async () => {
    if (isDeactivatingAgent.current || !agentId) return;
    isDeactivatingAgent.current = true;
    setDeactivating(true);
    try {
      const result = await deactivateAgent(agentId);
      const status = result.effects?.status?.status;
      if (status === "failure") {
        throw new Error(result.effects?.status?.error || "Deactivation failed");
      }
      const digest = result.digest;
      toast.success(
        <div className="flex flex-col gap-1">
          <span>Agent deactivated successfully!</span>
          <a
            href={`https://testnet.suivision.xyz/txblock/${digest}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-500 hover:underline flex items-center gap-1"
          >
            View on SuiVision <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>,
        { duration: 6000 }
      );
      await refetchAgent();
    } catch (err: any) {
      toast.error(err?.message || "Failed to deactivate agent");
    } finally {
      setDeactivating(false);
      isDeactivatingAgent.current = false;
    }
  }, [agentId, deactivateAgent, refetchAgent]);

  const showCreateAgent = isUsingEnoki && !hasAgent && !agentLoading && !creating;

  const recentPayments = payments.slice(0, 4);
  const txnCount = payments.length;
  const totalSent = payments
    .filter((p) => p.recipient !== address)
    .reduce((s, p) => s + p.amount, 0);
  const totalReceived = payments
    .filter((p) => p.recipient === address)
    .reduce((s, p) => s + p.amount, 0);

  const stats = [
    {
      label: "Agent Balance",
      value: hasAgent ? "Active" : "0",
      unit: hasAgent ? agent?.display_name || "GhostPay" : "USDC",
      change: hasAgent ? "Online" : "Offline",
      positive: true,
      icon: Wallet,
      color: "from-blue-500/20 to-blue-500/5",
      iconColor: "text-blue-500",
    },
    {
      label: "Transactions",
      value: String(txnCount),
      unit: "total",
      change: `${txnCount} total`,
      positive: true,
      icon: Send,
      color: "from-emerald-500/20 to-emerald-500/5",
      iconColor: "text-emerald-500",
    },
    {
      label: "Memory Blobs",
      value: "—",
      unit: "encrypted",
      change: "Encrypted on Walrus",
      positive: true,
      icon: Database,
      color: "from-purple-500/20 to-purple-500/5",
      iconColor: "text-purple-500",
    },
    {
      label: "Compliance",
      value: "Active",
      unit: "view-key",
      change: "All clear",
      positive: true,
      icon: Shield,
      color: "from-amber-500/20 to-amber-500/5",
      iconColor: "text-amber-500",
    },
  ];

  const recentActivity = recentPayments.map((p) => ({
    type: p.recipient === address ? ("received" as const) : ("sent" as const),
    label: p.memo || (p.recipient === address ? "Payment received" : "Agent payout"),
    amount:
      p.recipient === address
        ? `+${p.amount} ${p.currency}`
        : `-${p.amount} ${p.currency}`,
    time: p.dateStr,
    status: p.status,
  }));

  if (!mounted) {
    return (
      <LayoutShell>
        <div className="p-4 lg:p-8 pb-24 lg:pb-8 max-w-7xl mx-auto flex justify-center items-center h-full min-h-[50vh]">
          <div className="animate-pulse flex items-center justify-center w-16 h-16 rounded-2xl bg-[rgba(179,71,255,0.1)]">
            <Ghost className="w-8 h-8 text-[#B347FF]" />
          </div>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      <div className="p-4 lg:p-8 pb-24 lg:pb-8 max-w-7xl mx-auto">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <img src="/images/ghost-mascot.png" alt="GhostPay Mascot" className="w-12 h-12 object-contain animate-float" />
            <div>
              <h1 className="font-heading text-3xl lg:text-4xl font-semibold tracking-tight text-[#F4F6FF]">
                {isPackageDeployed && hasAgent
                  ? `Welcome back, ${agent?.display_name || "Agent"}`
                  : "Welcome back"}
              </h1>
              <p className="text-base text-[#A7B0C8] mt-1">
                {isPackageDeployed && hasAgent
                  ? `Agent #${agent?.id?.id?.slice(0, 8) || ""} — ${txnCount} transactions`
                  : "Your agent is ready. Here's your financial overview."}
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
              <h2 className="text-xl font-semibold mb-2">Your Invisible Bank Awaits</h2>
              <p className="text-muted-foreground">
                Sign in to activate your AI agent wallet. No seed phrases, no gas fees 
                just seamless banking.
              </p>
            </div>
          </motion.div>
        ) : creating ? (
          /* ── Creating Agent (waiting for on-chain confirmation) ── */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 gap-6"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[rgba(179,71,255,0.1)]">
              <Loader2 className="w-8 h-8 animate-spin text-[#B347FF]" />
            </div>
            <div className="text-center max-w-md">
              <h2 className="text-xl font-semibold mb-2 text-[#F4F6FF]">Creating Agent…</h2>
              <p className="text-[#A7B0C8]">
                {createTimedOut
                  ? "This is taking longer than expected. The transaction may still confirm — check Sui Explorer or refresh the page."
                  : "Submitting transaction to Sui Testnet. This should confirm in a few seconds."}
              </p>
            </div>
          </motion.div>
        ) : showCreateAgent ? (
          /* ── Create Agent flow (no agent exists yet) ── */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto py-12"
          >
            <div className="text-center mb-8">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[rgba(179,71,255,0.1)] mx-auto mb-4">
                <Ghost className="w-8 h-8 text-[#B347FF]" />
              </div>
              <h2 className="font-heading text-2xl font-semibold text-[#F4F6FF] mb-2">
                Create Your Agent
              </h2>
              <p className="text-[#A7B0C8] text-sm">
                Your invisible bank needs an agent. This creates an on-chain Agent object
                that manages your payments, encrypted storage, and compliance.
              </p>
            </div>

            <div className="rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-6 space-y-5">
              <div>
                <label className="text-xs text-[#A7B0C8] mb-2 block">
                  Agent Name <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder={emailAddress?.split("@")[0] || "My Agent"}
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="h-10 text-sm bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] text-[#F4F6FF]"
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreateAgent(); }}
                />
              </div>

              <Button
                className="w-full h-12 text-base font-semibold gap-2 bg-[#B347FF] text-[#0B0C10] hover:scale-105 transition-all duration-300 rounded-full"
                onClick={handleCreateAgent}
                disabled={creating}
              >
                <Ghost className="w-5 h-5" />
                Create Agent on Sui
              </Button>

              <p className="text-xs text-[#A7B0C8] text-center">
                Gas fees are sponsored by GhostPay. No SUI tokens needed.
              </p>
            </div>

            <div className="mt-6 rounded-xl bg-[rgba(179,71,255,0.05)] border border-[rgba(179,71,255,0.1)] p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-[#B347FF] mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#F4F6FF] mb-1">What happens next?</p>
                  <ul className="text-xs text-[#A7B0C8] space-y-1">
                    <li>1. A Move contract creates an Agent object on Sui Testnet</li>
                    <li>2. The Agent is owned by your zkLogin address</li>
                    <li>3. You can store encrypted memories on Walrus</li>
                    <li>4. You can create view-keys for compliance audits</li>
                    <li>5. All transactions are gasless (Enoki sponsored)</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    variants={itemVariants}
                    className="group relative overflow-hidden rounded-xl p-5 hover:bg-[rgba(255,255,255,0.03)] transition-all duration-300"
                  >
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                      stat.color
                    )} />
                    <div className="relative z-10">
                      <div className="flex items-center justify-end mb-3">
                        <span className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full",
                          stat.positive
                            ? "bg-success/10 text-success"
                            : "bg-destructive/10 text-destructive"
                        )}>
                          {stat.change}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="font-heading text-3xl font-semibold tracking-tight text-[#F4F6FF]">{stat.value}</p>
                        <p className="text-xs text-[#A7B0C8]">
                          {stat.label} • {stat.unit}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Quick Actions */}
            <motion.div variants={itemVariants}>
              <h2 className="font-heading text-sm font-medium text-[#A7B0C8] mb-3 uppercase tracking-wider">Quick Actions</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Send Payment", src: "/sui.png", href: "/payments", desc: "Transfer funds globally" },
                  { label: "View Wallet", src: "/images/ghost-mascot.png", href: "/wallet", desc: "Agent wallet details" },
                  { label: "Store Memory", src: "/seal.png", href: "/vault", desc: "Encrypt to Walrus" },
                  { label: "Share Access", src: "/seale.png", href: "/compliance", desc: "Manage view-keys" },
                ].map((action) => {
                  return (
                    <a
                      key={action.label}
                      href={action.href}
                      className="flex flex-col gap-2 p-4 rounded-xl bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(179,71,255,0.1)] transition-all duration-200 group cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <img 
                          src={action.src} 
                          alt={action.label} 
                          className="w-10 h-10 rounded-xl object-cover"
                        />
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div>
                        <p className="font-heading text-sm font-medium text-[#F4F6FF]">{action.label}</p>
                        <p className="text-xs text-[#A7B0C8]">{action.desc}</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </motion.div>

            {/* Activity Feed + Agent Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Activity Feed */}
              <motion.div variants={itemVariants} className="lg:col-span-2">
                <div className="rounded-xl bg-[rgba(255,255,255,0.02)]">
                  <div className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <h3 className="font-heading text-lg font-medium text-[#F4F6FF]">Recent Payments</h3>
                    </div>
                    <span className="text-xs text-[#A7B0C8]">{recentActivity.length} transactions</span>
                  </div>
                  <div className="divide-y divide-[rgba(255,255,255,0.05)]">
                    {recentActivity.length === 0 ? (
                      <div className="p-8 text-center text-sm text-muted-foreground">
                        No activity yet. Deploy the contract to start transacting.
                      </div>
                    ) : (
                      recentActivity.map((activity, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex items-center justify-between p-4 hover:bg-accent/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "flex items-center justify-center w-8 h-8 rounded-full",
                              activity.type === "received" ? "bg-success/10 text-success" :
                              activity.type === "sent" ? "bg-destructive/10 text-destructive" :
                              "bg-primary/10 text-primary"
                            )}>
                              {activity.type === "received" ? <ArrowDownRight className="w-4 h-4" /> :
                               activity.type === "sent" ? <ArrowUpRight className="w-4 h-4" /> :
                               <Database className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{activity.label}</p>
                              <p className="text-xs text-muted-foreground">{activity.time}</p>
                            </div>
                          </div>
                          <span className={cn(
                            "text-sm font-medium",
                            activity.amount.startsWith("+") ? "text-success" :
                            activity.amount.startsWith("-") ? "text-destructive" :
                            "text-muted-foreground"
                          )}>
                            {activity.amount}
                          </span>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Agent Status */}
              <motion.div variants={itemVariants}>
                <div className="rounded-xl bg-[rgba(255,255,255,0.02)] p-5 h-full">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-[#B347FF]" />
                    <h3 className="font-heading text-lg font-medium text-[#F4F6FF]">Agent Status</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(255,255,255,0.05)]">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[rgba(179,71,255,0.1)]">
                        <div className="w-3 h-3 rounded-full bg-[#B347FF] animate-pulse-soft" />
                      </div>
                      <div>
                        <p className="font-heading text-sm font-medium text-[#F4F6FF]">
                          {isPackageDeployed && hasAgent ? (agent?.active ? "Active" : "Inactive") : "Ready"}
                        </p>
                        <p className="text-xs text-[#A7B0C8]">
                          {isPackageDeployed && hasAgent
                            ? agent?.display_name || "GhostPay Agent"
                            : "Awaiting contract deployment"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: "Agent ID", value: isPackageDeployed && hasAgent ? agent?.id?.id?.slice(0, 8) || "—" : address?.slice(0, 8) || "—" },
                        { label: "Network", value: "Sui Testnet" },
                        { label: "Transactions", value: isPackageDeployed ? String(txnCount) : "0" },
                        { label: "Gas Balance", value: "Sponsored" },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between text-sm">
                          <span className="text-[#A7B0C8]">{item.label}</span>
                          <span className="font-medium font-mono text-xs text-[#F4F6FF]">{item.value}</span>
                        </div>
                      ))}
                    </div>
                    {/* Deactivate Agent */}
                    {isPackageDeployed && hasAgent && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full mt-2 gap-2 opacity-70 hover:opacity-100"
                        onClick={handleDeactivateAgent}
                        disabled={deactivating}
                      >
                        {deactivating ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        {deactivating ? "Deactivating…" : "Deactivate Agent"}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>
    </LayoutShell>
  );
}
