import clientConfig from "@/config/clientConfig";
import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useCustomWallet } from "@/contexts/CustomWallet";
import { useEffect, useMemo, useState } from "react";
import {
  buildMemoryIndex,
  filterMemories,
  groupByCategory,
  searchMemories,
  getRecentMemories,
  fetchMemoryBlob,
  verifyBlobAvailability,
  fetchMemoryContents,
  type MemoryIndexItem,
  type MemoryFilter,
} from "@/lib/memoryIndex";
import {
  loadLocalMemories,
  type LocalMemoryRecord,
} from "@/lib/localMemoryStore";

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

/** Hook that returns parsed memory records for display.
 *
 * Merges two sources (in priority order):
 *  1. On-chain MemoryRecord objects (authoritative, deduplicated by blobId)
 *  2. localStorage fallback entries (shown when chain records are absent,
 *     e.g. because the Move contract is not deployed)
 */
export function useMemories() {
  const { data, isPending, error } = useMemoryRecordsQuery();

  // On-chain records
  const chainMemories: ParsedMemory[] =
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

  // localStorage fallback records (shown only if blobId is not already in chain)
  const chainBlobIds = new Set(chainMemories.map((m) => m.blobId));
  const localRecords: ParsedMemory[] = loadLocalMemories()
    .filter((r: LocalMemoryRecord) => !chainBlobIds.has(r.blobId))
    .map((r: LocalMemoryRecord) => ({
      id: r.id,
      seq: -1, // local records have no sequence number
      blobId: r.blobId,
      dataType: r.dataType,
      visibility: r.visibility,
      dataSize: r.dataSize,
      label: r.label,
      timestamp: r.timestamp,
      dateStr: formatMemoryTime(r.timestamp),
      sizeStr: formatDataSize(r.dataSize),
    }));

  // Merge: chain records first, then local-only records
  const memories = [...chainMemories, ...localRecords];

  // Sort by timestamp descending
  memories.sort((a, b) => b.timestamp - a.timestamp);

  return { memories, isPending, error, hasMemories: memories.length > 0 };
}

// ═════════════════════════════════════════════════════════════════════════════
//  Intelligent Memory Retrieval Hooks
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Build a deduplicated, categorized memory index from on-chain records.
 * Uses buildMemoryIndex() to group by category and deduplicate by blobId.
 */
export function useMemoryIndex() {
  const { memories, isPending, error } = useMemories();

  const index = useMemo<MemoryIndexItem[]>(() => {
    return buildMemoryIndex(memories);
  }, [memories]);

  // Group by category
  const byCategory = useMemo(() => groupByCategory(index), [index]);

  // Recent memories
  const recent = useMemo(() => getRecentMemories(index, 10), [index]);

  return { index, byCategory, recent, isPending, error, totalCount: index.length };
}

/**
 * Filter the memory index by the given criteria.
 * Re-computes whenever the filter or index changes.
 */
export function useMemoryFilter(
  index: MemoryIndexItem[],
  filter: MemoryFilter,
): MemoryIndexItem[] {
  return useMemo(() => filterMemories(index, filter), [index, filter]);
}

/**
 * Search memories by text query.
 */
export function useMemorySearch(index: MemoryIndexItem[], query: string) {
  return useMemo(() => searchMemories(index, query), [index, query]);
}

/**
 * Hook to fetch and cache Walrus blob content for a single memory record.
 * Automatically verifies blob availability before fetching.
 */
export function useMemoryBlobContent(blobId: string | undefined) {
  const [content, setContent] = useState<unknown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!blobId) {
      setContent(null);
      setAvailable(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // Step 1: Verify blob exists
        const exists = await verifyBlobAvailability(blobId);
        if (cancelled) return;
        setAvailable(exists);

        if (!exists) {
          setError("Blob not available on Walrus network");
          setContent(null);
          setLoading(false);
          return;
        }

        // Step 2: Fetch the blob content
        const data = await fetchMemoryBlob(blobId);
        if (!cancelled) {
          setContent(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch blob");
          setContent(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [blobId]);

  return { content, loading, error, available };
}

/**
 * Hook that fetches blob content for the N most recent memories.
 * Used by the agent engine to retrieve context before making decisions.
 */
export function useMemoryContentsForAgent(count: number = 5) {
  const { index, isPending } = useMemoryIndex();
  const [enriched, setEnriched] = useState<MemoryIndexItem[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);

  const recentItems = useMemo(() => index.slice(0, count), [index, count]);

  useEffect(() => {
    if (recentItems.length === 0 || isPending) return;

    let cancelled = false;

    const load = async () => {
      setLoadingContent(true);
      const result = await fetchMemoryContents(recentItems);
      if (!cancelled) {
        setEnriched(result);
        setLoadingContent(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [recentItems, isPending]);

  return {
    enriched,
    isPending: isPending || loadingContent,
  };
}
