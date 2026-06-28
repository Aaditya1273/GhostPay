"use client";

import { useState, useEffect } from "react";
import { useCustomWallet } from "@/contexts/CustomWallet";
import { useViewKeys, useAccessLogs, useViewKeyStatus, useAuditTrail, useComplianceReport, useDecryptHistory } from "@/hooks/useComplianceQuery";
import { useComplianceTransaction } from "@/hooks/useComplianceTransaction";
import { useAgent } from "@/hooks/useAgentQuery";
import { useMemories } from "@/hooks/useMemoryQuery";
import { downloadFromWalrus } from "@/lib/WalrusService";
import { createSessionKey, decryptWithSeal, fetchSealKeys, buildSealId } from "@/lib/SealService";
import { CLOCK_ID } from "@/lib/constants";
import LayoutShell from "@/components/LayoutShell";
import { useSuiClient } from "@mysten/dapp-kit";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Key,
  Eye,
  Clock,
  Ghost,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Users,
  FileText,
  X,
  Loader2,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Download,
  BarChart3,
  ScrollText,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import clientConfig from "@/config/clientConfig";
import { useLoadingDeadlock } from "@/lib/demoProof";

const isPackageDeployed = !!(
  clientConfig.PACKAGE_ID && clientConfig.PACKAGE_ID !== "0x0"
);


