import { bcs } from '@mysten/bcs';
const ks = bcs.struct('KeyServerMove', { firstVersion: bcs.u64(), lastVersion: bcs.u64() });
try {
  ks.parse(undefined);
} catch (e) {
  console.log("With undefined:", e.message);
}
try {
  ks.parse({ someJson: true });
} catch (e) {
  console.log("With JSON:", e.message);
}
