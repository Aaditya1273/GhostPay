/**
 * DeepBookService — DeepBook V3 integration for GhostPay.
 *
 * Uses raw @mysten/sui Transaction building (no deepbook-v3 SDK dependency)
 * to call DeepBook V3's pool::swap_exact_* functions on Sui Testnet.
 *
 * Pool Ordering (from on-chain pool config):
 *   SUI_DBUSDC: base=SUI, quote=DBUSDC
 *   DEEP_SUI:   base=DEEP, quote=SUI
 *   DEEP_DBUSDC: base=DEEP, quote=DBUSDC
 *
 * swap_exact_quote_for_base<Base, Quote> — Sells QUOTE to buy BASE
 * swap_exact_base_for_quote<Base, Quote> — Sells BASE to buy QUOTE
 */

import { Transaction } from "@mysten/sui/transactions";

export interface PoolOption {
  key: string;
  label: string;
  /** Pool ID on testnet */
  poolId: string;
  /** The on-chain BaseType of the pool */
  baseCoinKey: string;
  /** The on-chain QuoteType of the pool */
  quoteCoinKey: string;
  baseType: string;
  quoteType: string;
  /** Display label for the asset the user sells */
  sellAsset: string;
  /** Display label for the asset the user receives */
  buyAsset: string;
  decimals: number;
}

// ── Constants ──────────────────────────────────────────────────────────

/** DeepBook V3 Testnet Package ID (from SDK constants) */
export const DEEPBOOK_PACKAGE_ID =
  "0x22be4cade64bf2d02412c7e8d0e8beea2f78828b948118d46735315409371a3c";

/** Coin Types */
export const SUI_COIN =
  "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI";
export const DBUSDC_COIN =
  "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN";
export const DEEP_COIN =
  "0x36dbef866a1d62bf7328989a10fb2f07d769f4ee587c0de4a0a256e57e0a58a8::deep::DEEP";

/** Sui Clock object ID */
const CLOCK_ID = "0x6";

/** Pool definitions — each maps to a DeepBook V3 pool on testnet */
export const POOLS: Record<string, PoolOption> = {
  SUI_DBUSDC: {
    key: "SUI_DBUSDC",
    label: "SUI / USDC",
    poolId: "0x1c19362ca52b8ffd7a33cee805a67d40f31e6ba303753fd3a4cfdfacea7163a5",
    baseCoinKey: "SUI",
    quoteCoinKey: "DBUSDC",
    baseType: SUI_COIN,
    quoteType: DBUSDC_COIN,
    sellAsset: "SUI",
    buyAsset: "USDC",
    decimals: 9,
  },
  DEEP_SUI: {
    key: "DEEP_SUI",
    label: "DEEP / SUI",
    poolId: "0x48c95963e9eac37a316b7ae04a0deb761bcdcc2b67912374d6036e7f0e9bae9f",
    baseCoinKey: "DEEP",
    quoteCoinKey: "SUI",
    baseType: DEEP_COIN,
    quoteType: SUI_COIN,
    sellAsset: "DEEP",
    buyAsset: "SUI",
    decimals: 9,
  },
  DEEP_DBUSDC: {
    key: "DEEP_DBUSDC",
    label: "DEEP / USDC",
    poolId: "0xe86b991f8632217505fd859445f9803967ac84a9d4a1219065bf191fcb74b622",
    baseCoinKey: "DEEP",
    quoteCoinKey: "DBUSDC",
    baseType: DEEP_COIN,
    quoteType: DBUSDC_COIN,
    sellAsset: "DEEP",
    buyAsset: "USDC",
    decimals: 9,
  },
};

export const POOL_LIST = Object.values(POOLS);

// ── Swap Transaction Builders ──────────────────────────────────────────

/**
 * Build a Transaction to swap exact BASE for QUOTE.
 * For SUI_DBUSDC: sells SUI (base) to buy DBUSDC (quote).
 *
 * @param pool - Pool option
 * @param amount - Amount to sell (in smallest unit, e.g. MIST)
 * @param minOut - Minimum receive amount (slippage protection)
 * @returns Transaction ready for signing
 */
export function buildSwapExactBaseForQuote(
  pool: PoolOption,
  amount: bigint,
  minOut: bigint,
): Transaction {
  const tx = new Transaction();

  const [coinIn] = tx.splitCoins(tx.gas, [tx.pure.u64(amount)]);

  tx.moveCall({
    target: `${DEEPBOOK_PACKAGE_ID}::pool::swap_exact_base_for_quote`,
    typeArguments: [pool.baseType, pool.quoteType],
    arguments: [
      tx.object(pool.poolId),
      coinIn,
      tx.pure.u64(minOut),
      tx.object(CLOCK_ID),
    ],
  });

  return tx;
}

