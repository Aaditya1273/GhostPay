import clientConfig from "@/config/clientConfig";
import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useCustomWallet } from "@/contexts/CustomWallet";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  validateViewKey,
  checkPermission,
  createAuditEntry,
  appendAuditEntry,
  loadAuditCache,
  generateComplianceReport,
  exportReportAsJson,
  exportAuditAsCsv,
  downloadBlob,
  recordDecryptAttempt,
  loadDecryptHistory,
  type AuditEntry,
  type ComplianceReport,
  type ViewKeyStatus,
  type PermissionCheck,
  type DecryptHistoryEntry,
  type ComplianceAction,
} from "@/lib/complianceEngine";
import { useAgent } from "./useAgentQuery";

const isPackageDeployed = !!(
  clientConfig.PACKAGE_ID && clientConfig.PACKAGE_ID !== "0x0"
);

export interface ViewKeyFields {
  id: { id: string };
  agent_id: string;
  viewer: string;
  label: string;
  created_at: string;
  expires_at: string;
  active: boolean;
}

export interface AccessLogEntryFields {
  id: { id: string };
  agent_id: string;
  viewer: string;
  data_ref: string;
  timestamp: string;
  purpose: string;
}

/** Query the user's ViewKey objects from the chain */
export function useViewKeysQuery() {
  const { address } = useCustomWallet();

  return useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: address!,
      filter: {
        StructType: `${clientConfig.PACKAGE_ID}::compliance::ViewKey`,
      },
      options: {
        showContent: true,
        showOwner: true,
        showType: true,
      },
    },
    {
      enabled: isPackageDeployed && !!address,
    }
  );
}

/** Query the user's AccessLogEntry objects from the chain */
export function useAccessLogsQuery() {
  const { address } = useCustomWallet();

  return useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: address!,
      filter: {
        StructType: `${clientConfig.PACKAGE_ID}::compliance::AccessLogEntry`,
      },
      options: {
        showContent: true,
        showOwner: true,
        showType: true,
      },
    },
    {
      enabled: isPackageDeployed && !!address,
    }
  );
}

export interface ParsedViewKey {
  id: string;
  viewer: string;
  label: string;
  createdAt: number;
  expiresAt: number;
  active: boolean;
  expiryStr: string;
  viewerShort: string;
}

export interface ParsedAccessLog {
  id: string;
  viewer: string;
  dataRef: string;
  timestamp: number;
  purpose: string;
  dateStr: string;
}

function formatTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hour ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)} days ago`;
  return new Date(ts).toLocaleDateString();
}

function formatExpiry(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Hook that returns parsed view-keys */
export function useViewKeys() {
  const { data, isPending, error } = useViewKeysQuery();

  const viewKeys: ParsedViewKey[] =
    data?.data
      ?.map((obj) => {
        const fields = obj.data?.content as
          | { dataType: "moveObject"; fields: ViewKeyFields }
          | undefined;
        if (!fields?.fields) return null;
        const f = fields.fields;
        return {
          id: f.id.id,
          viewer: f.viewer,
          label: f.label,
          createdAt: Number(f.created_at),
          expiresAt: Number(f.expires_at),
          active: f.active,
          expiryStr: formatExpiry(Number(f.expires_at)),
          viewerShort: `${f.viewer.slice(0, 6)}...${f.viewer.slice(-4)}`,
        };
      })
      .filter((k): k is ParsedViewKey => k !== null) ?? [];

  return { viewKeys, isPending, error, hasViewKeys: viewKeys.length > 0 };
}

/** Hook that returns parsed access logs */
export function useAccessLogs() {
  const { data, isPending, error } = useAccessLogsQuery();

  const logs: ParsedAccessLog[] =
    data?.data
      ?.map((obj) => {
        const fields = obj.data?.content as
          | { dataType: "moveObject"; fields: AccessLogEntryFields }
          | undefined;
        if (!fields?.fields) return null;
        const f = fields.fields;
        return {
          id: f.id.id,
          viewer: f.viewer,
          dataRef: f.data_ref,
          timestamp: Number(f.timestamp),
          purpose: f.purpose,
          dateStr: formatTime(Number(f.timestamp)),
        };
      })
      .filter((l): l is ParsedAccessLog => l !== null) ?? [];

  logs.sort((a, b) => b.timestamp - a.timestamp);

  return { logs, isPending, error, hasLogs: logs.length > 0 };
}

// ═════════════════════════════════════════════════════════════════════════════
//  Enterprise Compliance Hooks
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Hook that validates view-keys with full expiry/revocation checks.
 * Returns ViewKeyStatus[] with expired flags.
 */
export function useViewKeyStatus() {
  const { viewKeys, isPending, error } = useViewKeys();

  const validated = useMemo<ViewKeyStatus[]>(() => {
    return viewKeys.map(k => {
      const status = validateViewKey({
        id: k.id,
        viewer: k.viewer,
        active: k.active,
        expires_at: k.expiresAt,
      });
      return status ?? {
        id: k.id,
        viewer: k.viewer,
        label: k.label,
        created_at: k.createdAt,
        expires_at: k.expiresAt,
        active: k.active,
        expired: false,
      };
    });
  }, [viewKeys]);

  const expired = useMemo(() => validated.filter(k => k.expired), [validated]);
  const active = useMemo(() => validated.filter(k => k.active && !k.expired), [validated]);
  const revoked = useMemo(() => validated.filter(k => !k.active && !k.expired), [validated]);

  return { validated, expired, active, revoked, isPending, error };
}

/**
 * Hook that manages the local audit trail.
 * Every access attempt (success or failure) is logged with replay protection.
 */
export function useAuditTrail() {
  const { address } = useCustomWallet();
  const { agentId } = useAgent();
  const { logs: onChainLogs } = useAccessLogs();

  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>(() => loadAuditCache());

  // Sync local cache on mount
  useEffect(() => {
    setAuditEntries(loadAuditCache());
  }, []);

  /** Log an access attempt with full replay protection. */
  const logAccessAttempt = useCallback(
    (params: {
      action: ComplianceAction;
      resource: string;
      outcome: "granted" | "denied";
      denialReason?: string;
      context?: string;
    }) => {
      if (!agentId || !address) return;

      const entry = createAuditEntry({
        agentId,
        viewer: address,
        action: params.action,
        resource: params.resource,
        outcome: params.outcome,
        denialReason: params.denialReason as any,
        context: params.context,
      });

      const updated = appendAuditEntry(entry);
      setAuditEntries(updated);
    },
    [agentId, address],
  );

  /** Download audit log as CSV. */
  const downloadAuditCsv = useCallback(() => {
    const blob = exportAuditAsCsv(auditEntries);
    const date = new Date().toISOString().split("T")[0];
    downloadBlob(blob, `ghostpay-audit-${date}.csv`);
  }, [auditEntries]);

  /** Download audit log as JSON. */
  const downloadAuditJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(auditEntries, null, 2)], {
      type: "application/json",
    });
    const date = new Date().toISOString().split("T")[0];
    downloadBlob(blob, `ghostpay-audit-${date}.json`);
  }, [auditEntries]);

  const granted = useMemo(() => auditEntries.filter(e => e.outcome === "granted"), [auditEntries]);
  const denied = useMemo(() => auditEntries.filter(e => e.outcome === "denied"), [auditEntries]);

  return {
    auditEntries,
    granted,
    denied,
    totalEntries: auditEntries.length,
    logAccessAttempt,
    downloadAuditCsv,
    downloadAuditJson,
  };
}

/**
 * Generate a comprehensive compliance report combining on-chain + local data.
 */
export function useComplianceReport() {
  const { agentId } = useAgent();
  const { validated: viewKeys, isPending: vkPending } = useViewKeyStatus();
  const { logs: onChainLogs, isPending: logsPending } = useAccessLogs();
  const { auditEntries } = useAuditTrail();

  const report = useMemo<ComplianceReport | null>(() => {
    if (vkPending || logsPending) return null;

    return generateComplianceReport({
      agentId,
      viewKeys,
      onChainLogs: onChainLogs.map(l => ({
        id: l.id,
        viewer: l.viewer,
        dataRef: l.dataRef,
        timestamp: l.timestamp,
        purpose: l.purpose,
      })),
      auditEntries,
    });
  }, [agentId, viewKeys, onChainLogs, auditEntries, vkPending, logsPending]);

  const downloadReport = useCallback(() => {
    if (!report) return;
    const blob = exportReportAsJson(report);
    const date = new Date().toISOString().split("T")[0];
    downloadBlob(blob, `ghostpay-compliance-report-${date}.json`);
  }, [report]);

  return { report, isPending: vkPending || logsPending, downloadReport };
}

/**
 * Track decrypt attempts with success/failure logging.
 */
export function useDecryptHistory() {
  const [history, setHistory] = useState<DecryptHistoryEntry[]>(() => loadDecryptHistory());

  // Sync on mount
  useEffect(() => {
    setHistory(loadDecryptHistory());
  }, []);

  const addEntry = useCallback((entry: DecryptHistoryEntry) => {
    recordDecryptAttempt(entry);
    setHistory(loadDecryptHistory());
  }, []);

  return { history, addEntry };
}