export default function CompliancePage() {
  const { isUsingEnoki, redirectToAuthUrl, address, authLoading } = useCustomWallet();
  const suiClient = useSuiClient();
  const { viewKeys } = useViewKeys();
  const { logs: accessLogs } = useAccessLogs();
  const { agentId: agentAddress, fields: agentFields } = useAgent();
  const { createViewKey, revokeViewKey, logAccess } = useComplianceTransaction();
  const { memories } = useMemories();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // ── View-Key generation modal ─────────────────────────────────────────
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [viewerAddress, setViewerAddress] = useState("");
  const [keyLabel, setKeyLabel] = useState("");
  const [durationDays, setDurationDays] = useState("180");
  const [generating, setGenerating] = useState(false);

  // ── SEAL decrypt demo ──────────────────────────────────────────────────
  // ── Enterprise compliance hooks ─────────────────────────────────────────
  const { validated: validatedKeys, expired: expiredKeys, active: activeKeys } = useViewKeyStatus();
  const { auditEntries, granted, denied, downloadAuditCsv, downloadAuditJson, logAccessAttempt } = useAuditTrail();
  const { report, downloadReport } = useComplianceReport();
  const { history: decryptHistory, addEntry: addDecryptEntry } = useDecryptHistory();

  const [decryptingId, setDecryptingId] = useState<string | null>(null);
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [showDecryptModal, setShowDecryptModal] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<any>(null);

  // ── Loading deadlock protection ──────────────────────────────────────
  const { timedOut: generateTimedOut } = useLoadingDeadlock(generating);
  const isDecrypting = decryptingId !== null;
  const { timedOut: decryptTimedOut } = useLoadingDeadlock(isDecrypting);

  // ── Escape key handler ─────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showDecryptModal && !isDecrypting) { setShowDecryptModal(false); setDecryptedContent(null); return; }
      if (showGenerateModal && !generating) { setShowGenerateModal(false); return; }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showDecryptModal, showGenerateModal, generating, isDecrypting]);

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast.success("View-key copied to clipboard");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // ── Handle generate view-key ──────────────────────────────────────────
  const handleGenerateKey = async () => {
    if (!agentAddress || !viewerAddress.trim() || !keyLabel.trim()) {
      toast.error("Fill in all fields");
      return;
    }

    setGenerating(true);
    try {
      const durationMs = parseInt(durationDays) * 24 * 60 * 60 * 1000;
      await createViewKey(agentAddress, viewerAddress.trim(), keyLabel.trim(), durationMs);
      toast.success("View-key created and logged on-chain");
      setShowGenerateModal(false);
      setViewerAddress("");
      setKeyLabel("");
      setDurationDays("180");
    } catch (err: any) {
      const msg = err?.message || err?.toString() || "Failed to create view-key";
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  // ── Handle revoke view-key ────────────────────────────────────────────
  const handleRevokeKey = async (viewKeyId: string) => {
    if (!agentAddress) {
      toast.error("No agent found");
      return;
    }
    try {
      await revokeViewKey(viewKeyId, agentAddress);
      await logAccess(agentAddress, address!, viewKeyId, "View-key revoked");
      toast.success("View-key revoked");
    } catch (err: any) {
      const msg = err?.message || err?.toString() || "Failed to revoke view-key";
      toast.error(msg);
    }
  };

  // ── Handle decrypt memory (SEAL demo) ─────────────────────────────────
  const handleDecryptMemory = async (memory: any) => {
    if (!address || !memory.blobId) {
      toast.error("Cannot decrypt: missing blob data");
      return;
    }

    setSelectedMemory(memory);
    setShowDecryptModal(true);
    setDecryptingId(memory.id);
    setDecryptedContent(null);

    try {
      // 1. Download encrypted blob from Walrus
      toast.info("Downloading encrypted blob from Walrus…");
      const { data: encryptedData } = await downloadFromWalrus(memory.blobId);

      // Quick check: if data is NOT SEAL-encrypted (e.g. public blob), just
      // show the raw content without going through the SEAL flow.
      const isSealEncrypted = encryptedData.length > 0 && (encryptedData[0] === 0 || encryptedData[0] === 1);
      if (!isSealEncrypted) {
        const text = new TextDecoder().decode(encryptedData);
        setDecryptedContent(text);
        toast.success("Memory loaded from Walrus");
        return;
      }

      // 2. Create SEAL session key
      toast.info("Creating SEAL session key…");
      const sessionKey = await createSessionKey(
        { suiClient },
        address,
        clientConfig.PACKAGE_ID,
      );

      // 3. Build the seal_approve transaction
      const { Transaction } = await import("@mysten/sui/transactions");
      const tx = new Transaction();
      tx.setSender(address);
      tx.moveCall({
        target: `${clientConfig.PACKAGE_ID}::compliance::seal_approve`,
        arguments: [
          tx.object(agentAddress!),
          tx.pure.address(address),
          tx.pure.string(memory.blobId),
          tx.object(CLOCK_ID),
        ],
      });
      const txBytes = await tx.build({ client: suiClient });

      const sealId = buildSealId(agentAddress!);
      await fetchSealKeys(
        { suiClient, packageId: clientConfig.PACKAGE_ID },
        [sealId],
        txBytes,
        sessionKey,
      );

      // 5. Decrypt
      toast.info("Decrypting…");
      const decrypted = await decryptWithSeal(
        { suiClient, packageId: clientConfig.PACKAGE_ID },
        encryptedData,
        sessionKey,
        txBytes,
      );

      const text = new TextDecoder().decode(decrypted);
      setDecryptedContent(text);
      toast.success("Memory decrypted successfully via SEAL");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Decryption failed";

      // Classify the error and provide an actionable message
      if (
        message.includes("seal_approve") ||
        message.includes("function not found") ||
        message.includes("MoveAbort") ||
        message.includes("module not found")
      ) {
        setDecryptedContent(
          "🔒 SEAL encryption detected — awaiting contract deployment.\n\n" +
          "The compliance::seal_approve function needs to exist in the deployed " +
          "Move package before SEAL decryption can authorize key release.\n\n" +
          "Package ID: " + clientConfig.PACKAGE_ID + "\n" +
          "Blob ID: " + memory.blobId + "\n\n" +
          "The encrypted data remains safely stored on Walrus and can be " +
          "decrypted once the compliance module is deployed.",
        );
      } else if (
        message.includes("key server") ||
        message.includes("NoAccess") ||
        message.includes("aggregator") ||
        message.includes("fetch")
      ) {
        setDecryptedContent(
          "⚠️ SEAL key server unreachable.\n\n" +
          "Could not contact seal-aggregator-testnet.mystenlabs.com.\n\n" +
          "Please check your network connection and try again. " +
          "Your encrypted data is safely stored on Walrus.",
        );
      } else if (message.includes("build") || message.includes("transaction")) {
        setDecryptedContent(
          "⚠️ Transaction build error: " + message + "\n\n" +
          "This usually means the compliance module functions have a " +
          "signature mismatch. Verify the deployed package matches the frontend.",
        );
      } else {
        setDecryptedContent("❌ Decryption error: " + message);
      }

      toast.error("SEAL decryption failed — see details in panel");
    } finally {
      setDecryptingId(null);
    }
  };

  const displayKeys = viewKeys.map((k) => ({
    id: k.id,
    name: k.label,
    key: k.viewerShort,
    viewer: k.viewer,
    created: new Date(k.createdAt).toISOString().split("T")[0],
    expiry: k.expiryStr,
    status: (k.active ? "active" : "revoked") as "active" | "revoked",
  }));

  const displayLogs = accessLogs.map((l) => ({
    action: l.purpose,
    entity: l.viewer.slice(0, 10) + "...",
    date: l.dateStr,
    status: "completed" as const,
    type: "access" as "access" | "share" | "revoke",
  }));

  return (
    <LayoutShell>
      <div className="p-4 lg:p-8 pb-24 lg:pb-8 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-3xl lg:text-4xl font-semibold tracking-tight text-[#F4F6FF]">Compliance Portal</h1>
              <p className="text-base text-[#A7B0C8] mt-1">
                Selective disclosure via view-keys + SEAL — audit-ready, privacy-preserving
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
              <h2 className="text-xl font-semibold mb-2">Compliance Requires Authentication</h2>
              <p className="text-muted-foreground mb-4">
                Sign in to manage view-keys, share access via SEAL, and review your compliance dashboard.
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
            {/* Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Active View-Keys", value: String(viewKeys.filter(k => k.active).length), icon: Eye, color: "text-success" },
                { label: "Access Events", value: String(accessLogs.length), icon: Clock, color: "text-primary" },
                { label: "Data Subjects", value: String(new Set(accessLogs.map(l => l.viewer)).size), icon: Users, color: "text-purple-500" },
                { label: "Compliance Score", value: viewKeys.length > 0 ? "100%" : "N/A", icon: Shield, color: "text-emerald-500" },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={cn("w-4 h-4", stat.color)} />
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                    </div>
                    <p className="text-xl font-semibold">{stat.value}</p>
                  </motion.div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Active View-Keys */}
              <div className="rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]">
                <div className="flex items-center justify-between p-5 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-medium">Active View-Keys</h3>
                  </div>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => setShowGenerateModal(true)}
                    disabled={!agentAddress}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Generate New
                  </Button>
                </div>
                <div className="divide-y divide-[rgba(255,255,255,0.05)]">
                  {displayKeys.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No view-keys yet. Generate one to share access via SEAL.
                    </div>
                  ) : (
                    displayKeys.map((keyItem) => (
                      <div key={keyItem.id} className="p-4 hover:bg-accent/30 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 text-success" />
                            <span className="text-sm font-medium">{keyItem.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              keyItem.status === "active"
                                ? "bg-success/10 text-success"
                                : "bg-destructive/10 text-destructive"
                            )}>
                              {keyItem.status}
                            </span>
                            {keyItem.status === "active" && (
                              <button
                                onClick={() => handleRevokeKey(keyItem.id)}
                                className="p-1 hover:bg-destructive/10 rounded transition-colors"
                                title="Revoke view-key"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-destructive/60 hover:text-destructive" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-mono text-muted-foreground">
                              {keyItem.viewer?.slice(0, 8)}...{keyItem.viewer?.slice(-4)}
                            </code>
                            <button
                              onClick={() => copyKey(keyItem.key)}
                              className="p-1 hover:bg-accent rounded transition-colors"
                            >
                              {copiedKey === keyItem.key ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Expires {keyItem.expiry}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Access Logs */}
              <div className="rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]">
                <div className="flex items-center justify-between p-5 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium">Access Log</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">Last 7 days</span>
                </div>
                <div className="divide-y divide-[rgba(255,255,255,0.05)]">
                  {displayLogs.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No access events yet.
                    </div>
                  ) : (
                    displayLogs.map((log, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="p-4 hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "flex items-center justify-center w-7 h-7 rounded-full mt-0.5",
                              log.type === "share" ? "bg-primary/10" :
                              log.type === "access" ? "bg-success/10" :
                              log.type === "revoke" ? "bg-destructive/10" :
                              "bg-warning/10"
                            )}>
                              {log.type === "share" ? <Eye className="w-3.5 h-3.5 text-primary" /> :
                               log.type === "access" ? <FileText className="w-3.5 h-3.5 text-success" /> :
                               log.type === "revoke" ? <AlertTriangle className="w-3.5 h-3.5 text-destructive" /> :
                               <Key className="w-3.5 h-3.5 text-warning" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{log.action}</p>
                              <p className="text-xs text-muted-foreground">{log.entity}</p>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{log.date}</span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Memories with SEAL Decrypt */}
            {memories.length > 0 && (
              <div className="rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]">
                <div className="flex items-center justify-between p-5 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-medium">SEAL-Encrypted Memories</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {memories.filter(m => m.visibility === "private").length} encrypted
                  </span>
                </div>
                <div className="divide-y divide-[rgba(255,255,255,0.05)]">
                  {memories.filter(m => m.visibility === "private").length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No encrypted memories found.
                    </div>
                  ) : (
                    memories.filter(m => m.visibility === "private").slice(0, 5).map((memory, i) => (
                      <motion.div
                        key={memory.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between p-4 hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                            <Lock className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{memory.label || "Unlabeled memory"}</p>
                            <p className="text-xs text-muted-foreground">{memory.dateStr} · {memory.sizeStr}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => handleDecryptMemory(memory)}
                          disabled={decryptingId === memory.id}
                        >
                          {decryptingId === memory.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5" />
                          )}
                          Decrypt
                        </Button>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Info Banner */}
            <div className="rounded-xl border border-border bg-gradient-to-r from-amber-500/5 to-rose-500/5 p-5">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium mb-1">Compliant by Design</p>
                  <p className="text-xs text-muted-foreground">
                    GhostPay uses SEAL threshold encryption + view-keys for selective disclosure. Share
                    specific data with auditors or regulators without revealing your entire financial history.
                    All access events are logged immutably on-chain.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Generate View-Key Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {showGenerateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setShowGenerateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">
                    <Key className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">Generate View-Key</h3>
                    <p className="text-xs text-muted-foreground">
                      Grant encrypted data access to an auditor
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Viewer Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="0x..."
                    value={viewerAddress}
                    onChange={(e) => setViewerAddress(e.target.value)}
                    className="h-9 text-sm font-mono"
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Label <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Annual Audit 2026"
                    value={keyLabel}
                    onChange={(e) => setKeyLabel(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Duration (days)
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="730"
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-5 border-t border-border bg-muted/20">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGenerateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={handleGenerateKey}
                  disabled={generating || !viewerAddress.trim() || !keyLabel.trim()}
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4" />
                  )}
                  {generating ? "Creating…" : "Create View-Key"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Decrypt Memory Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showDecryptModal && selectedMemory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && (setShowDecryptModal(false), setDecryptedContent(null))}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-xl",
                    decryptedContent ? "bg-success/10" : "bg-primary/10"
                  )}>
                    {decryptedContent ? (
                      <Unlock className="w-4.5 h-4.5 text-success" />
                    ) : (
                      <Lock className="w-4.5 h-4.5 text-primary" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">
                      {decryptedContent ? "Decrypted" : "SEAL Encrypted Memory"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedMemory.label || "Memory"} · {selectedMemory.dateStr}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => (setShowDecryptModal(false), setDecryptedContent(null))}
                  className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-5">
                {decryptedContent === null ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    {decryptingId ? (
                      <>
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                        <div className="text-center">
                          <p className="text-sm font-medium">Decrypting via SEAL…</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Fetching keys from SEAL key servers
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-4">
                        <Lock className="w-10 h-10 text-primary/40" />
                        <div className="text-center">
                          <p className="text-sm font-medium">Ready to Decrypt</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Blob ID: {selectedMemory.blobId?.slice(0, 16)}…
                          </p>
                        </div>
                        <Button
                          className="gap-2"
                          onClick={() => handleDecryptMemory(selectedMemory)}
                        >
                          <Unlock className="w-4 h-4" />
                          Decrypt with SEAL
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-success">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Decryption complete
                    </div>
                    <div className="max-h-60 overflow-y-auto rounded-lg bg-accent/30 p-4">
                      <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                        {decryptedContent}
                      </pre>
                    </div>
                    {decryptedContent.startsWith("🔒") && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/5 border border-warning/20 text-xs text-warning">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span>
                          Configure Enoki keys and SEAL key server to enable full decryption.
                          The encrypted data is safely stored on Walrus.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 p-5 border-t border-border bg-muted/20">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (setShowDecryptModal(false), setDecryptedContent(null))}
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