/**
 * Build a Transaction to swap exact QUOTE for BASE.
 * For DEEP_SUI: sells SUI (quote) to buy DEEP (base).
 *
 * @param pool - Pool option
 * @param amount - Amount to sell (in smallest unit)
 * @param minOut - Minimum receive amount (slippage protection)
 * @returns Transaction ready for signing
 */
export function buildSwapExactQuoteForBase(
  pool: PoolOption,
  amount: bigint,
  minOut: bigint,
): Transaction {
  const tx = new Transaction();

  const [coinIn] = tx.splitCoins(tx.gas, [tx.pure.u64(amount)]);

  tx.moveCall({
    target: `${DEEPBOOK_PACKAGE_ID}::pool::swap_exact_quote_for_base`,
    typeArguments: [pool.baseType, pool.quoteType],
    arguments: [
      tx.object(pool.poolId),
      coinIn,
      tx.pure.u64(minOut),
      tx.object(CLOCK_ID),
    ],
  });

  return tx;
}

/**
 * Build a swap transaction based on the direction.
 * @param pool - Pool option
 * @param sellAmount - Amount to sell (smallest unit)
 * @param minBuyAmount - Minimum to receive (smallest unit)
 * @param sellBase - If true, sell BASE to buy QUOTE. If false, sell QUOTE to buy BASE.
 */
export function buildSwapTx(
  pool: PoolOption,
  sellAmount: bigint,
  minBuyAmount: bigint,
  sellBase: boolean,
): Transaction {
  if (sellBase) {
    return buildSwapExactBaseForQuote(pool, sellAmount, minBuyAmount);
  }
  return buildSwapExactQuoteForBase(pool, sellAmount, minBuyAmount);
}

// ── Live Price Quoting via devInspectTransactionBlock ────────────────

/**
 * Simulate a swap via devInspectTransactionBlock to get the real expected output.
 *
 * @param suiClient - A SuiClient instance
 * @param sender - The wallet address (used as sender for simulation)
 * @param pool - The pool to swap on
 * @param sellAmount - Amount to sell (smallest unit)
 * @param sellBase - true: sell BASE→QUOTE; false: sell QUOTE→BASE
 * @returns The expected output amount (smallest unit), or 0n if simulation fails
 */
export async function getSwapQuote(
  suiClient: { devInspectTransactionBlock: (args: any) => Promise<any> },
  sender: string,
  pool: PoolOption,
  sellAmount: bigint,
  sellBase: boolean,
): Promise<bigint> {
  try {
    const tx = buildSwapTx(pool, sellAmount, 0n, sellBase);

    const result = await suiClient.devInspectTransactionBlock({
      sender,
      transactionBlock: tx,
    });

    // Determine which coin type is the buy asset
    const buyCoinType = sellBase ? pool.quoteType : pool.baseType;

    // Parse balanceChanges to find the buy asset amount change
    // The buy asset should have a positive balance change (we receive it)
    for (const bc of result.balanceChanges ?? []) {
      if (bc.coinType === buyCoinType) {
        const amount = BigInt(bc.amount);
        if (amount > 0n) return amount;
      }
    }

    // Fallback: check all balance changes for any positive amount
    // (in case the coin type string doesn't match exactly)
    for (const bc of result.balanceChanges ?? []) {
      const amount = BigInt(bc.amount);
      if (amount > 0n) return amount;
    }

    return 0n;
  } catch (err) {
    console.warn("Swap quote simulation failed:", err);
    return 0n;
  }
}

// ── Formatting Helpers ─────────────────────────────────────────────────

/**
 * Parse a user-input string into bigint (smallest unit).
 * E.g. "1.5" with 9 decimals → 1500000000n
 */
export function parseUserAmount(value: string, decimals: number): bigint {
  const [whole = "0", fraction = ""] = value.replace(/,/g, "").split(".");
  const padded = fraction.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole) * BigInt(10) ** BigInt(decimals) + BigInt(padded || "0");
}

/**
 * Format a bigint amount to a human-readable string.
 * E.g. 1500000000n with 9 decimals → "1.5"
 */
export function formatAmount(value: bigint, decimals: number): string {
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  const fractionStr = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  if (!fractionStr) return whole.toString();
  return `${whole}.${fractionStr}`;
}


