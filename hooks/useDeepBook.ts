"use client";

import { useState, useCallback } from "react";
import { useCustomWallet } from "@/contexts/CustomWallet";
import {
  buildSwapTx,
  type PoolOption,
} from "@/lib/DeepBookService";

export function useDeepBook() {
  const { address, executeTransactionBlockWithoutSponsorship } =
    useCustomWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Execute a swap on DeepBook V3.
   *
   * @param pool - The pool to swap on
   * @param sellAmount - Amount to sell (in smallest unit, e.g. MIST)
   * @param minBuyAmount - Minimum amount to receive (slippage protection, smallest unit)
   * @param sellBase - true: sell BASE → buy QUOTE; false: sell QUOTE → buy BASE
   * @returns Transaction digest
   */
  const executeSwap = useCallback(
    async (
      pool: PoolOption,
      sellAmount: bigint,
      minBuyAmount: bigint,
      sellBase: boolean,
    ): Promise<string> => {
      if (!address) throw new Error("Wallet not connected");

      setLoading(true);
      setError(null);

      try {
        const tx = buildSwapTx(pool, sellAmount, minBuyAmount, sellBase);

        const result = await executeTransactionBlockWithoutSponsorship({
          tx,
          options: {
            showEffects: true,
            showEvents: true,
            showBalanceChanges: true,
          },
        });

        if (!result?.digest) {
          throw new Error("Transaction failed — no digest returned");
        }

        // Check effects for success
        const status = result.effects?.status?.status;
        if (status === "failure") {
          const errMsg = result.effects?.status?.error || "Unknown error";
          throw new Error(`Swap failed: ${errMsg}`);
        }

        setLoading(false);
        return result.digest;
      } catch (err: any) {
        const msg = err?.message || "Swap execution failed";
        setError(msg);
        setLoading(false);
        throw err;
      }
    },
    [address, executeTransactionBlockWithoutSponsorship],
  );

  return {
    loading,
    error,
    executeSwap,
  };
}
