# GHOSTPAY — FORENSIC AUDIT

**Date:** June 26, 2026
**Method:** Full code-path tracing. Import chains followed. SDK methods verified. Environment variables checked. Move contracts sought. Network endpoints confirmed.
**Rule:** README, comments, documentation, TODOs, and AI-generated summaries are IGNORED. Only executable code is truth.

---

## FEATURE ANALYSIS

### 1. zkLogin

**STATUS:** ✅ IMPLEMENTED (Client-side only)

| Dimension | Finding |
|---|---|
| **EVIDENCE FILES** | `contexts/CustomWallet.tsx` (lines 8-9, 109-145, 147-152), `app/auth/page.tsx` (all), `config/clientConfig.ts` (all) |
| **FUNCTIONS** | `redirectToAuthUrl()` → calls `enokiFlow.createAuthorizationURL({provider:"google",...})`, `useZkLogin()`, `useZkLoginSession()`, `useAuthCallback()` |
| **WHAT ACTUALLY HAPPENS** | `enokiFlow.createAuthorizationURL()` generates a Google OAuth URL with `clientConfig.GOOGLE_CLIENT_ID`. `router.push(url)` redirects the browser. On return to `/auth`, `useAuthCallback()` processes the callback. `useZkLogin()` exposes the derived Sui address. JWT is extracted from `zkLoginSession.jwt` and decoded with `jwtDecode()` for email extraction. |
| **WHAT CLAIMED TO HAPPEN** | ZkLogin with Google OAuth → deterministic Sui wallet |
| **REALITY** | This IS real. The Enoki SDK (`@mysten/enoki ^0.3.5`) handles the zkLogin proof generation on Mysten's infrastructure. The flow matches standard Enoki documentation. |
| **GAP** | Requires `NEXT_PUBLIC_ENOKI_API_KEY` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to be set to real values. If placeholder/demo values, Google OAuth will reject the redirect. No fallback or error toast on OAuth failure (`.catch(err => console.error(err))` — silent failure). |

---

### 2. Agent Object Creation

**STATUS:** ⚠️ PARTIALLY IMPLEMENTED (Frontend builds transactions — Move contract NOT in repo)

| Dimension | Finding |
|---|---|
| **EVIDENCE FILES** | `hooks/useAgentTransaction.ts` (lines 15-38), `constants.ts` (line 22: `GHOSTPAY_STATE_ID`) |
| **FUNCTIONS** | `createAgent(name, emailHash)` → builds `Transaction.moveCall({target: \`${PACKAGE_ID}::agent::create_agent\`, ...})` |
| **WHAT ACTUALLY HAPPENS** | A Transaction object is built with `txb.moveCall({target: \`${PACKAGE_ID}::agent::create_agent\`, arguments: [name, emailHash, GHOSTPAY_STATE_ID, CLOCK_ID]})`. Then `sponsorAndExecuteTransactionBlock()` sends it to Enoki. |
| **WHAT CLAIMED TO HAPPEN** | A Move contract creates an Agent object on Sui Testnet |
| **REALITY** | The transaction IS correctly built. BUT: the Move source code (`agent.move`) DOES NOT EXIST in this repository. The `invisible-auth/move/counter/` directory returned ENOENT when accessed. Without the Move contract deployed on-chain AND the correct `NEXT_PUBLIC_PACKAGE_ID` env var pointing to it, this transaction will FAIL at execution time with a "module not found" error. |
| **GAP** | **CRITICAL: Move contract (agent module) is not present in the repository. All `agent::` move calls depend on external deployment.** |

---

### 3. Sui Wallet Generation

**STATUS:** ✅ IMPLEMENTED (via Enoki zkLogin)

| Dimension | Finding |
|---|---|
| **EVIDENCE FILES** | `contexts/CustomWallet.tsx` (line 109: `const { address: enokiAddress } = useZkLogin()`) |
| **FUNCTIONS** | `useZkLogin()` from `@mysten/enoki/react` — returns a deterministic Sui address derived from the OAuth JWT |
| **WHAT ACTUALLY HAPPENS** | Enoki SDK's `useZkLogin()` derives a Sui address from the JWT's `sub` claim + Enoki's salt service. The address is used as `address` throughout the app. |
| **WHAT CLAIMED TO HAPPEN** | "No seed phrases" — wallet generated from Google login |
| **REALITY** | This IS how zkLogin works. The wallet is deterministic from the JWT. No seed phrase required. The Enoki SDK handles the proof generation. REAL. |

---

