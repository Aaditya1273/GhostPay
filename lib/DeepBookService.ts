/**
 * DeepBookService — DeepBook V3 integration for GhostPay.
 *
 * All-original code. Supports every pool direction by accepting
 * explicit coin object IDs instead of always splitting from tx.gas.
 *
 * ── Key insight ────────────────────────────────────────────────────
 * The old code used `tx.splitCoins(tx.gas, ...)` which only ever
 * produces Coin<SUI>. That made DEEP_SUI and DEEP_DBUSDC impossible
 * because they need Coin<DEEP> or Coin<DBUSDC>.
 *
 * The new builders accept a `coinObjectId?: string`. When provided,
 * the transaction splits from that specific coin instead of gas,
 * which:
 *   1. Works with any Coin<T> type (SUI, DBUSDC, DEEP).
 *   2. Enables sponsorship (no tx.gas reference).
 *   3. Allows every pool to execute correctly.
 *
 * Pool Ordering (from on-chain pool config):
 *   SUI_DBUSDC:  base=SUI,  quote=DBUSDC
 *   DEEP_SUI:    base=DEEP, quote=SUI
 *   DEEP_DBUSDC: base=DEEP, quote=DBUSDC
 *
 * swap_exact_quote_for_base<Base, Quote> — Sells QUOTE to buy BASE
 * swap_exact_base_for_quote<Base, Quote> — Sells BASE to buy QUOTE
 */

import { Transaction } from "@mysten/sui/transactions";
import type { SuiClient } from "@mysten/sui/client";
import { CLOCK_ID, DEEPBOOK_PACKAGE_ID, SUI_COIN, DBUSDC_COIN, DEEP_COIN } from "@/lib/constants";

// ── Types ────────────────────────────────────────────────────────────────

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
  /** Display label for the asset the user sells (default direction) */
  sellAsset: string;
  /** Display label for the asset the user receives (default direction) */
  buyAsset: string;
  decimals: number;
  /** Whether this pool can sell base (sellBase=true) */
  canSellBase: boolean;
  /** Whether this pool can sell quote (sellBase=false) */
  canSellQuote: boolean;
  /** The coin type required when selling base */
  baseInputCoinKey: string;
  /** The coin type required when selling quote */
  quoteInputCoinKey: string;
}

// ── Constants ────────────────────────────────────────────────────────────

/** Pool definitions — all three DeepBook V3 pools with dual-direction support */
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
    canSellBase: true,  // sell SUI → buy USDC (works with gas)
    canSellQuote: true, // sell USDC → buy SUI (needs DBUSDC coin)
    baseInputCoinKey: "SUI",
    quoteInputCoinKey: "DBUSDC",
  },
  DEEP_SUI: {
    key: "DEEP_SUI",
    label: "DEEP / SUI",
    poolId: "0x48c95963e9eac37a316b7ae04a0deb761bcdcc2b67912374d6036e7f0e9bae9f",
    baseCoinKey: "DEEP",
    quoteCoinKey: "SUI",
    baseType: DEEP_COIN,
    quoteType: SUI_COIN,
    sellAsset: "SUI",
    buyAsset: "DEEP",
    decimals: 9,
    canSellBase: true,   // sell DEEP → buy SUI (needs DEEP coin)
    canSellQuote: true,  // sell SUI → buy DEEP (works with gas!)
    baseInputCoinKey: "DEEP",
    quoteInputCoinKey: "SUI",
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
    canSellBase: true,   // sell DEEP → buy USDC (needs DEEP coin)
    canSellQuote: true,  // sell USDC → buy DEEP (needs DBUSDC coin)
    baseInputCoinKey: "DEEP",
    quoteInputCoinKey: "DBUSDC",
  },
};

/** All pools as an array for iteration. */
export const POOL_LIST = Object.values(POOLS);

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Get the required coin key for a pool + direction.
 */
