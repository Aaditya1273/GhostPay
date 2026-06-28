# GhostPay — Deployment Report

**Date:** June 26, 2026
**Network:** Sui Testnet
**Chain ID:** `4c78adac`

---

## Deployment Summary

| Metric | Value |
|---|---|
| **Status** | ✅ SUCCESS |
| **Transaction Digest** | `Q63d5HybsWrJuTGgNK5UezuXL99RvYeXP6dFXSbsCNs` |
| **Checkpoint** | 352,915,235 |
| **Epoch** | 1142 |
| **Gas Cost** | 0.062 SUI (61,863,080 MIST) |
| **Deployer** | `0x5528db498330ba16632c5705aa3e108492103f7acc5cfa8f84809c6ee7d43363` |

## Published Objects

| Object Type | Object ID | Owner |
|---|---|---|
| **Package** | `0x55aa16798f8258b5297c96ec083d6f1e2ac15a64d2398db9758012406a3170bd` | Immutable |
| **GhostPayState** | `0xa999ea23000b023e811abf25625c2a5fbe42cb4db4748bb61c8aac9c1d056ce1` | Shared |
| **UpgradeCap** | `0xd3ddd0e572d9ab5bff87c01af5f8804f44ed012c53141c239cfc7f2fac0b3b56` | Deployer |

## Published Modules

| Module | Status |
|---|---|
| `ghostpay::agent` | ✅ Published |
| `ghostpay::memory` | ✅ Published |
| `ghostpay::payment` | ✅ Published |
| `ghostpay::compliance` | ✅ Published |

## Changes Since Previous Deployment

| Change | Detail |
|---|---|
| **Security fix** | `increment_payment_seq` and `increment_memory_seq` changed from `public fun` to `public(package) fun` to prevent external packages from manipulating agent sequence numbers (HIGH severity) |
| **Frontend fix** | `recordPaymentWithCap` Option type corrected from `vector<u8>` to `string` (dead code path) |

## Updated Files

| File | Change |
|---|---|
| `move/ghostpay/Move.toml` | `published-at` + `[addresses]` → new Package ID |
| `move/ghostpay/Published.toml` | Auto-updated by publish with new IDs + upgrade cap |
| `.env.local` | `NEXT_PUBLIC_PACKAGE_ID` + `NEXT_PUBLIC_GHOSTPAY_STATE_ID` |
| `lib/constants.ts` | `GHOSTPAY_STATE_ID` fallback constant |
| `move/ghostpay/sources/agent.move` | `public fun` → `public(package) fun` (2 functions) |
| `move/ghostpay/VERIFICATION_MATRIX.md` | Package ID references |

## Stale ID Verification

| Old ID | Searched | Found |
|---|---|---|
| `0x0f78ba6b1f89d2d707cb2806abba2c1a7dd33f5772614db8020d4892de56e014` | Full repo | **0 matches** ✅ |
| `0x6c7c1188cd3299591b4ef7f69156a8c2a96982babffb5043007a91a7adca9c1a` | Full repo | **0 matches** ✅ |

## Events (emitted by state init)

The `GhostPayState` object was created via `agent::init()` which ran during publish. No explicit events were emitted by `init()` — the `AgentCreatedEvent` is only emitted when a user creates an individual agent via `create_agent()`.

## Move Compilation

```
sui move build --path move/ghostpay
→ SUCCESS (zero errors, zero warnings)
```

## Frontend Build

```
npm run build
→ SUCCESS (all pages generated)
```
