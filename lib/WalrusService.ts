/**
 * WalrusService — HTTP-based blob upload/download via Walrus publisher & aggregator.
 *
 * Testnet endpoints (from official docs):
 *   Publisher:  https://publisher.walrus-testnet.walrus.space
 *   Aggregator: https://aggregator.walrus-testnet.walrus.space
 *
 * Upload:   PUT /v1/blobs?epochs=<n>&deletable=true
 * Download: GET /v1/blobs/<blobId>
 *
 * For production mainnet use, run a private publisher or use the
 * @mysten/walrus SDK with SuiGrpcClient + signer for full on-chain registration.
 */

import { WALRUS_PUBLISHER_URL, WALRUS_AGGREGATOR_URL } from "@/lib/constants";

const PUBLISHER_URL = WALRUS_PUBLISHER_URL;
const AGGREGATOR_URL = WALRUS_AGGREGATOR_URL;

// ── Retry helper ────────────────────────────────────────────────────────

/** Default retry config: 3 attempts, 1s initial backoff, 2x multiplier */
interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1_000,
  maxDelayMs: 10_000,
};

/**
 * Execute an async function with exponential backoff retry.
 * Only retries on network errors and 5xx server errors (not 4xx client errors).
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY,
  attempt: number = 1,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    // Don't retry 4xx client errors (bad request, not found, etc.)
    if (err instanceof Error && /4\d\d/.test(err.message)) {
      throw err;
    }
    if (attempt >= config.maxAttempts) {
      throw err;
    }
    // Exponential backoff with jitter
    const delay = Math.min(
      config.baseDelayMs * Math.pow(2, attempt - 1) * (0.5 + Math.random() * 0.5),
      config.maxDelayMs,
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
    return withRetry(fn, config, attempt + 1);
  }
}

export interface WalrusUploadResult {
  blobId: string;
  blobObjectId?: string;
  storedForEpoch?: number;
}

export interface WalrusAlreadyCertified {
  blobId: string;
  event: {
    txDigest: string;
    eventSeq: string;
  };
}

/**
 * Upload raw bytes to Walrus via the HTTP publisher API.
 *
 * @param data - The raw bytes to upload
 * @param epochs - Number of epochs to store (default 1)
 * @param deletable - Whether the blob should be deletable (default true)
 * @returns The blob ID and optional blob object ID
 */
export async function uploadToWalrus(
  data: Uint8Array | Blob,
  epochs: number = 1,
  deletable: boolean = true,
): Promise<WalrusUploadResult> {
  const url = `${PUBLISHER_URL}/v1/blobs?epochs=${epochs}&deletable=${deletable}`;

  return withRetry(async () => {
    const body = data instanceof Blob ? data : new Blob([data as BlobPart]);
    const response = await fetch(url, {
      method: "PUT",
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Walrus upload failed (${response.status}): ${text}`);
    }

    const result = await response.json();

    // Response can be either newlyCreated or alreadyCertified
    if (result.newlyCreated) {
      return {
        blobId: result.newlyCreated.blobObject.blobId,
        blobObjectId: result.newlyCreated.blobObject.id,
        storedForEpoch: result.newlyCreated.blobObject.storage?.endEpoch,
      };
    }

    if (result.alreadyCertified) {
      return {
        blobId: result.alreadyCertified.blobId,
      };
    }

    // Fallback for other response shapes
    return {
      blobId: result.blobId,
    };
  });
}

/**
 * Download a blob from Walrus via the HTTP aggregator API.
 * Returns the raw bytes and content type.
 */
export async function downloadFromWalrus(
  blobId: string,
): Promise<{ data: Uint8Array; contentType: string }> {
  const url = `${AGGREGATOR_URL}/v1/blobs/${blobId}`;

  return withRetry(async () => {
    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Walrus download failed (${response.status}): ${text}`);
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const buffer = await response.arrayBuffer();

    return {
      data: new Uint8Array(buffer),
      contentType,
    };
  });
}

/**
 * Check if a blob exists and is available on the Walrus network.
 */
export async function checkBlobStatus(
  blobId: string,
): Promise<{ available: boolean; endEpoch?: number }> {
  try {
    const url = `${AGGREGATOR_URL}/v1/blobs/${blobId}`;
    const response = await fetch(url, {
      headers: { Range: "bytes=0-0" },
    });

    if (response.ok || response.status === 206) {
      return { available: true };
    }
    return { available: false };
  } catch {
    return { available: false };
  }
}

/**
 * Get the aggregator URL for a given blob ID (for display/download links).
 */
export function getBlobUrl(blobId: string): string {
  return `${AGGREGATOR_URL}/v1/blobs/${blobId}`;
}