export function getRequiredCoinKey(pool: PoolOption, sellBase: boolean): string {
  return sellBase ? pool.baseInputCoinKey : pool.quoteInputCoinKey;
}

/**
 * Get the output coin key for a pool + direction.
 */
export function getOutputCoinKey(pool: PoolOption, sellBase: boolean): string {
  return sellBase ? pool.quoteCoinKey : pool.baseCoinKey;
}

/**
 * Whether the swap can use the gas coin (only possible when the
 * input coin type is SUI).
 */
export function canUseGasCoin(pool: PoolOption, sellBase: boolean): boolean {
  const requiredKey = getRequiredCoinKey(pool, sellBase);
  return requiredKey === "SUI";
}

/**
 * Build human-readable asset labels for a pool + direction.
 */
export function getSwapLabels(pool: PoolOption, sellBase: boolean): {
  sellAsset: string;
  buyAsset: string;
} {
  return {
    sellAsset: sellBase ? pool.sellAsset : pool.buyAsset,
    buyAsset: sellBase ? pool.buyAsset : pool.sellAsset,
  };
}

// ── Swap Transaction Builders ──────────────────────────────────────────

/**
 * DeepBook V3 swap_exact_base_for_quote function signature:
 *
 * public fun swap_exact_base_for_quote<BaseAsset, QuoteAsset>(
 *     pool: &mut Pool<BaseAsset, QuoteAsset>,
 *     client_order_id: u64,
 *     pay_amount: u64,
 *     min_out_amount: u64,
 *     pay_coin: Coin<BaseAsset>,
 *     clock: &Clock,
 *     ctx: &mut TxContext
 * ): Coin<QuoteAsset>
 */

/**
 * Build a swap transaction selling BASE to buy QUOTE.
 *
 * @param pool       The pool configuration
 * @param amount     Amount to sell (smallest unit)
 * @param minOut     Minimum to receive (slippage, smallest unit)
 * @param coinObjectId  Optional explicit coin object ID. If omitted
 *                      and the input coin is SUI, uses tx.gas.
 *                      If omitted for non-SUI coins, throws.
 */
export function buildSwapExactBaseForQuote(
  pool: PoolOption,
  amount: bigint,
  minOut: bigint,
  recipient: string,
  coinObjectId?: string,
): Transaction {
  const tx = new Transaction();

  let coinIn;
  if (coinObjectId) {
    [coinIn] = tx.splitCoins(tx.object(coinObjectId), [tx.pure.u64(amount)]);
  } else {
    throw new Error(
      `Cannot swap on ${pool.key}: selling ${pool.baseCoinKey} (base) but no ${pool.baseCoinKey} coin object provided. ` +
      `Call buildSwapExactBaseForQuote with coinObjectId pointing to a Coin<${pool.baseType.split("::").pop()}> object.`,
    );
  }

  const [zeroDeep] = tx.moveCall({
    target: "0x2::coin::zero",
    typeArguments: [DEEP_COIN],
  });

  const [baseCoin, quoteCoin, deepCoin] = tx.moveCall({
    target: `${DEEPBOOK_PACKAGE_ID}::pool::swap_exact_base_for_quote`,
    typeArguments: [pool.baseType, pool.quoteType],
    arguments: [
      tx.object(pool.poolId),
      coinIn,
      zeroDeep,
      tx.pure.u64(minOut),
      tx.object(CLOCK_ID),
    ],
  });

  tx.transferObjects([baseCoin, quoteCoin, deepCoin], tx.pure.address(recipient));

  return tx;
}

/**
 * Build a swap transaction selling QUOTE to buy BASE.
 *
 * @param pool       The pool configuration
 * @param amount     Amount to sell (smallest unit)
 * @param minOut     Minimum to receive (slippage, smallest unit)
 * @param recipient  Address to receive the output coins
 * @param coinObjectId  Optional explicit coin object ID.
 */
