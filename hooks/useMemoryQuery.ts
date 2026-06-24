import clientConfig from "@/config/clientConfig";
import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useCustomWallet } from "@/contexts/CustomWallet";

const isPackageDeployed = !!(
  clientConfig.PACKAGE_ID && clientConfig.PACKAGE_ID !== "0x0"
);

export interface MemoryRecordFields {
  id: { id: string };
  seq: string;
  blob_id: string;
  data_type: string;
  timestamp: string;
  visibility: string;
  data_size: string;
  label: string;
}

/** Query the user's MemoryRecord objects from the chain */
export function useMemoryRecordsQuery() {
  const { address } = useCustomWallet();

  return useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: address!,
      filter: {
        StructType: `${clientConfig.PACKAGE_ID}::memory::MemoryRecord`,
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

export interface ParsedMemory {
  id: string;
  seq: number;
  blobId: string;
  dataType: string;
  visibility: string;
  dataSize: number;
  label: string;
  timestamp: number;
  dateStr: string;
  sizeStr: string;
}

function formatMemoryTime(timestampMs: number): string {
  const now = Date.now();
  const diff = now - timestampMs;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hour ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)} days ago`;
  return new Date(timestampMs).toLocaleDateString();
}

function formatDataSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Hook that returns parsed memory records for display */
export function useMemories() {
  const { data, isPending, error } = useMemoryRecordsQuery();

  const memories: ParsedMemory[] =
    data?.data
      ?.map((obj) => {
        const fields = obj.data?.content as
          | { dataType: "moveObject"; fields: MemoryRecordFields }
          | undefined;
        if (!fields?.fields) return null;
        const f = fields.fields;
        return {
          id: f.id.id,
          seq: Number(f.seq),
          blobId: f.blob_id,
          dataType: f.data_type,
          visibility: f.visibility,
          dataSize: Number(f.data_size),
          label: f.label,
          timestamp: Number(f.timestamp),
          dateStr: formatMemoryTime(Number(f.timestamp)),
          sizeStr: formatDataSize(Number(f.data_size)),
        };
      })
      .filter((m): m is ParsedMemory => m !== null) ?? [];

  // Sort by timestamp descending
  memories.sort((a, b) => b.timestamp - a.timestamp);

  return { memories, isPending, error, hasMemories: memories.length > 0 };
}
