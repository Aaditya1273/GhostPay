/**
 * memoryIndex — Intelligent Walrus memory retrieval for GhostPay.
 *
 * Provides semantic indexing, metadata filtering, blob verification,
 * deduplication, orphan detection/repair, and categorized memory search.
 *
 * ── Categories ────────────────────────────────────────────────────
 * Memories are classified by their `data_type` field:
 *   swap_receipt    → Payment
 *   auto_remittance → Payment
 *   agent_reasoning → Agent
 *   agent_preference→ Agent
 *   compliance      → Compliance
 *   view_key        → Compliance
 *   (default)       → General
 *
 * ── No duplicate blobs ───────────────────────────────────────────
 * Deduplication is by blobId — if a memory record references a blob
 * that already exists in the index, only the most recent record is kept.
 *
 * ── No orphan records ────────────────────────────────────────────
 * `findOrphanRecords()` compares all memory records against Walrus blob
 * availability. Records whose blobs don't exist can be repaired or deleted.
 */

import { downloadFromWalrus, checkBlobStatus, uploadToWalrus } from "./WalrusService";

// ══════════════════════════════════════════════════════════════════════════
//  Types
// ══════════════════════════════════════════════════════════════════════════

/** Memory categories for grouping and filtering. */
export type MemoryCategory = "payment" | "compliance" | "agent" | "general";

/** A memory record enriched with its parsed Walrus content. */
export interface MemoryIndexItem {
  /** On-chain MemoryRecord object ID. */
  id: string;
  /** Sequential ID within the agent. */
  seq: number;
  /** Walrus blob ID. */
  blobId: string;
  /** On-chain data type classification. */
  dataType: string;
  /** On-chain timestamp (ms). */
  timestamp: number;
  /** On-chain visibility. */
  visibility: string;
  /** On-chain data size. */
  dataSize: number;
  /** On-chain label. */
  label: string;
  /** Assigned category. */
  category: MemoryCategory;
  /** Parsed content from Walrus (lazy-loaded, undefined until fetched). */
  content?: unknown;
  /** Whether the Walrus blob was verified as available. */
  blobAvailable?: boolean;
}

/** Search/filter parameters. */
export interface MemoryFilter {
  categories?: MemoryCategory[];
  dataTypes?: string[];
  dateFrom?: number;
  dateTo?: number;
  searchText?: string;
  limit?: number;
  offset?: number;
}

/** Result of orphan detection. */
export interface OrphanRecord {
  memoryId: string;
  seq: number;
  blobId: string;
  dataType: string;
  label: string;
  timestamp: number;
}

/** Result of an orphan repair attempt. */
export interface OrphanRepairResult {
  memoryId: string;
  action: "deleted" | "reuploaded" | "verified" | "skipped";
  error?: string;
}

// ══════════════════════════════════════════════════════════════════════════
//  Category Mapping
// ══════════════════════════════════════════════════════════════════════════

/** Map on-chain data_type values to memory categories. */
const DATA_TYPE_CATEGORY: Record<string, MemoryCategory> = {
  swap_receipt: "payment",
  auto_remittance: "payment",
  payment_receipt: "payment",
  agent_reasoning: "agent",
  agent_preference: "agent",
  compliance: "compliance",
  view_key: "compliance",
  access_log: "compliance",
};

const DEFAULT_CATEGORY: MemoryCategory = "general";

/**
 * Assign a memory category based on the on-chain data_type.
 */
export function categorizeDataType(dataType: string): MemoryCategory {
  return DATA_TYPE_CATEGORY[dataType] ?? DEFAULT_CATEGORY;
}

// ══════════════════════════════════════════════════════════════════════════
//  Index Building
// ══════════════════════════════════════════════════════════════════════════

/**
 * Build a MemoryIndexItem array from raw ParsedMemory data.
 * Deduplicates by blobId — only the most recent record per blobId is kept.
 */
export function buildMemoryIndex(
  records: Array<{
    id: string;
    seq: number;
    blobId: string;
    dataType: string;
    timestamp: number;
    visibility: string;
    dataSize: number;
    label: string;
  }>,
): MemoryIndexItem[] {
  // Deduplicate by blobId — keep most recent
  const seen = new Map<string, MemoryIndexItem>();
  // Sort by timestamp ascending so later entries overwrite with newer
  const sorted = [...records].sort((a, b) => a.timestamp - b.timestamp);

  for (const r of sorted) {
    seen.set(r.blobId, {
      id: r.id,
      seq: r.seq,
      blobId: r.blobId,
      dataType: r.dataType,
      timestamp: r.timestamp,
      visibility: r.visibility,
      dataSize: r.dataSize,
      label: r.label,
      category: categorizeDataType(r.dataType),
    });
  }

  // Return sorted by timestamp descending (most recent first)
  return [...seen.values()].sort((a, b) => b.timestamp - a.timestamp);
}

