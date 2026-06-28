import { bcs } from '@mysten/bcs';
const ks = bcs.struct('KeyServerMove', { firstVersion: bcs.u64(), lastVersion: bcs.u64() });
try {
  ks.parse("AAABBB");
} catch (e) {
  console.log("With string:", e.message);
}
