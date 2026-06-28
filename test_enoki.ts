import { EnokiClient } from "@mysten/enoki";
const client = new EnokiClient({ apiKey: "enoki_private_4c04521a1ede1720d46711c060779705" });
client.createSponsoredTransaction({
  network: "testnet",
  transactionKindBytes: "AAA=", // dummy, just to see what Enoki says
  sender: "0x5528db498330ba16632c5705aa3e108492103f7acc5cfa8f84809c6ee7d43363",
}).then(console.log).catch(err => console.error("Enoki error:", err));
