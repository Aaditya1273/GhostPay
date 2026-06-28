const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const client = new SuiClient({ url: getFullnodeUrl('testnet') });
async function run() {
  try {
    const res = await client.getObject({
      id: "0xb012378c9f3799fb5b1a7083da74a4069e3c3f1c93de0b27212a5799ce1e1e98",
      include: { content: true },
      options: { showContent: true, showBcs: true }
    });
    console.log("Success:", res.data?.objectId);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
run();
