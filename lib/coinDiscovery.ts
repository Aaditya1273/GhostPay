/**
 * coinDiscovery — Coin object discovery for DeepBook swaps.
 *
 * DeepBook V3 swaps require a Coin<T> input matching the pool's generic
 * type parameter. Since `tx.gas` is always Coin<SUI>, pools that need
 * Coin<DEEP> or Coin<DBUSDC> must use explicit coin objects.
 *
 * This module finds the right coins in the user's wallet so every pool
 * direction can execute with the correct generic type.
 *
 * ── Why this matters ───────────────────────────────────────────────
 * Previous code assumed `tx.splitCoins(tx.gas, ...)` works for every
 * pool. It only works when the input coin type is SUI. By discovering
 * the correct coin object on-chain and passing it explicitly, we:
 *   1. Enable all three pools (SUI_DBUSDC, DEEP_SUI, DEEP_DBUSDC).
 *   2. Enable sponsorship (tx.gas is never referenced directly).
 *   3. Validate viability before the user clicks Swap.
 */

import type { SuiClient } from "@mysten/sui/client";
import { SUI_COIN, DBUSDC_COIN, DEEP_COIN } from "@/lib/constants";

// ── Types ────────────────────────────────────────────────────────────────

/** A discovered coin that can be used as swap input. */
export interface DiscoveredCoin {
  /** The object ID of the coin (needs to be passed as tx.object(id)). */
  objectId: string;
  /** The full coin type (e.g. 0x2::sui::SUI). */
  coinType: string;
  /** Balance in the smallest unit (MIST, etc.). */
  balance: bigint;
}

/** Result of pool validation — tells the UI what's possible. */
export interface PoolValidation {
  /** Whether the pool can execute with the user's current wallet. */
  viable: boolean;
  /** The coin the user would sell. */
  sellCoinKey: string;
  /** The coin the user would receive. */
  buyCoinKey: string;
  /** Whether to use sellBase=true or sellBase=false for the swap call. */
  sellBase: boolean;
  /** The discovered coin to use as input (undefined if not viable). */
  coin?: DiscoveredCoin;
  /** Human-readable explanation of why the swap isn't viable. */
  reason?: string;
  /** Whether sponsorship is possible (true when tx.gas is NOT referenced). */
  sponsorable: boolean;
}

// ── Constants ───────────────────────────────────────────────────────────

/** Known coin types mapped to human-readable keys. */
export const COIN_TYPES: Record<string, string> = {
  SUI: SUI_COIN,
  DBUSDC: DBUSDC_COIN,
  DEEP: DEEP_COIN,
};

/** Map coin keys to their display labels. */
export const COIN_LABELS: Record<string, string> = {
  SUI: "SUI",
  DBUSDC: "USDC",
  DEEP: "DEEP",
};

/** Map coin keys to their decimal places. */
export const COIN_DECIMALS: Record<string, number> = {
  SUI: 9,
  DBUSDC: 6,
  DEEP: 9,
};

// ── Discovery ────────────────────────────────────────────────────────────

/**
 * Find the first coin of a given type owned by the address.
 *
 * Uses getCoins with limit=1 for efficiency — we only need one
 * coin object to use as input; the swap consumes from it via
 * splitCoins.
 */
export async function findFirstCoinByType(
  suiClient: SuiClient,
  owner: string,
  coinType: string,
): Promise<DiscoveredCoin | null> {
  try {
    const result = await suiClient.getCoins({
      owner,
      coinType,
      limit: 1,
    });

    const coin = result.data?.[0];
    if (!coin) return null;

    return {
      objectId: coin.coinObjectId,
      coinType: coin.coinType,
      balance: BigInt(coin.balance),
    };
  } catch {
    return null;
  }
}

/**
 * Get the total balance for a specific coin type (human-readable).
 */
export async function getCoinBalance(
  suiClient: SuiClient,
  owner: string,
  coinType: string,
): Promise<bigint> {
  try {
    const result = await suiClient.getBalance({ owner, coinType });
    return BigInt(result.totalBalance);
  } catch {
    return 0n;
  }
}

