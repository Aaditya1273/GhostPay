import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
const client = new SuiClient({ url: getFullnodeUrl("testnet") });
const poolId = "0x1c19362ca52b8ffd7a33cee805a67d40f31e6ba303753fd3a4cfdfacea7163a5";
const DEEPBOOK_PACKAGE_ID = "0xfb28c4cbc6865bd1c897d26aecbe1f8792d1509a20ffec692c800660cbec6982";
const SUI_COIN = "0x2::sui::SUI";
const DBUSDC_COIN = "0xf7152c05930480cd740d7311b5b8b45c6f488e3a53a11c3f74a6fac36a52e0d7::DBUSDC::DBUSDC";

async function main() {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${DEEPBOOK_PACKAGE_ID}::pool::get_quote_quantity_out`,
    typeArguments: [SUI_COIN, DBUSDC_COIN],
    arguments: [
      tx.object(poolId),
      tx.pure.u64(10000000), // 0.01 SUI
      tx.object("0x6"), // clock
    ],
  });

  const sender = "0x14225b52f162243c9363df23667616ebc6e18acc60995bfff19973c5ece5c95e";

  try {
    const res = await client.devInspectTransactionBlock({
      sender,
      transactionBlock: tx,
    });
    
    if (res.error) {
      console.log("Error:", res.error);
      return;
    }
    
    const bytes = res.results[0].returnValues[0][0]; // first return value is the quote_quantity_out
    // little-endian u64 to bigint
    let amount = 0n;
    for (let i = 0; i < bytes.length; i++) {
      amount += BigInt(bytes[i]) << BigInt(i * 8);
    }
    console.log("Parsed amount:", amount.toString());
  } catch (e) {
    console.error("Error", e);
  }
}
main();
