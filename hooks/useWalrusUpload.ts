/**
 * useWalrusUpload — Hook that orchestrates:
 *   1. Encrypt file data with SEAL
 *   2. Upload encrypted data to Walrus
 *   3. Store the blob ID on-chain via the memory contract
 *
 * Returns loading state, progress, and error handling for each step.
 */

import { useState, useCallback } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { encryptWithSeal } from "@/lib/SealService";
import { uploadToWalrus } from "@/lib/WalrusService";
import { useMemoryTransaction } from "@/hooks/useMemoryTransaction";
import { useCustomWallet } from "@/contexts/CustomWallet";

export type UploadStep =
  | "idle"
  | "encrypting"
  | "uploading"
  | "storing"
  | "done"
  | "error";

export interface UploadState {
  step: UploadStep;
  progress: number; // 0–100
  error: string | null;
  result: {
    blobId: string | null;
    memoryRecordId: string | null;
  };
}

interface UploadOptions {
  /** The raw bytes to upload */
  data: Uint8Array;
  /** The MIME type of the data */
  dataType: string;
  /** Display label for the memory record */
  label: string;
  /** The Sui agent object ID that owns the memory */
  agentId: string;
  /** Whether the memory should be private (encrypted) or public */
  isPrivate?: boolean;
}

export function useWalrusUpload() {
  const suiClient = useSuiClient();
  const { address } = useCustomWallet();
  const { storeMemory } = useMemoryTransaction();
  const [state, setState] = useState<UploadState>({
    step: "idle",
    progress: 0,
    error: null,
    result: { blobId: null, memoryRecordId: null },
  });

  const upload = useCallback(
    async (options: UploadOptions) => {
      const { data, dataType, label, agentId, isPrivate = true } = options;

      setState({
        step: "encrypting",
        progress: 10,
        error: null,
        result: { blobId: null, memoryRecordId: null },
      });

      try {
        // ── Step 1: SEAL encrypt ──────────────────────────────────────────
        let dataToUpload = data;

        if (isPrivate && address) {
          setState((prev) => ({
            ...prev,
            step: "encrypting" as const,
            progress: 20,
          }));

          const { encryptedObject } = await encryptWithSeal(
            { suiClient },
            data,
            address,
          );
          dataToUpload = encryptedObject;
        }

        // ── Step 2: Upload to Walrus ──────────────────────────────────────
        setState((prev) => ({
          ...prev,
          step: "uploading" as const,
          progress: 40,
        }));

        const uploadResult = await uploadToWalrus(dataToUpload, 1, true);

        setState((prev) => ({
          ...prev,
          progress: 70,
        }));

        // ── Step 3: Store blob ID on-chain ────────────────────────────────
        setState((prev) => ({
          ...prev,
          step: "storing" as const,
          progress: 80,
        }));

        const size = data.length;

        const txResponse = await storeMemory(
          agentId,
          uploadResult.blobId,
          dataType,
          size,
          isPrivate,
          label,
        );

        // Extract the created MemoryRecord object ID from the tx effects
        const createdObj = txResponse.effects?.created?.[0];
        const memoryRecordId = createdObj?.reference?.objectId ?? null;

        setState({
          step: "done",
          progress: 100,
          error: null,
          result: {
            blobId: uploadResult.blobId,
            memoryRecordId,
          },
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown upload error";
        setState({
          step: "error",
          progress: 0,
          error: message,
          result: { blobId: null, memoryRecordId: null },
        });
      }
    },
    [suiClient, address, storeMemory],
  );

  const reset = useCallback(() => {
    setState({
      step: "idle",
      progress: 0,
      error: null,
      result: { blobId: null, memoryRecordId: null },
    });
  }, []);

  return { state, upload, reset };
}