// ── Pool Validation ─────────────────────────────────────────────────────

/**
 * For a pool and direction, determine which coin type the user needs
 * to sell, and whether that coin is available in their wallet.
 *
 * Returns a PoolValidation that tells the UI and swap executor
 * exactly what to do.
 */
export async function validatePool(
  suiClient: SuiClient,
  owner: string,
  poolKey: string,
  direction: "sellBase" | "sellQuote",
): Promise<PoolValidation> {
  // ── Determine the required coin type from the pool and direction ─
  let requiredCoinKey: string;
  let sellBase: boolean;
  let sellCoinKey: string;
  let buyCoinKey: string;

  switch (poolKey) {
    case "SUI_DBUSDC":
      if (direction === "sellBase") {
        // sell SUI (base) → buy USDC (quote)
        requiredCoinKey = "SUI";
        sellBase = true;
        sellCoinKey = "SUI";
        buyCoinKey = "DBUSDC";
      } else {
        // sell USDC (quote) → buy SUI (base)
        requiredCoinKey = "DBUSDC";
        sellBase = false;
        sellCoinKey = "DBUSDC";
        buyCoinKey = "SUI";
      }
      break;

    case "DEEP_SUI":
      if (direction === "sellBase") {
        // sell DEEP (base) → buy SUI (quote)
        requiredCoinKey = "DEEP";
        sellBase = true;
        sellCoinKey = "DEEP";
        buyCoinKey = "SUI";
      } else {
        // sell SUI (quote) → buy DEEP (base)
        requiredCoinKey = "SUI";
        sellBase = false;
        sellCoinKey = "SUI";
        buyCoinKey = "DEEP";
      }
      break;

    case "DEEP_DBUSDC":
      if (direction === "sellBase") {
        // sell DEEP (base) → buy USDC (quote)
        requiredCoinKey = "DEEP";
        sellBase = true;
        sellCoinKey = "DEEP";
        buyCoinKey = "DBUSDC";
      } else {
        // sell USDC (quote) → buy DEEP (base)
        requiredCoinKey = "DBUSDC";
        sellBase = false;
        sellCoinKey = "DBUSDC";
        buyCoinKey = "DEEP";
      }
      break;

    default:
      return {
        viable: false,
        sellCoinKey: "UNKNOWN",
        buyCoinKey: "UNKNOWN",
        sellBase: true,
        sponsorable: false,
        reason: `Unknown pool: ${poolKey}`,
      };
  }

  const coinType = COIN_TYPES[requiredCoinKey];
  if (!coinType) {
    return {
      viable: false,
      sellCoinKey,
      buyCoinKey,
      sellBase,
      sponsorable: false,
      reason: `Unknown coin type: ${requiredCoinKey}`,
    };
  }

  // ── GhostPay strictly uses sponsored transactions, so we NEVER use tx.gas ─
  // We must always find an explicit coin object in the user's wallet, even for SUI.

  // ── For non-SUI coins, find the coin in the user's wallet ──────
  const coin = await findFirstCoinByType(suiClient, owner, coinType);
  if (!coin || coin.balance <= 0n) {
    return {
      viable: false,
      sellCoinKey,
      buyCoinKey,
      sellBase,
      sponsorable: true,
      reason: `No ${COIN_LABELS[requiredCoinKey]} tokens found in wallet. ` +
        `You need ${COIN_LABELS[requiredCoinKey]} to swap on ${poolKey}. ` +
        `Acquire ${COIN_LABELS[requiredCoinKey]} first, then try again.`,
    };
  }

  // ── Validate the coin has enough balance for the swap ──────────
  // (actual amount check happens in the swap handler)

  return {
    viable: true,
    sellCoinKey,
    buyCoinKey,
    sellBase,
    coin,
    sponsorable: true, // explicit coin → no tx.gas reference → can sponsor
    reason: `Using ${COIN_LABELS[requiredCoinKey]} coin ${coin.objectId.slice(0, 10)}...`,
  };
}
