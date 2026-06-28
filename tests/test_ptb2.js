import { Transaction } from "@mysten/sui/transactions";
const tx = new Transaction();
tx.splitCoins(tx.object("0x123"), [tx.pure.u64(100)]);
const bytes = await tx.build({ 
  onlyTransactionKind: true, 
  client: { 
    multiGetObjects: async () => [{ data: { objectId: "0x123", version: 1, digest: "11111111111111111111111111111111", type: "0x2::coin::Coin<0x2::sui::SUI>" } }] 
  }
});
console.log(Buffer.from(bytes).toString('base64'));
