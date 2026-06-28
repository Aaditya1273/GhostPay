import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
const client = new SuiClient({ url: getFullnodeUrl("testnet") });
const DEEPBOOK_PACKAGE_ID = "0xfb28c4cbc6865bd1c897d26aecbe1f8792d1509a20ffec692c800660cbec6982";

async function main() {
  const f1 = await client.getNormalizedMoveFunction({
    package: DEEPBOOK_PACKAGE_ID,
    module: "pool",
    function: "get_quote_quantity_out"
  });
  console.log("get_quote_quantity_out:", JSON.stringify(f1.parameters, null, 2), JSON.stringify(f1.return, null, 2));
}
main();