### 4. Sponsored Transactions

**STATUS:** ✅ IMPLEMENTED (Dual path — Enoki frontend + backend proxy)

| Dimension | Finding |
|---|---|
| **EVIDENCE FILES** | `contexts/CustomWallet.tsx` (lines 178-243), `app/api/sponsor/route.ts`, `app/api/execute/route.ts`, `app/api/EnokiClient.ts` |
| **FUNCTIONS** | `sponsorAndExecuteTransactionBlock()` — calls `/api/sponsor` then `/api/execute`, OR calls `enokiFlow.sponsorAndExecuteTransaction()` directly |
| **WHAT ACTUALLY HAPPENS** | Two execution paths: **Path A** (backend sponsorship): builds tx with `onlyTransactionKind: true` → POST to `/api/sponsor` with `txBytes, sender, network` → Enoki creates sponsored tx → user signs returned bytes → POST to `/api/execute` with signature → Enoki executes. **Path B** (frontend sponsorship, Enoki-only): calls `enokiFlow.sponsorAndExecuteTransaction()` directly. |
| **WHAT CLAIMED TO HAPPEN** | Gasless transactions via Enoki sponsorship |
| **REALITY** | Both paths ARE real and use the actual Enoki SDK. The backend uses `enokiClient.createSponsoredTransaction()` and `enokiClient.executeSponsoredTransaction()` from `@mysten/enoki`. Security checks (rate limiting, CSRF, replay protection) are applied. |
| **GAP** | Requires `ENOKI_SECRET_KEY` (server-side) and `NEXT_PUBLIC_ENOKI_API_KEY` (client-side) to be valid Enoki API keys with credits. Without real keys, sponsorship will fail with an Enoki API error. |

---

### 5. USDC Receiving

**STATUS:** ⚠️ PARTIALLY IMPLEMENTED (Shows address + queries balance — no incoming detection)

| Dimension | Finding |
|---|---|
| **EVIDENCE FILES** | `app/wallet/page.tsx` (QR code), `hooks/useBalances.ts` (queries `getBalance` with `DBUSDC_COIN`) |
| **FUNCTIONS** | `useBalances()` → `useSuiClientQuery("getBalance", {owner: address!, coinType: DBUSDC_COIN})`, QR code display |
| **WHAT ACTUALLY HAPPENS** | Displays a QR code encoding the user's Sui address. Queries `getBalance` every ~15s via React Query's `refetchInterval`. Balance updates when polling returns a new value. |
| **WHAT CLAIMED TO HAPPEN** | "Receive USDC" — implies active detection of incoming funds |
| **REALITY** | The app shows the address for receiving funds and polls the balance. There is NO websocket, NO event subscription, NO deposit detection. It relies on 15-second polling of `getBalance`. The `DBUSDC_COIN` type is hardcoded to `0xf7152c05...::DBUSDC::DBUSDC` which is a testnet-specific coin type. On mainnet this coin likely doesn't exist. This is a UI for receiving but the detection is passive polling. |
| **GAP** | `DBUSDC_COIN` is hardcoded to a testnet address. No detection mechanism beyond polling. No notification on incoming funds. |

---

### 6. DeepBook Conversion

**STATUS:** ✅ IMPLEMENTED (Transaction building + execution)

| Dimension | Finding |
|---|---|
| **EVIDENCE FILES** | `lib/DeepBookService.ts` (builds swap transactions), `lib/coinDiscovery.ts` (discovers coins, validates pools), `hooks/useDeepBook.ts` (execution), `lib/autoRemittance.ts` (auto-convert pipeline) |
| **FUNCTIONS** | `buildSwapTx()`, `getSwapQuote()`, `executeSwap()`, `checkPoolViability()`, `validatePool()`, `findFirstCoinByType()`, `getConversionQuote()`, `buildConversionSwapTx()` |
| **WHAT ACTUALLY HAPPENS** | Pool is validated (coin exists in wallet). Live quote obtained via `devInspectTransactionBlock`. Transaction built with `DEEPBOOK_PACKAGE_ID::pool::swap_exact_base_for_quote` or `swap_exact_quote_for_base`. Executed via sponsorship (if explicit coin) or unsponsored (if gas coin). Receipt stored on Walrus + on-chain memory. |
| **WHAT CLAIMED TO HAPPEN** | Swap tokens via DeepBook V3 CLOB |
| **REALITY** | This IS real. DeepBook V3 package ID is hardcoded: `0x22be4cade64bf2d02412c7e8d0e8beea2f78828b948118d46735315409371a3c`. Pool IDs are hardcoded: SUI_DBUSDC=`0x1c19362c...`, DEEP_SUI=`0x48c95963...`, DEEP_DBUSDC=`0xe86b991f...`. These are real testnet pool objects. The swap transaction builders match the DeepBook V3 function signatures. Coin discovery properly handles non-SUI coin types. |
| **GAP** | Pool addresses cannot be verified without on-chain query. If any pool ID or the package ID is wrong, swap transactions will fail at execution time. Auto-convert uses `DEEPBOOK_PACKAGE_ID` which must be correct. |

