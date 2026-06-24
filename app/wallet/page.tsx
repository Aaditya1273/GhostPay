"use client";

import { useCustomWallet } from "@/contexts/CustomWallet";
import { useAgent } from "@/hooks/useAgentQuery";
import { usePayments } from "@/hooks/usePaymentQuery";
import LayoutShell from "@/components/LayoutShell";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import clientConfig from "@/config/clientConfig";

const isPackageDeployed =
  !!(clientConfig.PACKAGE_ID && clientConfig.PACKAGE_ID !== "0x0");

export default function WalletPage() {
  const { isConnected, address, emailAddress, redirectToAuthUrl } = useCustomWallet();
  const { fields: agent, hasAgent } = useAgent();
  const { payments } = usePayments();
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
              <h2 className="text-xl font-semibold mb-2">No Wallet Connected</h2>
              <p className="text-muted-foreground mb-4">
                Sign in with Google to create your invisible agent wallet instantly.
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
                  <Button variant="outline" size="sm" className="gap-2 border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] text-[#F4F6FF] hover:bg-[rgba(255,255,255,0.05)]">
                    <RefreshCw className="w-3.5 h-3.5 text-[#B347FF]" />
                    Refresh
                  </Button>
                </div>

                <div className="mb-6">
                  <p className="text-xs text-[#A7B0C8] mb-1">Available Balance</p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-heading text-4xl lg:text-5xl font-bold tracking-tight text-[#F4F6FF]">
                      {isPackageDeployed ? (payments.length > 0 ? "Active" : "0.00") : "1,234.56"}
                    </span>
                    <span className="text-lg text-[#A7B0C8] font-medium">
                      {isPackageDeployed ? "txns" : "USDC"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button className="gap-2 bg-[#B347FF] text-[#0B0C10] hover:scale-105 transition-all duration-300 rounded-full font-semibold">
                    <ArrowUpRight className="w-4 h-4" />
                    Send
                  </Button>
                  <Button variant="secondary" className="gap-2 bg-[rgba(255,255,255,0.05)] text-[#F4F6FF] hover:bg-[rgba(255,255,255,0.08)] rounded-full border border-[rgba(255,255,255,0.1)]">
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
                    { label: "Transactions", value: isPackageDeployed ? `${txnCount} total` : "47 total" },
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
    </LayoutShell>
  );
}
