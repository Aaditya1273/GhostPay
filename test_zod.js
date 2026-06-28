const { z } = require('zod');
const MOVE_TARGET_RE = /^0x[a-fA-F0-9]{1,64}::[a-zA-Z_][a-zA-Z0-9_]*::[a-zA-Z_][a-zA-Z0-9_]*$/;
const schema = z.array(z.string().regex(MOVE_TARGET_RE));
try {
  schema.parse(["0x2::coin::zero"]);
  console.log("SUCCESS");
} catch (e) {
  console.log("FAILED", e.errors);
}