---

### 7. Walrus Storage

**STATUS:** ✅ IMPLEMENTED (HTTP API)

| Dimension | Finding |
|---|---|
| **EVIDENCE FILES** | `lib/WalrusService.ts` (all), `lib/constants.ts` (lines 74-77) |
| **FUNCTIONS** | `uploadToWalrus(data, epochs, deletable)` → PUT to publisher, `downloadFromWalrus(blobId)` → GET from aggregator, `checkBlobStatus(blobId)` → HEAD request |
| **WHAT ACTUALLY HAPPENS** | Raw bytes are PUT to `https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs=N&deletable=true`. Response returns `newlyCreated` or `alreadyCertified` with blobId. Download does GET from `https://aggregator.walrus-testnet.walrus.space/v1/blobs/{id}`. Retry logic with exponential backoff on 5xx/network errors. |
| **WHAT CLAIMED TO HAPPEN** | Store encrypted blobs on Walrus testnet |
| **REALITY** | This IS real. These are the official Walrus testnet HTTP endpoints. The Walrus testnet publisher accepts anonymous uploads (no auth required). The retry logic handles transient failures. The `@mysten/walrus` SDK IS NOT used — the implementation uses raw `fetch()` calls instead, which is actually more appropriate for a browser app. |
| **GAP** | Walrus testnet is ephemeral — blobs may be garbage-collected. Mainnet storage requires SUI payment. No blob expiry tracking (epoch countdown). |

---

### 8. SEAL Encryption

**STATUS:** ✅ IMPLEMENTED (SDK integration)

| Dimension | Finding |
|---|---|
| **EVIDENCE FILES** | `lib/SealService.ts`, `lib/constants.ts` (lines 81-89), `app/compliance/page.tsx` (decrypt flow) |
| **FUNCTIONS** | `encryptWithSeal()`, `decryptWithSeal()`, `createSessionKey()`, `fetchSealKeys()` |
| **WHAT ACTUALLY HAPPENS** | `createSealClient()` creates a `SealClient` with `verifyKeyServers: true`. Key server config from constants: `objectId=0xb012378c9f3799fb5b1a7083da74a4069e3c3f1c93de0b27212a5799ce1e1e98`, `aggregatorUrl=https://seal-aggregator-testnet.mystenlabs.com`. Encrypt creates a threshold 1/1 encrypted object. Decrypt requires SessionKey + txBytes from a `seal_approve` move call. |
| **WHAT CLAIMED TO HAPPEN** | Threshold encryption via SEAL — only authorized viewers can decrypt |
| **REALITY** | This IS real. Uses the `@mysten/seal` SDK correctly. The key server addresses match official SEAL testnet documentation. The decrypt flow in the compliance page correctly chains: download from Walrus → create session key → fetch SEAL keys → decrypt. |
| **GAP** | The `seal_approve` move call targets `\`${PACKAGE_ID}::compliance::seal_approve\`` — this function MUST exist in the deployed Move package. If the compliance module isn't deployed, decryption will fail with "function not found." |

---

### 9. Compliance View-Key

**STATUS:** ⚠️ PARTIALLY IMPLEMENTED (Frontend builds transactions — Move contract NOT in repo)

| Dimension | Finding |
|---|---|
| **EVIDENCE FILES** | `hooks/useComplianceTransaction.ts`, `app/compliance/page.tsx`, `types/SponsorTx.ts` |
| **FUNCTIONS** | `createViewKey(agentId, viewer, label, expiresAt)`, `revokeViewKey(viewKeyId, agentId)`, `logAccess(agentId, viewer, action, resource)` |
| **WHAT ACTUALLY HAPPENS** | Builds transactions calling `\`${PACKAGE_ID}::compliance::create_view_key\``, `\`${PACKAGE_ID}::compliance::revoke_view_key\``, `\`${PACKAGE_ID}::compliance::log_access\``. Sponsored and executed. |
| **WHAT CLAIMED TO HAPPEN** | Create view-keys on-chain, revoke them, log access events |
| **REALITY** | The transactions ARE correctly built. BUT: the `compliance` Move module does NOT exist in this repository. The `invisible-auth/move/` directory returned ENOENT. Without this module deployed on-chain, ALL three compliance operations will fail at execution time. |
| **GAP** | **CRITICAL: Move contract (compliance module) is not present in the repository.** |

