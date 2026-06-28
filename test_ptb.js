import { Transaction } from "@mysten/sui/transactions";
const tx = new Transaction();
tx.splitCoins(tx.object("0x123"), [tx.pure.u64(100)]);
console.log(tx.serialize());
