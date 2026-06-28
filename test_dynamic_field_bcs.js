const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { bcs } = require('@mysten/bcs');
const client = new SuiClient({ url: getFullnodeUrl('testnet') });
async function run() {
  try {
    const objectId = "0xb012378c9f3799fb5b1a7083da74a4069e3c3f1c93de0b27212a5799ce1e1e98";
    const res = await client.getDynamicFieldObject({
      parentId: objectId,
      name: {
        type: "u64",
        bcs: bcs.u64().serialize(2).toBytes()
      }
    });
    console.log("Success:", res.data?.objectId);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
run();
