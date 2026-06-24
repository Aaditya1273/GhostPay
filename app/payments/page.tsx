"use client";

import { useCustomWallet } from "@/contexts/CustomWallet";
import { usePayments } from "@/hooks/usePaymentQuery";
import LayoutShell from "@/components/LayoutShell";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import clientConfig from "@/config/clientConfig";

const isPackageDeployed =
  !!(clientConfig.PACKAGE_ID && clientConfig.PACKAGE_ID !== "0x0");

const mockPayments = [
  { id: "1", type: "received" as const, from: "0x1a2b...3c4d", amount: "+500.00", currency: "USDC", status: "completed" as const, date: "2026-06-21", time: "2 min ago" },
  { id: "2", type: "sent" as const, to: "Agent #42", amount: "-50.00", currency: "USDC", status: "completed" as const, date: "2026-06-21", time: "1 hour ago" },
  { id: "3", type: "received" as const, from: "0x5e6f...7g8h", amount: "+1,200.00", currency: "USDC", status: "completed" as const, date: "2026-06-20", time: "Yesterday" },
  { id: "4", type: "sent" as const, to: "Freelancer", amount: "-250.00", currency: "USDC", status: "pending" as const, date: "2026-06-20", time: "Yesterday" },
  { id: "5", type: "received" as const, from: "0x9i0j...1k2l", amount: "+75.00", currency: "USDC", status: "completed" as const, date: "2026-06-19", time: "2 days ago" },
  { id: "6", type: "sent" as const, to: "Service Fee", amount: "-15.00", currency: "USDC", status: "failed" as const, date: "2026-06-18", time: "3 days ago" },
];

export default function PaymentsPage() {
  const { isConnected, address, redirectToAuthUrl } = useCustomWallet();
  const { payments: chainPayments, isPending } = usePayments();
  const [searchQuery, setSearchQuery] = useState("");

  const displayPayments = isPackageDeployed
    ? chainPayments.map((p) => ({
        id: p.id,
        type: (p.recipient === address ? "received" : "sent") as "received" | "sent",
        from: p.recipient === address ? p.recipient.slice(0, 10) + "..." : "",
        to: p.recipient !== address ? p.recipient.slice(0, 10) + "..." : "",
        amount: p.recipient === address ? `+${p.amount}` : `-${p.amount}`,
        currency: p.currency,
        status: p.status as "completed" | "pending" | "failed",
        date: new Date(p.timestamp).toISOString().split("T")[0],
        time: p.dateStr,
      }))
    : mockPayments;

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
                <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">Payments</h1>
                <p className="text-sm text-muted-foreground">Send and receive funds globally</p>
              </div>
            </div>
            {isConnected && (
              <Button className="gap-2 hidden sm:flex">
                <Send className="w-4 h-4" />
                New Payment
              </Button>
            )}
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
                { label: "Total Sent", value: isPackageDeployed ? totalSent.toFixed(2) : "315.00", unit: "USDC", icon: ArrowUpRight, color: "text-destructive" },
                { label: "Total Received", value: isPackageDeployed ? totalReceived.toFixed(2) : "1,775.00", unit: "USDC", icon: ArrowDownRight, color: "text-success" },
                { label: "Pending", value: isPackageDeployed ? String(pendingCount) : "1", unit: "transaction", icon: Loader2, color: "text-warning" },
                { label: "This Month", value: isPackageDeployed ? String(chainPayments.length) : "8", unit: "transactions", icon: Clock, color: "text-primary" },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="rounded-xl border border-border bg-card p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={cn("w-4 h-4", stat.color)} />
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                    </div>
                    <p className="text-xl font-semibold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.unit}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* Search & Filter */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Download className="w-4 h-4" />
              </Button>
            </div>

            {/* Payments Table */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Type</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">From / To</th>
                      <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Amount</th>
                      <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                      <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
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
                          className="hover:bg-accent/30 transition-colors"
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
                            <span className="text-sm font-mono">{payment.from || payment.to}</span>
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
                              <p className="text-sm">{payment.time}</p>
                              <p className="text-xs text-muted-foreground">{payment.date}</p>
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
    </LayoutShell>
  );
}
