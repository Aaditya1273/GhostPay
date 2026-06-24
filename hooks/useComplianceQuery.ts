import clientConfig from "@/config/clientConfig";
import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useCustomWallet } from "@/contexts/CustomWallet";

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
      refetchInterval: 15_000,
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
      refetchInterval: 15_000,
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
