import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";

const client = new SuiClient({ url: getFullnodeUrl("testnet") });
const poolId = "0x1c19362ca52b8ffd7a33cee805a67d40f31e6ba303753fd3a4cfdfacea7163a5";
const DEEPBOOK_PACKAGE_ID = "0xfb28c4cbc6865bd1c897d26aecbe1f8792d1509a20ffec692c800660cbec6982";
const SUI_COIN = "0x2::sui::SUI";
const DBUSDC_COIN = "0xf7152c05930480cd740d7311b5b8b45c6f488e3a53a11c3f74a6fac36a52e0d7::DBUSDC::DBUSDC";
const DEEP_COIN = "0x36dbef866a1d62bf7328989a10fb2f07d769f4ee587c0de4a0a256e57e0a58a8::deep::DEEP";

async function main() {
  const tx = new Transaction();
  const [coinIn] = tx.splitCoins(tx.gas, [tx.pure.u64(10000000)]);
  const [zeroDeep] = tx.moveCall({
    target: "0x2::coin::zero",
    typeArguments: [DEEP_COIN],
  });
  
  const [baseCoin, quoteCoin, deepCoin] = tx.moveCall({
    target: `${DEEPBOOK_PACKAGE_ID}::pool::swap_exact_base_for_quote`,
    typeArguments: [SUI_COIN, DBUSDC_COIN],
    arguments: [
      tx.object(poolId),
      coinIn,
      zeroDeep,
      tx.pure.u64(0),
      tx.object("0x6"), // clock
    ],
  });

  // Call coin::value on the quote coin
  tx.moveCall({
    target: "0x2::coin::value",
    typeArguments: [DBUSDC_COIN],
    arguments: [quoteCoin],
  });

  const sender = "0x14225b52f162243c9363df23667616ebc6e18acc60995bfff19973c5ece5c95e";
  tx.transferObjects([baseCoin, quoteCoin, deepCoin], tx.pure.address(sender));

  try {
    const res = await client.devInspectTransactionBlock({
      sender,
      transactionBlock: tx,
    });
    
    // The results array contains the return values of each moveCall.
    // Index 0: splitCoins (no results object)
    // Index 1: coin::zero
    // Index 2: swap_exact_base_for_quote
    // Index 3: coin::value
    console.log(JSON.stringify(res.results, null, 2));
  } catch (e) {
    console.error("Error", e);
  }
}
main();
