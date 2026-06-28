import { KeyServerMove } from '@mysten/seal/dist/key-server.mjs';
try {
  KeyServerMove.parse(undefined);
} catch (e) {
  console.log("Error:", e.message);
}
