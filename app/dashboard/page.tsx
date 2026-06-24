"use client";

import { useCustomWallet } from "@/contexts/CustomWallet";
import { useAgent } from "@/hooks/useAgentQuery";
import { usePayments } from "@/hooks/usePaymentQuery";
import LayoutShell from "@/components/LayoutShell";
import { motion } from "framer-motion";
import {
  Wallet,
  Send,
  Database,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Ghost,
  Sparkles,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import clientConfig from "@/config/clientConfig";

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

export default function DashboardPage() {
  const { isConnected, address } = useCustomWallet();
  const { fields: agent, hasAgent } = useAgent();
  const { payments } = usePayments();

  const recentPayments = payments.slice(0, 4);
  const txnCount = payments.length;
  const totalSent = payments
    .filter((p) => p.recipient !== address)
    .reduce((s, p) => s + p.amount, 0);
  const totalReceived = payments
    .filter((p) => p.recipient === address)
    .reduce((s, p) => s + p.amount, 0);

  // Stats derived from chain data (or mock defaults when not deployed)
  const stats = [
    {
      label: "Agent Balance",
      value: isPackageDeployed && hasAgent ? "Active" : "1,234.56",
      unit: isPackageDeployed && hasAgent ? agent?.display_name || "GhostPay" : "USDC",
      change: isPackageDeployed && hasAgent ? "Online" : "+12.5%",
      positive: true,
      icon: Wallet,
      color: "from-blue-500/20 to-blue-500/5",
      iconColor: "text-blue-500",
    },
    {
      label: "Transactions",
      value: isPackageDeployed ? String(txnCount) : "47",
      unit: "total",
      change: isPackageDeployed ? `${txnCount} total` : "+8 this month",
      positive: true,
      icon: Send,
      color: "from-emerald-500/20 to-emerald-500/5",
      iconColor: "text-emerald-500",
    },
    {
      label: "Memory Blobs",
      value: "—",
      unit: "encrypted",
      change: "2.4 GB stored",
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

  // Activity feed from chain payments (or mock data when not deployed)
  const recentActivity = isPackageDeployed
    ? recentPayments.map((p) => ({
        type: p.recipient === address ? ("received" as const) : ("sent" as const),
        label: p.memo || (p.recipient === address ? "Payment received" : "Agent payout"),
        amount:
          p.recipient === address
            ? `+${p.amount} ${p.currency}`
            : `-${p.amount} ${p.currency}`,
        time: p.dateStr,
        status: p.status,
      }))
    : [
        { type: "received" as const, label: "Payment received", amount: "+500 USDC", time: "2 min ago", status: "completed" },
        { type: "sent" as const, label: "Agent payout", amount: "-50 USDC", time: "1 hour ago", status: "completed" },
        { type: "vault" as const, label: "Memory stored", amount: "Encrypted blob", time: "3 hours ago", status: "completed" },
        { type: "compliance" as const, label: "View-key shared", amount: "Audit access", time: "1 day ago", status: "completed" },
      ];

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
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
              <Ghost className="w-5 h-5 text-primary" />
            </div>
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
              <h2 className="text-xl font-semibold mb-2">Your Invisible Bank Awaits</h2>
              <p className="text-muted-foreground">
                Sign in to activate your AI agent wallet. No seed phrases, no gas fees — just seamless banking.
              </p>
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
                      <div className="flex items-center justify-between mb-3">
                        <div className={cn(
                          "flex items-center justify-center w-9 h-9 rounded-lg",
                          stat.iconColor,
                          "bg-current/10"
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>
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
                  { label: "Send Payment", icon: Send, href: "/payments", desc: "Transfer funds globally" },
                  { label: "View Wallet", icon: Wallet, href: "/wallet", desc: "Agent wallet details" },
                  { label: "Store Memory", icon: Database, href: "/vault", desc: "Encrypt to Walrus" },
                  { label: "Share Access", icon: Shield, href: "/compliance", desc: "Manage view-keys" },
                ].map((action) => {
                  const Icon = action.icon;
                  return (
                    <a
                      key={action.label}
                      href={action.href}
                      className="flex flex-col gap-2 p-4 rounded-xl bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(179,71,255,0.1)] transition-all duration-200 group cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary">
                          <Icon className="w-4 h-4" />
                        </div>
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
                      <h3 className="font-heading text-lg font-medium text-[#F4F6FF]">{isPackageDeployed ? "Recent Payments" : "Recent Activity"}</h3>
                    </div>
                    <span className="text-xs text-[#A7B0C8]">{isPackageDeployed ? `${recentActivity.length} transactions` : "Last 24 hours"}</span>
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
