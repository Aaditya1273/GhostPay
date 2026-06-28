import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
const client = new SuiClient({ url: getFullnodeUrl("testnet") });
const DEEPBOOK_PACKAGE_ID = "0xfb28c4cbc6865bd1c897d26aecbe1f8792d1509a20ffec692c800660cbec6982";

async function main() {
  const fns = await client.getNormalizedMoveModulesByPackage({
    package: DEEPBOOK_PACKAGE_ID,
  });
  const poolFns = Object.keys(fns.pool.exposedFunctions).filter(name => name.includes("quote") || name.includes("amount") || name.includes("quantity"));
  console.log(poolFns);
}
main();
