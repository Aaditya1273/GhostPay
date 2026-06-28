import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";

const client = new SuiClient({ url: getFullnodeUrl("testnet") });
const poolId = "0x1c19362ca52b8ffd7a33cee805a67d40f31e6ba303753fd3a4cfdfacea7163a5";
const DEEPBOOK_PACKAGE_ID = "0xfb28c4cbc6865bd1c897d26aecbe1f8792d1509a20ffec692c800660cbec6982";
const SUI_COIN = "0x2::sui::SUI";
const DBUSDC_COIN = "0xf7152c05930480cd740d7311b5b8b45c6f488e3a53a11c3f74a6fac36a52e0d7::DBUSDC::DBUSDC";

async function main() {
  const tx = new Transaction();
  const [coinIn] = tx.splitCoins(tx.gas, [tx.pure.u64(10000000)]);
  
  tx.moveCall({
    target: `${DEEPBOOK_PACKAGE_ID}::pool::swap_exact_base_for_quote`,
    typeArguments: [SUI_COIN, DBUSDC_COIN],
    arguments: [
      tx.object(poolId),
      tx.pure.u64(Date.now()),
      tx.pure.u64(10000000),
      tx.pure.u64(0),
      coinIn,
      tx.object("0x6"), // clock
    ],
  });

  const sender = "0x14225b52f162243c9363df23667616ebc6e18acc60995bfff19973c5ece5c95e";

  try {
    const res = await client.devInspectTransactionBlock({
      sender,
      transactionBlock: tx,
    });
    console.log(JSON.stringify(res.effects, null, 2));
    if (res.error) console.error("Error:", res.error);
  } catch (e) {
    console.error(e);
  }
}
main();
