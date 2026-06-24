/**
 * DeepBook V3 Integration for GhostPay Agents
 * 
 * Used by the autonomous agent to intercept incoming assets (like USDC) 
 * and instantly auto-convert them into the user's preferred local currency 
 * or stablecoin via the DeepBook Central Limit Order Book (CLOB).
 */

import { Transaction } from '@mysten/sui/transactions';

// Standard DeepBook V3 Constants
export const DEEPBOOK_PACKAGE_ID = '0xdee9'; // DeepBook core package
export const SUI_CLOCK_OBJECT_ID = '0x6';

export interface AutoConvertParams {
  tx: Transaction;
  poolId: string;
  baseCoinToSwap: any; // A transaction argument pointing to the coin object
  minQuoteAmountOut: number;
}

/**
 * Appends an atomic swap command to a Programmable Transaction Block (PTB).
 * This allows the GhostPay Agent to receive funds and immediately route them
 * through DeepBook in a single transaction without multiple signatures.
 */
export function buildAgentAutoConvert(params: AutoConvertParams) {
  const { tx, poolId, baseCoinToSwap, minQuoteAmountOut } = params;

  // In DeepBook V3, trades execute directly against the pool
  const [quoteCoinOut, baseCoinRemainder] = tx.moveCall({
    target: `${DEEPBOOK_PACKAGE_ID}::pool::swap_exact_base_for_quote`,
    arguments: [
      tx.object(poolId),
      baseCoinToSwap,
      tx.pure.u64(minQuoteAmountOut),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ]
  });

  return { quoteCoinOut, baseCoinRemainder };
}
