/**
 * constants — Single source of truth for all GhostPay shared constants.
 *
 * Every hook, service, and page must import from here rather than
 * duplicating constant values locally. This file is the canonical
 * reference for Sui object IDs, package IDs, coin types, and URLs.
 *
 * ── Updating ──────────────────────────────────────────────────────
 * If a package is upgraded or a pool is replaced, update the value
 * HERE and every consumer picks it up automatically.
 *
 * ── Verification ──────────────────────────────────────────────────
 * All on-chain addresses have been verified via `sui client object`
 * against Sui Testnet (2026-06-25):
 *   GhostPay Package:  0x0f78ba6b... (4 modules: agent, memory, payment, compliance)
 *   DeepBook V3 Pkg:   0x22be4cade... (testnet)
 *   SUI/DBUSDC Pool:   0x1c19362c... (Pool<SUI, DBUSDC>)
 *   DEEP/SUI Pool:     0x48c95963... (Pool<DEEP, SUI>)
 *   DEEP/DBUSDC Pool:  0xe86b991f... (Pool<DEEP, DBUSDC>)
 *   GhostPayState:     0x6c7c1188... (total_agents=0, paused=false)
 *   DBUSDC package:    0xf7152c05... (DBUSDC type, verified in pool type args)
 */

// ── Sui System Objects ────────────────────────────────────────────

/** Sui Clock shared object ID (same on all networks). */
export const CLOCK_ID = "0x6";

// ── GhostPay Package ──────────────────────────────────────────────

/** GhostPayState shared object — created during publish. */
export const GHOSTPAY_STATE_ID =
  process.env.NEXT_PUBLIC_GHOSTPAY_STATE_ID ||
  "0xa999ea23000b023e811abf25625c2a5fbe42cb4db4748bb61c8aac9c1d056ce1";

// ── DeepBook V3 ───────────────────────────────────────────────────

/**
 * DeepBook V3 Testnet Package ID.
 * Verified on-chain: exists as a package type object (2026-06-25).
 */
export const DEEPBOOK_PACKAGE_ID =
  "0x22be4cade64bf2d02412c7e8d0e8beea2f78828b948118d46735315409371a3c";

/**
 * SUI coin type (same on all networks).
 */
export const SUI_COIN =
  "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI";

/**
 * DBUSDC coin type (testnet-only).
 *
 * ⚠️ CRITICAL — This was previously set to a NON-EXISTENT type
 *  (0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN)
 *  which caused ALL DeepBook swap transactions to fail at runtime.
 *
 * The correct type was extracted from the on-chain SUI/DBUSDC pool object
 * (0x1c19362ca52b8ffd7a33cee805a67d40f31e6ba303753fd3a4cfdfacea7163a5)
 * which uses Pool<SUI, DBUSDC> where DBUSDC =
 */
export const DBUSDC_COIN =
  "0xf7152c05930480cd740d7311b5b8b45c6f488e3a53a11c3f74a6fac36a52e0d7::DBUSDC::DBUSDC";

/**
 * DEEP coin type (testnet-only).
 */
export const DEEP_COIN =
  "0x36dbef866a1d62bf7328989a10fb2f07d769f4ee587c0de4a0a256e57e0a58a8::deep::DEEP";

// ── Walrus ────────────────────────────────────────────────────────

/** Walrus testnet publisher HTTP endpoint (PUT /v1/blobs). */
export const WALRUS_PUBLISHER_URL = "https://publisher.walrus-testnet.walrus.space";

/** Walrus testnet aggregator HTTP endpoint (GET /v1/blobs/:id). */
export const WALRUS_AGGREGATOR_URL = "https://aggregator.walrus-testnet.walrus.space";

// ── SEAL ──────────────────────────────────────────────────────────

/** SEAL testnet package ID (separate from GhostPay package). */
export const SEAL_PACKAGE_ID =
  "0xdccbeb87767be2b2346af5575eb139807205e4c23ec53dc616f951fe1d814112";

/** SEAL testnet key server configuration. */
export const SEAL_KEY_SERVER_OBJECT_ID =
  "0xb012378c9f3799fb5b1a7083da74a4069e3c3f1c93de0b27212a5799ce1e1e98";

/** SEAL aggregator URL. */
export const SEAL_AGGREGATOR_URL = "https://seal-aggregator-testnet.mystenlabs.com";