// ══════════════════════════════════════════════════════════════════════════
//  Filtering & Search
// ══════════════════════════════════════════════════════════════════════════

/**
 * Filter a memory index by the given criteria.
 * All filters are AND-combined (record must match every provided filter).
 */
export function filterMemories(
  index: MemoryIndexItem[],
  filter: MemoryFilter,
): MemoryIndexItem[] {
  let results = [...index];

  // Filter by category
  if (filter.categories && filter.categories.length > 0) {
    results = results.filter(m => filter.categories!.includes(m.category));
  }

  // Filter by data type
  if (filter.dataTypes && filter.dataTypes.length > 0) {
    results = results.filter(m => filter.dataTypes!.includes(m.dataType));
  }

  // Filter by date range
  if (filter.dateFrom !== undefined) {
    results = results.filter(m => m.timestamp >= filter.dateFrom!);
  }
  if (filter.dateTo !== undefined) {
    results = results.filter(m => m.timestamp <= filter.dateTo!);
  }

  // Filter by search text (searches label, dataType, and blobId)
  if (filter.searchText) {
    const q = filter.searchText.toLowerCase();
    results = results.filter(
      m =>
        m.label.toLowerCase().includes(q) ||
        m.dataType.toLowerCase().includes(q) ||
        m.blobId.toLowerCase().includes(q),
    );
  }

  // Apply pagination
  const offset = filter.offset ?? 0;
  const limit = filter.limit ?? results.length;
  results = results.slice(offset, offset + limit);

  return results;
}

/**
 * Get memories grouped by category.
 * Returns a map of category → MemoryIndexItem[].
 */
export function groupByCategory(
  index: MemoryIndexItem[],
): Record<MemoryCategory, MemoryIndexItem[]> {
  const grouped: Record<string, MemoryIndexItem[]> = {
    payment: [],
    compliance: [],
    agent: [],
    general: [],
  };

  for (const item of index) {
    const cat = item.category;
    if (grouped[cat]) {
      grouped[cat].push(item);
    } else {
      grouped.general.push(item);
    }
  }

  return grouped as Record<MemoryCategory, MemoryIndexItem[]>;
}

/**
 * Get the most recent N memories.
 */
export function getRecentMemories(
  index: MemoryIndexItem[],
  count: number = 10,
): MemoryIndexItem[] {
  return [...index].sort((a, b) => b.timestamp - a.timestamp).slice(0, count);
}

/**
 * Search memory labels and text content (after fetching blobs).
 * Returns matching items that either have content matching the query,
 * or label/dataType matching.
 */
export function searchMemories(
  index: MemoryIndexItem[],
  query: string,
): MemoryIndexItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return [...index];

  return index.filter(m => {
    // Label match
    if (m.label.toLowerCase().includes(q)) return true;
    // Data type match
    if (m.dataType.toLowerCase().includes(q)) return true;
    // Blob ID prefix match
    if (m.blobId.toLowerCase().startsWith(q)) return true;
    // Content match (if loaded)
    if (m.content !== undefined) {
      const contentStr = JSON.stringify(m.content).toLowerCase();
      if (contentStr.includes(q)) return true;
    }
    return false;
  });
}

// ══════════════════════════════════════════════════════════════════════════
//  Blob Operations
// ══════════════════════════════════════════════════════════════════════════

/**
 * Fetch and parse the Walrus blob content for a memory record.
 * Returns the parsed JSON content, or the raw string if not JSON.
 */