export function buildSwapExactQuoteForBase(
  pool: PoolOption,
  amount: bigint,
  minOut: bigint,
  recipient: string,
  coinObjectId?: string,
): Transaction {
  const tx = new Transaction();

  let coinIn;
  if (coinObjectId) {
    [coinIn] = tx.splitCoins(tx.object(coinObjectId), [tx.pure.u64(amount)]);
  } else {
    throw new Error(
      `Cannot swap on ${pool.key}: selling ${pool.quoteCoinKey} (quote) but no ${pool.quoteCoinKey} coin object provided. ` +
      `Call buildSwapExactQuoteForBase with coinObjectId pointing to a Coin<${pool.quoteType.split("::").pop()}> object.`,
    );
  }

  const [zeroDeep] = tx.moveCall({
    target: "0x2::coin::zero",
    typeArguments: [DEEP_COIN],
  });

  const [baseCoin, quoteCoin, deepCoin] = tx.moveCall({
    target: `${DEEPBOOK_PACKAGE_ID}::pool::swap_exact_quote_for_base`,
    typeArguments: [pool.baseType, pool.quoteType],
    arguments: [
      tx.object(pool.poolId),
      coinIn,
      zeroDeep,
      tx.pure.u64(minOut),
      tx.object(CLOCK_ID),
    ],
  });

  tx.transferObjects([baseCoin, quoteCoin, deepCoin], tx.pure.address(recipient));

  return tx;
}

/**
 * Build a swap transaction for any pool + direction.
 *
 * @param pool        The pool configuration
 * @param sellAmount  Amount to sell (smallest unit)
 * @param minBuyAmount  Minimum to receive (slippage, smallest unit)
 * @param sellBase    true: sell BASE → buy QUOTE; false: sell QUOTE → buy BASE
 * @param recipient   Address to receive the output coins
 * @param coinObjectId  Optional explicit coin object ID
 */
export function buildSwapTx(
  pool: PoolOption,
  sellAmount: bigint,
  minBuyAmount: bigint,
  sellBase: boolean,
  recipient: string,
  coinObjectId?: string,
): Transaction {
  if (sellBase) {
    return buildSwapExactBaseForQuote(pool, sellAmount, minBuyAmount, recipient, coinObjectId);
  }
  return buildSwapExactQuoteForBase(pool, sellAmount, minBuyAmount, recipient, coinObjectId);
}

// ── Live Price Quoting ─────────────────────────────────────────────────

/**
 * Simulate a swap via devInspectTransactionBlock to get the real expected output.
 *
 * Uses the gas coin for simulation (devInspect doesn't execute, so the
 * coin type mismatch is irrelevant — it's only checking the return value).
 */
export async function getSwapQuote(
  suiClient: { devInspectTransactionBlock: (args: any) => Promise<any> },
  sender: string,
  pool: PoolOption,
  sellAmount: bigint,
  sellBase: boolean,
): Promise<bigint> {
  try {
    const tx = new Transaction();
    const target = sellBase 
      ? `${DEEPBOOK_PACKAGE_ID}::pool::get_quote_quantity_out`
      : `${DEEPBOOK_PACKAGE_ID}::pool::get_base_quantity_out`;
      
    tx.moveCall({
      target,
      typeArguments: [pool.baseType, pool.quoteType],
      arguments: [
        tx.object(pool.poolId),
        tx.pure.u64(sellAmount),
        tx.object(CLOCK_ID),
      ],
    });

    const result = await suiClient.devInspectTransactionBlock({
      sender,
      transactionBlock: tx,
    });

    if (result.error) {
      console.warn("Quote simulation failed:", result.error);
      return 0n;
    }

    if (!result.results || result.results.length === 0 || !result.results[0].returnValues) {
      return 0n;
    }

    const bytes = result.results[0].returnValues[0][0];
    let amount = 0n;
    for (let i = 0; i < bytes.length; i++) {
      amount += BigInt(bytes[i]) << BigInt(i * 8);
    }
    
    return amount;
  } catch (error) {
    console.error("Swap quote failed:", error);
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
