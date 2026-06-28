import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
const client = new SuiClient({ url: getFullnodeUrl("testnet") });
const DEEPBOOK_PACKAGE_ID = "0xfb28c4cbc6865bd1c897d26aecbe1f8792d1509a20ffec692c800660cbec6982";

async function main() {
  const m = await client.getNormalizedMoveModulesByPackage({
    package: DEEPBOOK_PACKAGE_ID,
  });
  console.log(m.pool.exposedFunctions.swap_exact_base_for_quote);
}
main();
