"use client";

import { useState, useCallback } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import type { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { useCustomWallet } from "@/contexts/CustomWallet";
import { useAgent } from "./useAgentQuery";
import { useMemoryTransaction } from "./useMemoryTransaction";
import { uploadToWalrus } from "@/lib/WalrusService";
import {
  buildSwapTx,
  getSwapQuote,
  getRequiredCoinKey,
  canUseGasCoin,
  type PoolOption,
} from "@/lib/DeepBookService";
import {
  validatePool,
  findFirstCoinByType,
  COIN_TYPES,
  COIN_LABELS,
  COIN_DECIMALS,
  type PoolValidation,
  type DiscoveredCoin,
} from "@/lib/coinDiscovery";
import { DEEPBOOK_PACKAGE_ID } from "@/lib/constants";

// ── Types ────────────────────────────────────────────────────────────────

export interface SwapReceipt {
  poolKey: string;
  sellAsset: string;
  buyAsset: string;
  sellAmount: string;
  buyAmount: string;
  digest: string;
  timestamp: number;
}

export interface PoolViability {
  /** Whether the pool can execute with the user's current wallet. */
  viable: boolean;
  /** The coin the user sells. */
  sellAsset: string;
  /** The coin the user receives. */
  buyAsset: string;
  /** Whether to sell base → quote (true) or quote → base (false). */
  sellBase: boolean;
  /** Human-readable explanation. */
  message: string;
  /** Whether sponsorship is possible. */
  sponsorable: boolean;
}

// ── Hook ─────────────────────────────────────────────────────────────────

export function useDeepBook() {
  const suiClient = useSuiClient();
  const { address, sponsorAndExecuteTransactionBlock } =
    useCustomWallet();
  const { agentId } = useAgent();
  const { storeMemory } = useMemoryTransaction();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastReceipt, setLastReceipt] = useState<SwapReceipt | null>(null);

  /**
   * Check if a pool direction is viable given the user's wallet.
   * Returns which asset they'd sell/buy and whether it can execute.
   *
   * This is called by the UI BEFORE the user clicks Swap to
   * prevent invalid swaps and show clear guidance.
   */
  const checkPoolViability = useCallback(
    async (
      pool: PoolOption,
      sellBase: boolean,
    ): Promise<PoolViability> => {
      if (!address) {
        return {
          viable: false,
          sellAsset: sellBase ? pool.sellAsset : pool.buyAsset,
          buyAsset: sellBase ? pool.buyAsset : pool.sellAsset,
          sellBase,
          sponsorable: false,
          message: "Wallet not connected",
        };
      }

      const validation = await validatePool(suiClient, address, pool.key, sellBase ? "sellBase" : "sellQuote");

      return {
        viable: validation.viable,
        sellAsset: validation.sellCoinKey,
        buyAsset: validation.buyCoinKey,
        sellBase: validation.sellBase,
        sponsorable: validation.sponsorable,
        message: validation.reason || "Swap ready",
      };
    },
    [address, suiClient],
  );

  /**
   * Execute a swap on DeepBook V3.
   *
   * Automatically discovers the correct Coin<T> from the user's wallet.
   * Uses sponsorship whenever the input is NOT the gas coin.
   * Stores a swap receipt on Walrus + on-chain after success.
   *
   * @param pool        The pool to swap on
   * @param sellAmount  Amount to sell (smallest unit)
   * @param minBuyAmount  Minimum to receive (slippage, smallest unit)
   * @param sellBase    true: sell BASE → buy QUOTE; false: sell QUOTE → buy BASE
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
      setLastReceipt(null);

      try {
        // ── Step 1: Determine required coin and discover it ─────
        const requiredCoinKey = getRequiredCoinKey(pool, sellBase);
        // Under Enoki sponsorship, the gas coin belongs to the sponsor.
        // We can NEVER use tx.gas as an argument to splitCoins for swapping.
        // We must ALWAYS find a specific coin object from the user's wallet.
        const useGas = false; // Force fetching a specific coin object for SUI too

        let discoveredCoin: DiscoveredCoin | null = null;

        if (!useGas) {
          // Need to find a specific coin object
          const coinType = COIN_TYPES[requiredCoinKey];
          if (!coinType) {
            throw new Error(`Unknown coin type: ${requiredCoinKey}`);
          }
          discoveredCoin = await findFirstCoinByType(suiClient, address, coinType);
          if (!discoveredCoin || discoveredCoin.balance <= 0n) {
            throw new Error(
              `No ${COIN_LABELS[requiredCoinKey]} tokens found. ` +
              `Send ${COIN_LABELS[requiredCoinKey]} to your wallet first.`,
            );
          }
          if (discoveredCoin.balance < sellAmount) {
            const label = COIN_LABELS[requiredCoinKey] || requiredCoinKey;
            const decimals = COIN_DECIMALS[requiredCoinKey] || 9;
            const have = Number(discoveredCoin.balance) / 10 ** decimals;
            const need = Number(sellAmount) / 10 ** decimals;
            throw new Error(
              `Insufficient ${label} balance. ` +
              `You have ${have.toFixed(4)} ${label} but need ${need.toFixed(4)}.`,
            );
          }
        }

        // ── Step 2: Get a real quote for the user to review ────
        // (The UI typically calls getSwapQuote separately, but we
        //  do another devInspect here to validate the pool is live.)
        const expectedOut = await getSwapQuote(
          suiClient,
          address,
          pool,
          sellAmount,
          sellBase,
        );
        if (expectedOut === 0n) {
          throw new Error(
            "Swap quote returned 0 — the pool may be empty or the swap " +
            "direction may not be supported. Try a smaller amount.",
          );
        }

        console.log("[GhostPay] Discovered coin:", discoveredCoin);
        
        // ── Step 3: Build the transaction ──────────────────────
        const tx = buildSwapTx(
          pool,
          sellAmount,
          minBuyAmount,
          sellBase,
          address,
          discoveredCoin?.objectId, // undefined = use gas (only for SUI)
        );
        
        console.log("[GhostPay] Built Swap TX.");

        // ── Step 4: Execute via backend sponsor ───────────────────────────
        // Always use backend sponsorship so the user's zkLogin wallet
        // does not need to hold gas for any swap direction.
        let digest: string;
        let swapResponse: SuiTransactionBlockResponse;

        swapResponse = await sponsorAndExecuteTransactionBlock({
          tx,
          network: "testnet",
          includesTransferTx: true,
          allowedAddresses: [address],
          allowedMoveCallTargets: [
            `${DEEPBOOK_PACKAGE_ID}::pool::swap_exact_base_for_quote`,
            `${DEEPBOOK_PACKAGE_ID}::pool::swap_exact_quote_for_base`,
            "0x2::coin::zero",
          ],
          options: {
            showEffects: true,
            showEvents: true,
            showBalanceChanges: true,
          },
        });
        digest = swapResponse.digest;
        if (!digest) throw new Error("Sponsored swap returned no digest");

        const swapStatus = swapResponse.effects?.status?.status;
        if (swapStatus === "failure") {
          throw new Error(
            `Swap failed: ${swapResponse.effects?.status?.error || "Unknown error"}`,
          );
        }

        // ── Step 5: Parse the output amount from balance changes ──
        const outputCoinType = sellBase ? pool.quoteType : pool.baseType;
        let buyAmount = "0";
        for (const bc of swapResponse.balanceChanges ?? []) {
          const amount = BigInt(bc.amount);
          if (amount > 0n && bc.coinType === outputCoinType) {
            buyAmount = bc.amount;
            break;
          }
        }

        // ── Step 6: Store swap receipt on Walrus + on-chain ──────
        const receipt: SwapReceipt = {
          poolKey: pool.key,
          sellAsset: sellBase ? pool.sellAsset : pool.buyAsset,
          buyAsset: sellBase ? pool.buyAsset : pool.sellAsset,
          sellAmount: sellAmount.toString(),
          buyAmount,
          digest,
          timestamp: Date.now(),
        };

        try {
          // Upload receipt to Walrus (async — don't block return on failure)
          const receiptStr = JSON.stringify({
            type: "swap_receipt",
            version: 1,
            network: "testnet",
            ...receipt,
          });
          const encoder = new TextEncoder();
          const receiptBytes = encoder.encode(receiptStr);
          const walrusResult = await uploadToWalrus(receiptBytes, 30, false);

          // Store on-chain memory record (if agent exists)
          if (agentId) {
            await storeMemory(
              agentId,
              walrusResult.blobId,
              "swap_receipt",
              receiptBytes.length,
              false, // public — swap receipts are audit data
              `Swap ${receipt.sellAsset} → ${receipt.buyAsset} (${digest.slice(0, 10)}...)`,
            );
          }
        } catch (storeErr) {
          // Non-critical — swap succeeded, receipt storage is best-effort
          console.warn("Swap receipt storage failed:", storeErr);
        }

        setLastReceipt(receipt);
        setLoading(false);
        return digest;
      } catch (err: any) {
        const msg = err?.message || "Swap execution failed";
        setError(msg);
        setLoading(false);
        throw err;
      }
    },
    [
      address,
      agentId,
      suiClient,
      sponsorAndExecuteTransactionBlock,
      storeMemory,
    ],
  );

  return {
    loading,
    error,
    lastReceipt,
    executeSwap,
    checkPoolViability,
  };
}
