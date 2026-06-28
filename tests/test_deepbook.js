import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";

const client = new SuiClient({ url: getFullnodeUrl("testnet") });
const poolId = "0x1c19362ca52b8ffd7a33cee805a67d40f31e6ba303753fd3a4cfdfacea7163a5";

async function main() {
  const obj = await client.getObject({
    id: poolId,
    options: { showContent: true }
  });
  console.log(JSON.stringify(obj, null, 2));
}

main().catch(console.error);