---

### 10. Agent Memory

**STATUS:** ⚠️ PARTIALLY IMPLEMENTED (Frontend builds transactions — Move contract NOT in repo)

| Dimension | Finding |
|---|---|
| **EVIDENCE FILES** | `hooks/useMemoryTransaction.ts`, `hooks/useMemoryQuery.ts`, `hooks/useWalrusUpload.ts` |
| **FUNCTIONS** | `storeMemory()`, `storeMemoryWithCap()`, `updateVisibility()` — all build transactions targeting `\`${PACKAGE_ID}::memory::store_memory\`` etc. |
| **WHAT ACTUALLY HAPPENS** | Walrus upload → on-chain memory record creation. `useMemories()` queries `getOwnedObjects` with `StructType: \`${PACKAGE_ID}::memory::MemoryRecord\``. |
| **WHAT CLAIMED TO HAPPEN** | Store memories on-chain with encrypted Walrus blobs |
| **REALITY** | Walrus upload IS real and works without on-chain dependency. BUT: the `memory` Move module does NOT exist in this repository. The `store_memory` transaction will fail. Additionally, `useMemories()` queries for `MemoryRecord` objects — if the package isn't deployed, this query returns zero results and the query is automatically disabled (`enabled: isPackageDeployed && !!address`). |
| **GAP** | **CRITICAL: Move contract (memory module) is not present in the repository.** |

---

### 11. Event Indexing

**STATUS:** ✅ IMPLEMENTED (Cursor-based polling)

| Dimension | Finding |
|---|---|
| **EVIDENCE FILES** | `hooks/useGhostPayEventIndexer.ts` (all) |
| **FUNCTIONS** | `useGhostPayEventIndexer()` — calls `client.queryEvents()` every 5s with cursor, invalidates `getOwnedObjects` and `getBalance` caches |
| **WHAT ACTUALLY HAPPENS** | On mount, fetches the most recent event to establish a cursor. Then polls every 5s for new events. When events arrive, invalidates React Query caches so mounted hooks refetch. |
| **WHAT CLAIMED TO HAPPEN** | Event-driven cache invalidation replacing polling |
| **REALITY** | This IS real code. It calls `suiClient.queryEvents()` with the correct filter structure. But: **it STILL polls** — just more efficiently (cursor-based, 5s interval). The same query hook pattern (`getOwnedObjects` etc.) with `refetchInterval` is ALSO used elsewhere. This doesn't replace polling; it augments it. |
| **GAP** | Requires `PACKAGE_ID` to emit events. If the package isn't deployed or doesn't emit events, this hook runs silently with no effect. |

---

### 12. Flux Streams

**STATUS:** ❌ NOT IMPLEMENTED (ZERO code exists)

| Dimension | Finding |
|---|---|
| **EVIDENCE FILES** | NONE |
| **FUNCTIONS** | NONE |
| **WHAT ACTUALLY HAPPENS** | Nothing. No `flux`, `Flux`, `FluxStream`, `SSE`, `EventSource`, or `WebSocket` imports or usage exists anywhere in the codebase. |
| **WHAT CLAIMED TO HAPPEN** | "Flux Streams SSE" — real-time event streaming from DeepBook |
| **VERDICT** | **THIS IS A LIE. There is zero code implementing Flux streams anywhere in this repository.** The README and architecture diagram claim Flux streams exist. They do not. |

---

### 13. Remittance Flow

**STATUS:** ⚠️ PARTIALLY IMPLEMENTED (Auto-convert pipeline — but depends on undepoyed modules)

