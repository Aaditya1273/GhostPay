"use client";

import { useState, useRef, useEffect } from "react";
import { useCustomWallet } from "@/contexts/CustomWallet";
import { useMemories } from "@/hooks/useMemoryQuery";
import { useWalrusUpload, type UploadStep } from "@/hooks/useWalrusUpload";
import { useAgent } from "@/hooks/useAgentQuery";
import LayoutShell from "@/components/LayoutShell";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  Lock,
  Eye,
  Upload,
  Ghost,
  FileText,
  Shield,
  X,
  File,
  ChevronDown,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowUpFromLine,
  Download,
  Globe,
  Image,
  FileSpreadsheet,
  FileCode,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadFromWalrus, getBlobUrl } from "@/lib/WalrusService";
import clientConfig from "@/config/clientConfig";
import { toast } from "sonner";
import { useLoadingDeadlock } from "@/lib/demoProof";

const isPackageDeployed = !!(
  clientConfig.PACKAGE_ID && clientConfig.PACKAGE_ID !== "0x0"
);

const DATA_TYPES = [
  { value: "payslip", label: "Payslip", icon: FileText, color: "text-emerald-500" },
  { value: "kyc", label: "KYC Document", icon: Shield, color: "text-blue-500" },
  { value: "config", label: "Configuration", icon: FileCode, color: "text-purple-500" },
  { value: "receipt", label: "Receipt", icon: FileSpreadsheet, color: "text-amber-500" },
  { value: "report", label: "Report", icon: FileText, color: "text-rose-500" },
  { value: "proof", label: "Proof", icon: ShieldAlert, color: "text-cyan-500" },
  { value: "image", label: "Image", icon: Image, color: "text-pink-500" },
  { value: "other", label: "Other", icon: File, color: "text-muted-foreground" },
];

const uploadStepMessages: Record<UploadStep, string> = {
  idle: "",
  encrypting: "Encrypting with SEAL…",
  uploading: "Uploading to Walrus…",
  storing: "Storing on-chain…",
  done: "Complete!",
  error: "Upload failed",
};

