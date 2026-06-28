const MOVE_TARGET_RE = /^0x[a-fA-F0-9]{1,64}::[a-zA-Z_][a-zA-Z0-9_]*::[a-zA-Z_][a-zA-Z0-9_]*$/;
console.log(MOVE_TARGET_RE.test("0x2::coin::zero"));
console.log(MOVE_TARGET_RE.test("0x0000000000000000000000000000000000000000000000000000000000000002::coin::zero"));