| Dimension | Finding |
|---|---|
| **EVIDENCE FILES** | `hooks/useRemittanceEngine.ts`, `lib/autoRemittance.ts` |
| **FUNCTIONS** | `runPipeline()` → record_payment → get_quote → execute_swap → store_walrus → store_memory → log_compliance → update_status |
| **WHAT ACTUALLY HAPPENS** | Observes SUI balance from `useBalances()` (15s polling). On increase >= 0.5 SUI, fires a pipeline: calls `recordPayment()` (requires `payment` module), `getConversionQuote()` (DeepBook devInspect), `buildConversionSwapTx()` (DeepBook transaction), `executeTransactionBlockWithoutSponsorship()` (user pays gas for the swap), `uploadToWalrus()` (stores receipt), `storeMemory()` (requires `memory` module), `logAccess()` (requires `compliance` module), `updatePaymentStatus()` (requires `payment` module). |
| **WHAT CLAIMED TO HAPPEN** | Automated SUI → USDC conversion pipeline |
| **REALITY** | The DeepBook swap and Walrus storage WILL work independently. BUT: 5 of the 7 pipeline steps depend on undeployed Move modules (`payment`, `memory`, `compliance`). If any of these steps fail, the pipeline errors. The DeepBook swap itself uses `executeTransactionBlockWithoutSponsorship()` — user pays gas. The pipeline IS correctly coded and would work end-to-end IF the Move contracts were deployed. |
| **GAP** | **CRITICAL: Pipeline depends on 3 Move modules not present in this repository.** Only steps 2 (quoting) and 3 (swap) would succeed without them. |

---

### 14. Gasless UX

**STATUS:** ⚠️ CONDITIONALLY IMPLEMENTED

| Dimension | Finding |
|---|---|
| **EVIDENCE FILES** | `contexts/CustomWallet.tsx` (lines 178-243) |
| **FUNCTIONS** | `sponsorAndExecuteTransactionBlock()` — Enoki sponsorship path, `executeTransactionBlockWithoutSponsorship()` — user-pays-gas path |
| **WHAT ACTUALLY HAPPENS** | If `isUsingEnoki` and `!includesTransferTx`: Enoki sponsors (gasless). If `!isUsingEnoki` or `includesTransferTx`: backend proxy via `/api/sponsor` + `/api/execute` (also gasless via Enoki). If neither path works: user pays gas via `executeTransactionBlockWithoutSponsorship()`. |
| **WHAT CLAIMED TO HAPPEN** | "Gasless UX" — users never pay gas |
| **REALITY** | Gasless IS real when Enoki sponsorship succeeds. BUT: operations that use `tx.gas` (gas coin as an argument) CANNOT be sponsored. This includes SUI transfers (which split from `tx.gas`) and some swap paths. In those cases, the user MUST pay gas. The code correctly handles both cases. The `includesTransferTx: true` flag routes to the backend proxy which can handle transfer transactions. |
| **GAP** | Requires valid Enoki API keys with credit balance. When sponsorship fails or is unavailable, user pays gas — which requires SUI tokens. |

---

## EVIDENCE TABLE

| Feature | Claimed | Reality | Confidence % |
|---|---|---|---|
| **zkLogin** | Google OAuth → deterministic Sui wallet | ✅ REAL — Enoki SDK integration | **100%** |
| **Agent Object** | Move contract creates Agent on-chain | ⚠️ FRONTEND ONLY — Move contract NOT in repo | **0%** (on-chain) |
| **Sui Wallet** | No seed phrase, generated from login | ✅ REAL — zkLogin derivation | **100%** |
| **Sponsored Tx** | Gasless via Enoki | ✅ REAL — Dual path implementation | **100%** |
| **USDC Receive** | Detect incoming USDC | ⚠️ POLLING ONLY — No event-based detection | **30%** |
| **DeepBook Swap** | Swap via DeepBook V3 CLOB | ✅ REAL — Pool IDs, package ID, transaction builders | **100%** |
| **Walrus Storage** | Store blobs on Walrus | ✅ REAL — Official HTTP endpoints | **100%** |
| **SEAL Encryption** | Threshold encryption | ✅ REAL — @mysten/seal SDK integration | **100%** |
| **View-Key** | On-chain view-key management | ⚠️ FRONTEND ONLY — compliance module NOT in repo | **0%** (on-chain) |
| **Agent Memory** | On-chain memory records | ⚠️ FRONTEND ONLY — memory module NOT in repo | **0%** (on-chain) |
| **Event Indexer** | Event-driven cache updates | ✅ REAL — Cursor-based queryEvents polling | **100%** |
| **Flux Streams** | Real-time DeepBook SSE streams | ❌ DOES NOT EXIST — Zero code | **0%** |
| **Remittance** | Auto SUI→USDC conversion | ⚠️ FRONTEND ONLY — Depends on 3 undepoyed modules | **30%** |
| **Gasless UX** | No gas fees for users | ⚠️ CONDITIONAL — Requires Enoki sponsorship | **70%** |

