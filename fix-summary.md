# DeepBook V3 & Enoki Stability Fixes
1. **Fixed DeepBook V3 ABI:** The DeepBook V3 `swap_exact_base_for_quote` and `swap_exact_quote_for_base` move calls had incorrect signatures. We corrected them by supplying a `0x2::coin::zero<DEEP>` for fee processing and dropping the `client_order_id` which was causing `Incorrect number of arguments` errors during `devInspect`.
2. **Fixed "Swap quote returned 0":** Since the devInspect was failing due to bad move call arguments, `getSwapQuote` was returning 0. This is now fixed and the slippage checks will pass correctly.
3. **Fixed Dropped Objects Error:** The DeepBook V3 swaps return three coins: `Coin<BaseAsset>, Coin<QuoteAsset>, Coin<DEEP>`. We added `tx.transferObjects` in the builders to send all three objects to the recipient address, ensuring the sponsored PTB completes atomically without "non-droppable struct" errors.
4. **Resolved Enoki Allow-list Rejections:** We injected `allowedMoveCallTargets: ["...swap_exact_base_for_quote", "...swap_exact_quote_for_base", "0x2::coin::zero"]` into `useDeepBook.ts` to clear the Enoki backend restrictions.
5. **Auto-Remittance Engine Compatibility:** `autoRemittance` now correctly passes the `recipient` address down to `buildSwapTx` for non-sponsored execution when detecting incoming SUI.

The codebase is now fully compiling, production-ready, and the DeepBook V3 swaps (as well as Enoki sponsored PTBs) are completely functional on testnet.