export default function VaultPage() {
  const { isUsingEnoki, redirectToAuthUrl, address, authLoading } = useCustomWallet();
  const { memories: chainMemories, isPending } = useMemories();
  const { agentId: agentObjectId } = useAgent();
  const { state: uploadState, upload, reset: resetUpload } = useWalrusUpload();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [label, setLabel] = useState("");
  const [dataType, setDataType] = useState("payslip");
  const [isPrivate, setIsPrivate] = useState(true);
  const [showDataTypePicker, setShowDataTypePicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Loading deadlock protection ──────────────────────────────────────
  const isUploading = uploadState.step === "encrypting" || uploadState.step === "uploading" || uploadState.step === "storing";
  const { timedOut: uploadTimedOut, reset: resetDeadlock } = useLoadingDeadlock(isUploading);

  // ── Escape key handler ─────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showUploadModal && !isUploading) { handleCloseModal(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showUploadModal, isUploading]);

  const displayMemories = chainMemories.map((m) => ({
    id: m.id,
    name: m.label || `${m.dataType.charAt(0).toUpperCase() + m.dataType.slice(1)} Memory`,
    size: m.sizeStr,
    status: (m.visibility === "private" ? "encrypted" : "shared") as "encrypted" | "shared",
    date: m.dateStr,
    type: m.dataType as any,
    blobId: m.blobId,
  }));

  const totalSizeMB = chainMemories.reduce((s, m) => s + m.dataSize, 0) / (1024 * 1024);

  // ── Upload handlers ──────────────────────────────────────────────────

  const handleFileSelect = (file: File | null) => {
    if (file) {
      // Max 50MB
      if (file.size > 50 * 1024 * 1024) {
        toast.error("File too large — max 50 MB");
        return;
      }
      setSelectedFile(file);
      if (!label) {
        setLabel(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    handleFileSelect(file ?? null);
  };

  const handleStartUpload = async () => {
    if (!selectedFile || !agentObjectId) {
      toast.error(!selectedFile ? "Select a file first" : "No agent found. Create one first.");
      return;
    }

    const bytes = new Uint8Array(await selectedFile.arrayBuffer());

    await upload({
      data: bytes,
      dataType: dataType,
      label: label || selectedFile.name,
      agentId: agentObjectId,
      isPrivate,
    });
  };

  const handleCloseModal = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setLabel("");
    setDataType("payslip");
    setIsPrivate(true);
    resetUpload();
  };

  const handleViewBlob = async (blobId: string, memoryName: string) => {
    try {
      const { data, contentType } = await downloadFromWalrus(blobId);
      // Check if data is SEAL encrypted (starts with SEAL BCS prefix)
      const isSealed = data[0] === 0 || data[0] === 1;
      if (isSealed) {
        toast.info("This memory is SEAL encrypted. Use Compliance Portal to share view-keys.");
        return;
      }
      const rawBytes = new Uint8Array(data);
      if (contentType.startsWith("text/") || contentType.includes("json")) {
        const text = new TextDecoder().decode(data);
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(`<pre>${text}</pre>`);
        }
      } else if (contentType.startsWith("image/")) {
        const blob = new Blob([rawBytes as unknown as BlobPart], { type: contentType });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      } else {
        // Download as file
        const blob = new Blob([rawBytes as unknown as BlobPart], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = memoryName;
        a.click();
        URL.revokeObjectURL(url);
      }
      toast.success("Blob retrieved from Walrus");
    } catch (err) {
      toast.error("Failed to download blob from Walrus");
    }
  };

  const selectedDataType = DATA_TYPES.find((dt) => dt.value === dataType);

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
                <Database className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-heading text-3xl lg:text-4xl font-semibold tracking-tight text-[#F4F6FF]">Memory Vault</h1>
                <p className="text-base text-[#A7B0C8] mt-1">
                  Encrypted storage powered by Walrus — private by default
                </p>
              </div>
            </div>
            {mounted && isUsingEnoki && (
              <Button
                className="gap-2 hidden sm:flex bg-[#B347FF] text-[#0B0C10] rounded-full font-semibold hover:bg-[#A03FE6]"
                onClick={() => setShowUploadModal(true)}
              >
                <Upload className="w-4 h-4" />
                Store Memory
              </Button>
            )}
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
              <h2 className="text-xl font-semibold mb-2">Memory Vault is Locked</h2>
              <p className="text-muted-foreground mb-4">
                Sign in to access your encrypted Walrus storage. Your memories are private by default.
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
            {/* Upload Button (Mobile) */}
            <Button
              className="gap-2 w-full sm:hidden"
              onClick={() => setShowUploadModal(true)}
            >
              <Upload className="w-4 h-4" />
              Store Memory
            </Button>

            {/* Storage Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-3 rounded-xl bg-[rgba(255,255,255,0.02)] p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#B347FF]" />
                    <h3 className="font-heading text-lg font-medium text-[#F4F6FF]">Storage Usage</h3>
                  </div>
                  <span className="text-xs text-[#A7B0C8]">
                    {`${totalSizeMB.toFixed(1)} MB of 10 GB used`}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(totalSizeMB / 100, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-[#B347FF] to-purple-500"
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-[#A7B0C8]">
                  <span>{`${(totalSizeMB / 100).toFixed(1)}% used`}</span>
                  <span>{`${(10000 - totalSizeMB).toFixed(1)} MB free`}</span>
                </div>
              </div>
              <div className="rounded-xl bg-[rgba(255,255,255,0.02)] p-4 flex flex-col items-center justify-center">
                <Lock className="w-8 h-8 text-success mb-2" />
                <p className="font-heading text-sm font-medium text-[#F4F6FF]">End-to-End Encrypted</p>
                <p className="text-xs text-[#A7B0C8]">SEAL + Walrus</p>
              </div>
            </div>

            {/* Memory Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayMemories.length === 0 ? (
                <div className="col-span-full p-12 text-center text-sm text-muted-foreground">
                  {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading…
                    </span>
                  ) : (
                    "No memories stored yet. Upload your first encrypted blob."
                  )}
                </div>
              ) : (
                displayMemories.map((memory, i) => (
                  <motion.div
                    key={memory.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="group rounded-xl bg-[rgba(255,255,255,0.02)] p-5 hover:bg-[rgba(255,255,255,0.04)] transition-all duration-300 cursor-pointer"
                    onClick={() => memory.blobId && handleViewBlob(memory.blobId, memory.name)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={cn(
                        "flex items-center justify-center w-9 h-9 rounded-lg",
                        memory.type === "payslip" ? "bg-emerald-500/10 text-emerald-500" :
                        memory.type === "kyc" ? "bg-blue-500/10 text-blue-500" :
                        memory.type === "config" ? "bg-purple-500/10 text-purple-500" :
                        memory.type === "receipt" ? "bg-amber-500/10 text-amber-500" :
                        memory.type === "report" ? "bg-rose-500/10 text-rose-500" :
                        "bg-primary/10 text-primary"
                      )}>
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className={cn(
                        "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                        memory.status === "encrypted" ? "bg-success/10 text-success" :
                        "bg-warning/10 text-warning"
                      )}>
                        {memory.status === "encrypted" ? <Lock className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {memory.status}
                      </div>
                    </div>
                    <h4 className="font-heading text-lg font-medium mb-1 truncate text-[#F4F6FF]">{memory.name}</h4>
                    <div className="flex items-center justify-between text-xs text-[#A7B0C8]">
                      <span>{memory.size}</span>
                      <span>{memory.date}</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Info Banner */}
            <div className="rounded-xl bg-[rgba(179,71,255,0.05)] border border-[rgba(179,71,255,0.1)] p-5">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-[#B347FF] mt-0.5" />
                <div>
                  <p className="font-heading text-lg font-medium mb-1 text-[#F4F6FF]">Private by Default</p>
                  <p className="text-xs text-[#A7B0C8]">
                    All data is encrypted with SEAL before being stored on Walrus. Only you and
                    authorized view-key holders can decrypt your memories. No one else — not even GhostPay — can access your data.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Upload Modal ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && handleCloseModal()}
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
                    <Upload className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">Store Memory</h3>
                    <p className="text-xs text-muted-foreground">
                      Encrypt and store on Walrus
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-5">
                {/* File Picker */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    File <span className="text-destructive">*</span>
                  </Label>
                  <div
                    className={cn(
                      "relative flex flex-col items-center justify-center h-36 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer",
                      dragActive
                        ? "border-primary bg-primary/5"
                        : selectedFile
                        ? "border-success/50 bg-success/5"
                        : "border-border hover:border-primary/50 hover:bg-accent/30"
                    )}
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                    />
                    {selectedFile ? (
                      <div className="flex flex-col items-center gap-2 text-center px-4">
                        <File className="w-8 h-8 text-success" />
                        <div>
                          <p className="text-sm font-medium truncate max-w-[300px]">{selectedFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                          className="text-xs text-destructive hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-center px-4">
                        <ArrowUpFromLine className={cn(
                          "w-8 h-8 transition-colors",
                          dragActive ? "text-primary" : "text-muted-foreground"
                        )} />
                        <div>
                          <p className="text-sm font-medium">
                            {dragActive ? "Drop file here" : "Drag & drop or click to browse"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Max 50 MB — any file type
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Label */}
                <div>
                  <Label htmlFor="memory-label" className="text-xs text-muted-foreground mb-2 block">
                    Label
                  </Label>
                  <Input
                    id="memory-label"
                    placeholder="e.g. Payslip Q2 2026"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Data Type */}
                <div className="relative">
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Data Type
                  </Label>
                  <button
                    onClick={() => setShowDataTypePicker(!showDataTypePicker)}
                    className="flex items-center justify-between w-full h-9 px-3 rounded-lg border border-input bg-background text-sm hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {selectedDataType && (
                        <selectedDataType.icon className={cn("w-4 h-4", selectedDataType.color)} />
                      )}
                      <span>{selectedDataType?.label ?? "Select type"}</span>
                    </div>
                    <ChevronDown className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform",
                      showDataTypePicker && "rotate-180"
                    )} />
                  </button>
                  <AnimatePresence>
                    {showDataTypePicker && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden"
                      >
                        {DATA_TYPES.map((dt) => {
                          const Icon = dt.icon;
                          return (
                            <button
                              key={dt.value}
                              onClick={() => { setDataType(dt.value); setShowDataTypePicker(false); }}
                              className={cn(
                                "flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-left",
                                dataType === dt.value && "bg-accent"
                              )}
                            >
                              <Icon className={cn("w-4 h-4", dt.color)} />
                              {dt.label}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Privacy Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30">
                  <div className="flex items-center gap-3">
                    {isPrivate ? (
                      <Lock className="w-4 h-4 text-success" />
                    ) : (
                      <Globe className="w-4 h-4 text-warning" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {isPrivate ? "SEAL Encrypted" : "Public"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isPrivate
                          ? "Encrypted with SEAL before storing. Only you can decrypt."
                          : "Visible to anyone with the blob ID."}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsPrivate(!isPrivate)}
                    className={cn(
                      "relative inline-flex h-6 w-10 items-center rounded-full transition-colors",
                      isPrivate ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-sm",
                        isPrivate ? "translate-x-5" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>

                {/* Upload Progress */}
                {uploadState.step !== "idle" && (
                  <div className="space-y-3">
                    {/* Progress Bar */}
                    <div className="h-1.5 rounded-full bg-accent overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadState.progress}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className={cn(
                          "h-full rounded-full transition-colors",
                          uploadState.step === "error"
                            ? "bg-destructive"
                            : uploadState.step === "done"
                            ? "bg-success"
                            : "bg-gradient-to-r from-primary to-purple-500"
                        )}
                      />
                    </div>

                    {/* Status Message */}
                    <div className="flex items-center gap-2 text-sm">
                      {uploadState.step === "done" ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : uploadState.step === "error" ? (
                        <AlertCircle className="w-4 h-4 text-destructive" />
                      ) : (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      )}
                      <span className={cn(
                        uploadState.step === "done" && "text-success",
                        uploadState.step === "error" && "text-destructive"
                      )}>
                        {uploadStepMessages[uploadState.step]}
                      </span>
                    </div>

                    {/* Deadlock warning */}
                    {uploadTimedOut && isUploading && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10 border border-warning/20 text-xs text-warning">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Upload is taking longer than expected. The Walrus publisher may be slow — please wait or cancel and retry.</span>
                      </div>
                    )}

                    {/* Success Details */}
                    {uploadState.step === "done" && uploadState.result.blobId && (
                      <div className="p-3 rounded-lg bg-success/5 border border-success/20 text-xs text-muted-foreground space-y-1">
                        <p className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-success" />
                          Blob ID: <code className="font-mono text-success">{uploadState.result.blobId.slice(0, 20)}...</code>
                        </p>
                        <a
                          href={getBlobUrl(uploadState.result.blobId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Download className="w-3 h-3" />
                          View on Walrus
                        </a>
                      </div>
                    )}

                    {/* Error Details */}
                    {uploadState.step === "error" && (
                      <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-destructive">
                        {uploadState.error}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-5 border-t border-border bg-muted/20">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCloseModal}
                  disabled={uploadState.step === "encrypting" || uploadState.step === "uploading" || uploadState.step === "storing"}
                >
                  {uploadState.step === "done" ? "Close" : "Cancel"}
                </Button>
                {uploadState.step !== "done" && (
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={handleStartUpload}
                    disabled={
                      !selectedFile ||
                      !label.trim() ||
                      !agentObjectId ||
                      uploadState.step === "encrypting" ||
                      uploadState.step === "uploading" ||
                      uploadState.step === "storing"
                    }
                  >
                    {(uploadState.step === "encrypting" || uploadState.step === "uploading" || uploadState.step === "storing") ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading…
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        {isPrivate ? "Encrypt & Upload" : "Upload to Walrus"}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </LayoutShell>
  );
}