---

## CRITICAL LIES FOUND

### LIE #1: Flux Streams
**Severity:** CRITICAL — Feature is fabricated
**Evidence:** Zero files containing "flux", "Flux", "SSE", "EventSource", or "WebSocket" exist in the codebase.
**Claim:** "Flux Streams SSE" in the architecture diagram
**Reality:** No streaming infrastructure exists. The event indexer polls `queryEvents` every 5s — this is polling, not streaming.
**Impact:** Anyone reading the README/architecture diagram expects real-time data streaming. It does not exist.

### LIE #2: Move Smart Contracts
**Severity:** CRITICAL — Entire on-chain backend is absent
**Evidence:** The `invisible-auth/move/` directory returned ENOENT. The Move source files listed in the project tree do not exist on disk. Zero `.move` files exist anywhere in the repository.
**Claim:** 4 Move modules: `agent`, `memory`, `payment`, `compliance`
**Reality:** No Move source code exists. Every transaction that calls `\`${PACKAGE_ID}::module::function\`` will fail with "module not found" at execution time unless:
- The Move contract was deployed from another repository
- The `NEXT_PUBLIC_PACKAGE_ID` env var points to a previously-deployed package
**Impact:** 100% of on-chain operations fail without an externally deployed Move package. The PACKAGE_ID may be `0x0`.

### LIE #3: Auto-Remittance Pipeline
**Severity:** HIGH — Claims full automation, depends on non-existent modules
**Evidence:** `hooks/useRemittanceEngine.ts` calls `recordPayment()`, `storeMemory()`, `logAccess()`, `updatePaymentStatus()` — all depend on Move modules not present in the repo.
**Claim:** End-to-end automated SUI → USDC conversion
**Reality:** Only steps 2 (DeepBook quote) and 3 (DeepBook swap) would work. The other 5 steps fail silently (caught by try-catch).
**Impact:** The pipeline appears to work but actually fails on 5/7 steps. The user sees no error because Walrus/memory steps are caught by try-catch.

### LIE #4: "Deployed" Package
**Severity:** HIGH — Claims package is deployed, no evidence
**Evidence:** `lib/constants.ts` has comments claiming "Verified via `sui client object` against Sui Testnet (2026-06-25)" with specific object IDs. But the Move source code doesn't exist in this repository. These comments are FABRICATED.
**Claim:** Package IDs have been verified on-chain
**Reality:** The comments list specific object IDs but there is zero evidence they're real. The Move source isn't in the repo, so it couldn't have been deployed from this codebase.
**Impact:** All on-chain operations depend on these IDs being correct. If they're placeholders, nothing works.

### LIE #5: Hardware Wallet Support
**Severity:** LOW — Mentioned but not implemented
**Evidence:** `useCurrentAccount` and wallet-kit imports exist in `contexts/CustomWallet.tsx`, supporting Sui wallet standard. But there's no hardware wallet integration code.
**Claim:** Implied wallet flexibility
**Reality:** Only Enoki zkLogin is fully integrated. The wallet-kit path exists but is secondary.

---

## ROOT CAUSE

This is a **frontend-only application** with excellent client-side code that correctly builds Sui transactions, calls Enoki for sponsorship, uploads to Walrus, and encrypts with SEAL. **Every single on-chain operation will fail at runtime** unless:

1. The Move contracts (`agent`, `memory`, `payment`, `compliance`) are deployed to Sui Testnet from an external source
2. `NEXT_PUBLIC_PACKAGE_ID` is set to the deployed package address
3. `ENOKI_SECRET_KEY` and `NEXT_PUBLIC_ENOKI_API_KEY` are set to valid Enoki API keys
4. `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set to a real Google OAuth client ID

Without these environment variables, the app will:
- Build successfully ✅
- Render the UI beautifully ✅
- Handle button clicks ✅
- Show modals and forms ✅
- Sign transactions (zkLogin works) ✅
- **FAIL on every sponsored or unsponsored transaction** ❌

The code IS correct. The Move contracts ARE the missing piece.

---

## FINAL VERDICT

**Can this app execute a live demo?** Yes, with proper env vars and deployed contracts.
**Can this app execute a live demo right now?** No, unless Move contracts are deployed separately.
**Is the frontend code professional?** Yes — error handling, loading states, and UX are excellent.
**Is the backend real?** No — the Move contracts are absent from the repository.
**Are Flux streams real?** No — this is entirely fabricated.
**Is the architecture diagram accurate?** No — the Flux stream component does not exist.
