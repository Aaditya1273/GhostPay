import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
const client = new SuiClient({ url: getFullnodeUrl("testnet") });
const DEEPBOOK_PACKAGE_ID = "0xfb28c4cbc6865bd1c897d26aecbe1f8792d1509a20ffec692c800660cbec6982";

async function main() {
  const func = await client.getNormalizedMoveFunction({
    package: DEEPBOOK_PACKAGE_ID,
    module: "pool",
    function: "swap_exact_base_for_quote"
  });
  console.log(JSON.stringify(func, null, 2));
}
main();