export async function fetchMemoryBlob(
  blobId: string,
): Promise<unknown> {
  const { data } = await downloadFromWalrus(blobId);
  const text = new TextDecoder().decode(data);

  // Try to parse as JSON
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Verify a blob exists on the Walrus network.
 * Returns true if the blob is available.
 */
export async function verifyBlobAvailability(
  blobId: string,
): Promise<boolean> {
  const { available } = await checkBlobStatus(blobId);
  return available;
}

/**
 * Verify all blobs in a memory index in parallel.
 * Returns an updated index with blobAvailable flags set.
 */
export async function verifyAllBlobs(
  index: MemoryIndexItem[],
): Promise<MemoryIndexItem[]> {
  const results = await Promise.allSettled(
    index.map(async item => {
      const available = await verifyBlobAvailability(item.blobId);
      return { ...item, blobAvailable: available };
    }),
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    // If verification failed, mark as potentially unavailable
    return { ...index[i], blobAvailable: false };
  });
}

// ══════════════════════════════════════════════════════════════════════════
//  Orphan Detection & Repair
// ══════════════════════════════════════════════════════════════════════════

/**
 * Find memory records whose Walrus blobs are not available.
 * These are "orphan records" — on-chain references to blobs that
 * may have expired or were deleted.
 */
export async function findOrphanRecords(
  index: MemoryIndexItem[],
): Promise<OrphanRecord[]> {
  const orphans: OrphanRecord[] = [];
  const batchSize = 10;

  // Check in batches to avoid overwhelming the aggregator
  for (let i = 0; i < index.length; i += batchSize) {
    const batch = index.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async item => {
        const available = await verifyBlobAvailability(item.blobId);
        return { item, available };
      }),
    );

    for (const result of results) {
      if (result.status === "fulfilled" && !result.value.available) {
        const item = result.value.item;
        orphans.push({
          memoryId: item.id,
          seq: item.seq,
          blobId: item.blobId,
          dataType: item.dataType,
          label: item.label,
          timestamp: item.timestamp,
        });
      }
    }
  }

  return orphans;
}

/**
 * Attempt to repair orphan records.
 *
 * For each orphan, the function will:
 *   1. Try to re-verify the blob (it may have been a transient error).
 *   2. If still unavailable, mark it as an orphan for cleanup.
 *
 * Deletion of orphan records must happen on-chain (via contract upgrade).
 * This function only reports and marks them for the UI.
 */
export async function repairOrphanRecords(
  orphans: OrphanRecord[],
): Promise<OrphanRepairResult[]> {
  const results: OrphanRepairResult[] = [];

  for (const orphan of orphans) {
    try {
      // Re-verify with a fresh check
      const available = await verifyBlobAvailability(orphan.blobId);

      if (available) {
        // Transient error — blob is actually available
        results.push({
          memoryId: orphan.memoryId,
          action: "verified",
        });
      } else {
        // Blob is truly gone — mark as unrecoverable
        results.push({
          memoryId: orphan.memoryId,
          action: "skipped",
          error: "Blob permanently unavailable on Walrus network. On-chain record requires contract upgrade to delete.",
        });
      }
    } catch (err) {
      results.push({
        memoryId: orphan.memoryId,
        action: "skipped",
        error: err instanceof Error ? err.message : "Verification failed",
      });
    }
  }

  return results;
}

/**
 * Re-upload a memory record's content to Walrus and return the new blob ID.
 * This can be used to repair a corrupted reference by creating a new blob
 * and updating the on-chain record.
 */
export async function reuploadMemoryBlob(
  originalBlobId: string,
  fallbackData?: Uint8Array,
): Promise<{ newBlobId: string; restored: boolean }> {
  if (fallbackData) {
    // If we have the data, re-upload it
    const result = await uploadToWalrus(fallbackData, 30, false);
    return { newBlobId: result.blobId, restored: true };
  }

  // Try to download the original blob first
  try {
    const { data } = await downloadFromWalrus(originalBlobId);
    const result = await uploadToWalrus(data, 30, false);
    return { newBlobId: result.blobId, restored: true };
  } catch {
    // Original blob is gone and no fallback data provided
    return { newBlobId: "", restored: false };
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  Bulk Fetching
// ══════════════════════════════════════════════════════════════════════════

/**
 * Fetch blob content for multiple memory records in parallel.
 * Returns a new index with content populated.
 */
export async function fetchMemoryContents(
  index: MemoryIndexItem[],
  limit?: number,
): Promise<MemoryIndexItem[]> {
  const items = limit ? index.slice(0, limit) : index;

  const results = await Promise.allSettled(
    items.map(async item => {
      try {
        const content = await fetchMemoryBlob(item.blobId);
        return { ...item, content };
      } catch {
        // Content fetch failed — return item without content
        return item;
      }
    }),
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return items[i];
  });
}
