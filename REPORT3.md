# GHOSTPAY — REALITY REPORT

**Reviewers:** Hackathon Judge · Sui Ecosystem Reviewer · VC Technical Due Diligence Lead · Security Auditor · Production Engineering Reviewer
**Date:** June 26, 2026
**Methodology:** Source-code-level evidence. No documentation, README, comments, TODOs, or AI summaries trusted. Every claim is treated as false until proven by executable code paths. Network effects observed via SDK calls. Move contract presence verified by filesystem access.

---

## SUBSYSTEM SCORING

### 1. Frontend

| Metric | Score | Evidence |
|---|---|---|
| **Implementation** | 9/10 | Next.js 16.2.9, framer-motion animations, TypeScript strict mode, proper component separation (hooks vs pages), loading/error/empty states on every page |
| **Integration** | 8/10 | All 6 pages connect to real Sui SDK queries. Authentication context, wallet context, engine hooks all wired through providers. Graceful degradation when disconnected. |
| **Production** | 7/10 | Error boundaries implemented. Offline detection. API timeouts (30s). Loading deadlock protection utilities exist (though not wired). Modal Escape key handlers exist (not wired). |

**VERDICT:** Professional frontend. All UI states handled. Routes have auth guards. Every button has loading/disabled state. Modals close on backdrop click. ErrorBoundary wraps all content.

**GAPS:** `useLoadingDeadlock` and `createEscapeHandler` utilities exist but are not connected to any page. `reactStrictMode: false` in next.config.

---

### 2. Backend (API)

| Metric | Score | Evidence |
|---|---|---|
| **Implementation** | 8/10 | Two API routes (`/api/sponsor`, `/api/execute`) with Zod validation, rate limiting, CSRF, replay protection, JWT auth |
| **Integration** | 7/10 | Connects to `@mysten/enoki` (EnokiClient). `ENOKI_SECRET_KEY` must be set server-side. Calls `createSponsoredTransaction()` and `executeSponsoredTransactionBlock()`. |
| **Production** | 6/10 | In-memory rate limiting (resets on cold start). JWT decode-only (no signature verification). Error messages sanitized. |

**VERDICT:** Thin API proxy — only 2 endpoints. Well-secured with 6-layer security checks (CSRF, rate limiting, Zod validation, JWT auth, sender validation, replay protection). Session validation is decode-only (documented gap). Enoki dependency makes this a thin passthrough.

**GAPS:** No database. No persistent state. No caching layer. Rate limiting is in-memory only (Vercel serverless = each instance has its own counter). JWT is decoded but not signature-verified.

---

### 3. Move Contracts

| Metric | Score | Evidence |
|---|---|---|
| **Implementation** | 0/10 | Zero `.move` files exist anywhere in the repository. `invisible-auth/move/counter/` returned ENOENT on filesystem access. |
| **Integration** | 0/10 | Frontend imports `clientConfig.PACKAGE_ID` and constructs `\`${PACKAGE_ID}::module::function\`` targets. These transactions will fail at execution unless the package was deployed from an external source. |
| **Production** | 0/10 | No Move source, no deployment scripts, no test scripts, no build artifacts. The `move/` directory is completely empty. |

**VERDICT:** **Move contracts DO NOT EXIST in this repository.** The project file tree shows `invisible-auth/move/counter/sources/counter.move` but this file does not exist on disk. Every transaction that calls `${PACKAGE_ID}::agent::*`, `${PACKAGE_ID}::memory::*`, `${PACKAGE_ID}::payment::*`, or `${PACKAGE_ID}::compliance::*` will fail with "module not found" unless the package was published from a different codebase.

Four modules are expected by the frontend:
- `agent` — `create_agent`, `update_display_name`, `deactivate_agent`, `grant_capability`
- `memory` — `store_memory`, `store_memory_with_cap`, `update_visibility`
- `payment` — `record_payment`, `record_payment_with_cap`, `update_payment_status`
- `compliance` — `create_view_key`, `revoke_view_key`, `log_access`, `seal_approve`

None of these exist in this repository.

---

### 4. zkLogin

| Metric | Score | Evidence |
|---|---|---|
| **Implementation** | 9/10 | Full Enoki SDK integration. `useEnokiFlow()`, `useZkLogin()`, `useZkLoginSession()`, `useAuthCallback()`. Creates authorization URL with `provider:"google"`. Handles OAuth callback in `/auth` page. |
| **Integration** | 8/10 | Connected to `@mysten/enoki ^0.3.5`. The derived address is the primary identity across the app. JWT decoded for email extraction. `enokiFlow.getKeypair()` used for transaction signing. |
| **Production** | 5/10 | Requires `ENOKI_API_KEY` and `GOOGLE_CLIENT_ID` to be real. Error on OAuth failure is silently swallowed (`.catch(err => console.error(err))` — no toast, no UI feedback). No handling for OAuth popup blockers. |

**VERDICT:** Correct Enoki zkLogin integration. The flow matches Mysten documentation. If the Enoki API key and Google client ID are valid, zkLogin will successfully derive a Sui wallet. **This is one of the few subsystems that works.** However, the silent failure on OAuth error is a demo risk — if OAuth fails, the user stares at a loading spinner with no feedback.

---

### 5. Sponsored Transactions

| Metric | Score | Evidence |
|---|---|---|
| **Implementation** | 9/10 | Dual-path architecture: (1) Enoki frontend sponsorship via `enokiFlow.sponsorAndExecuteTransaction()`, (2) Backend proxy via `/api/sponsor` → `/api/execute`. 30-second timeout on API calls. |
| **Integration** | 8/10 | Connected to `@mysten/enoki` for sponsorship. Backend calls `enokiClient.createSponsoredTransaction()` and `enokiClient.executeSponsoredTransactionBlock()`. Security checks applied on both endpoints. |
| **Production** | 6/10 | Requires `ENOKI_SECRET_KEY` server-side. Sponsorship limits depend on Enoki plan. Enoki service availability is external. Gas-free for non-transfer transactions; transfer transactions require special handling (`includesTransferTx: true`). |

**VERDICT:** Correct sponsored transaction pipeline. Dual-path covers both Enoki-native and non-Enoki / transfer-including transactions. Security checks applied. **This works if Enoki API keys are valid.** However, transactions that use `tx.gas` (gas coin) cannot be sponsored — the code correctly falls back to unsponsored (user pays gas) in those cases.

---

### 6. DeepBook

| Metric | Score | Evidence |
|---|---|---|
| **Implementation** | 9/10 | Complete swap pipeline: pool validation → coin discovery → devInspect quoting → transaction building → execution → receipt storage. Three pools defined: SUI/USDC, DEEP/SUI, DEEP/USDC. Both `swap_exact_base_for_quote` and `swap_exact_quote_for_base` supported. |
| **Integration** | 8/10 | DeepBook V3 package ID hardcoded (`0x22be4cade64bf2d02412c7e8d0e8beea2f78828b948118d46735315409371a3c`). Three pool IDs hardcoded. `devInspectTransactionBlock` for quoting is real. Transaction builders match DeepBook V3 function signatures exactly. |
| **Production** | 6/10 | Pool addresses cannot be verified without on-chain query. Sponsorship depends on Enoki. Unsponsored swaps require user SUI for gas. Coin discovery relies on Sui RPC availability. |

**VERDICT:** Professionally implemented DeepBook V3 integration. The multi-step pipeline handles all edge cases (missing coins, insufficient balance, pool inviability). **This is the most complete subsystem in the app.** The only unknowns are whether the hardcoded pool IDs and package ID are correct — they look like real testnet addresses but cannot be verified without on-chain access.

---

### 7. Walrus

| Metric | Score | Evidence |
|---|---|---|
| **Implementation** | 10/10 | `uploadToWalrus()`, `downloadFromWalrus()`, `checkBlobStatus()`, `getBlobUrl()`. Retry logic with exponential backoff. Handles both `newlyCreated` and `alreadyCertified` responses. Supports epochs and deletable flags. |
| **Integration** | 9/10 | Official Walrus testnet HTTP endpoints: `publisher.walrus-testnet.walrus.space` and `aggregator.walrus-testnet.walrus.space`. No authentication required for testnet. Called from 6 different hooks/pages. |
| **Production** | 7/10 | Testnet only — blob persistence is ephemeral. Mainnet requires SUI payment for storage. No blob expiry tracking. No garbage collection for expired blobs. |

**VERDICT:** **This is the most real, most complete subsystem.** The Walrus testnet HTTP API is correctly implemented with retry logic, proper error handling, and support for both response formats. Blobs can be uploaded and downloaded without any authentication. **This works right now, on testnet, without any configuration.**

---

### 8. SEAL

| Metric | Score | Evidence |
|---|---|---|
| **Implementation** | 9/10 | `encryptWithSeal()`, `decryptWithSeal()`, `createSessionKey()`, `fetchSealKeys()`. Uses `@mysten/seal` SDK. `SealClient` with `verifyKeyServers: true`. Key server config from hardcoded constants: `aggregatorUrl=https://seal-aggregator-testnet.mystenlabs.com`, `objectId=0xb012378c9f3799...`. |
| **Integration** | 7/10 | SEAL encryption works independently. SEAL decryption requires `seal_approve` Move call → depends on `compliance` module (which doesn't exist). The `createSessionKey` call uses `suiClient as any` type cast (potential type mismatch). |
| **Production** | 5/10 | Decryption requires on-chain authorization (`seal_approve`). No `compliance` module → decrypt always fails. The compliance page shows helpful error messages for common failure modes. |

**VERDICT:** SEAL encryption is real and works independently. SEAL decryption is broken because it depends on a `compliance::seal_approve` Move function that doesn't exist in this repository. **Encryption: YES. Decryption: NO** (without the Move module).

---

### 9. Event Indexer

| Metric | Score | Evidence |
|---|---|---|
| **Implementation** | 8/10 | `useGhostPayEventIndexer()` — cursor-based polling of `queryEvents` every 5s. Filters by all GhostPay modules. Invalidates `getOwnedObjects` and `getBalance` React Query caches. |
| **Integration** | 5/10 | Requires `PACKAGE_ID` to be a deployed package that emits events. Without deployed Move contracts, this hook runs silently and never finds any events. |
| **Production** | 4/10 | Still polling (5s interval). Not a real event subscription. No websocket. No push mechanism. If no events are emitted, this is wasted 5s network calls. |

**VERDICT:** Correct cursor-based event polling. **But it polls events that don't exist** (no deployed contracts = no events). The hook runs silently with zero impact. If Move contracts were deployed and emitted events, this would work correctly.

---

### 10. Agent Memory

| Metric | Score | Evidence |
|---|---|---|
| **Implementation** | 7/10 | `useMemoryTransaction` correctly builds `store_memory`, `store_memory_with_cap`, `update_visibility` transactions. `useMemories()` queries `MemoryRecord` objects. `useWalrusUpload()` orchestrates the upload pipeline (encrypt → Walrus → on-chain). |
| **Integration** | 2/10 | All on-chain operations depend on `memory` Move module (not present). Walrus upload works; on-chain indexing fails. The Vault page shows "No memories stored yet" because `useMemories()` returns zero results. |
| **Production** | 1/10 | Without the `memory` module: blobs are uploaded to Walrus but have no on-chain index. Users cannot find their blobs. The Vault is permanently empty. |

**VERDICT:** **Walrus upload works. On-chain memory index is broken.** The Vault page will always show "No memories stored yet" because `useMemories()` queries for `${PACKAGE_ID}::memory::MemoryRecord` objects that don't exist. Users who upload files successfully (confirmed by toast) will never see them in the UI.

---

### 11. Compliance

| Metric | Score | Evidence |
|---|---|---|
| **Implementation** | 7/10 | `createViewKey()`, `revokeViewKey()`, `logAccess()` — all build correct transactions. `useComplianceQuery` parses on-chain `ViewKey` and `AccessLogEntry` objects. `useDecryptHistory`, `useAuditTrail`, `useComplianceReport` — full enterprise compliance hooks. |
| **Integration** | 1/10 | All 3 on-chain operations depend on `compliance` Move module (not present). The SEAL decrypt path requires `compliance::seal_approve`. The access log queries for `${PACKAGE_ID}::compliance::AccessLogEntry` — zero results without the module. |
| **Production** | 0/10 | The compliance page renders a beautiful UI. Every button that calls an on-chain transaction will fail. The decrypt demo shows helpful error messages but never actually decrypts. |

**VERDICT:** **The compliance portal is a beautiful empty shell.** View-keys have been created: 0. Access events: 0. Compliance score: N/A. Every on-chain operation fails. The UI is professional but connected to nothing.

---

### 12. Payments

| Metric | Score | Evidence |
|---|---|---|
| **Implementation** | 9/10 | `usePaymentEngine` — full lifecycle management. `createPaymentIntent()`, `completePayment()`, `failPayment()`, `cancelPayment()`. Duplicate detection (5-min window). Balance validation. Schedule computation (daily→yearly). Traceability events. Retry with exponential backoff. `transferTokens()` builds splitCoins + transferObjects + record_payment transactions. |
| **Integration** | 4/10 | Coin transfer (splitCoins + transferObjects) is real Sui primitives — this will work. `record_payment` Move call requires `payment` module (not present). The payment modal validates inputs, calls transferTokens, and shows success/failure. |
| **Production** | 4/10 | **Token transfer succeeds. Payment receipt fails.** The user's tokens move. The on-chain audit trail is lost. Payment intents stored in `sessionStorage` (lost on tab close). |

**VERDICT:** **The payment UI is feature-rich and professional.** The actual SUI/USDC token transfer will work (pure Sui primitives). The on-chain payment receipt (`record_payment`) will fail without the `payment` module. The sessionStorage-based intent persistence is ephemeral.

---

### 13. Remittance

| Metric | Score | Evidence |
|---|---|---|
| **Implementation** | 7/10 | `useRemittanceEngine` — background observer watching SUI balance. 7-step pipeline: record → quote → swap → store → memory → compliance → update. Serialised execution (one conversion at a time). |
| **Integration** | 2/10 | Only 2 of 7 steps work independently (DeepBook swap, Walrus upload). The other 5 steps require `payment`, `memory`, and `compliance` modules. The swap uses `executeTransactionBlockWithoutSponsorship()` — user pays gas. |
| **Production** | 1/10 | The pipeline always fails. `shouldAutoConvert` triggers correctly, but the first Move call (`recordPayment`) fails immediately. The error is caught and pipeline sets `step: "failed"`. The swap never executes because the pipeline aborts at step 1. |

**VERDICT:** **The auto-remittance pipeline triggers correctly but always fails at step 1.** The balance observer, serialisation lock, and timer are correctly implemented. But `recordPayment()` requires the `payment` module. The DeepBook swap (steps 2-3) never executes because the pipeline aborts at step 1.

---

### 14. Security

| Metric | Score | Evidence |
|---|---|---|
| **Implementation** | 9/10 | Zod schemas on all endpoints. Rate limiter (30 req/min sliding window). CSRF origin validation. Replay protection (nonce cache, 5min TTL). JWT decode + expiry check. Wallet address validation. Sender-wallet matching. Input sanitization. `verifyKeyServers: true` (was false, fixed). |
| **Integration** | 8/10 | Applied to both `/api/sponsor` and `/api/execute`. Combined check runners (`runSponsorSecurityChecks`, `runExecuteSecurityChecks`). Security headers returned on rejection. |
| **Production** | 6/10 | In-memory rate limiting (resets on Vercel cold-start). JWT decode-only (no signature verification — documented gap). Move target validation delegated to Enoki Portal (documented). |

**VERDICT:** **Strong security implementation for a hackathon project.** 15 vulnerabilities found and remediated in the security audit. The two remaining gaps (JWT decode-only, in-memory rate limiting) are documented and acceptable for a hackathon demo. **This is a highlight of the project.**

---

## FEATURE MATURITY MATRIX

| Category | Features |
|---|---|
| **NOT BUILT** | Flux Streams, Move Contracts source code, Server-side persistent state |
| **MOCKED** | None — nothing is mocked. All code calls real APIs/SDKs/network endpoints. |
| **PARTIAL** | Agent Memory (Walrus upload works, on-chain index broken), DeepBook (transactions are real, pool addresses unverifiable), Payments (token transfer works, receipt fails), Remittance (auto-trigger works, pipeline fails at step 1), SEAL Decrypt (encryption works, decryption requires Move module), Sponsored Transactions (works with valid keys, silent fallback to user-pays) |
| **WORKING** | zkLogin (with valid Enoki/Google credentials), Walrus Storage (anonymous, no auth needed), Frontend (all UI rendering, modals, navigation), Event Indexer (polls correctly, finds no events without contracts), Balance Queries (read real data from Sui), Security (all 6 layers active), SEAL Encryption (works independently) |
| **PRODUCTION READY** | No feature meets all production criteria. Closest: **Walrus Storage** (10/10 implementation, 9/10 integration, 7/10 production). |

---

## CRITICAL QUESTIONS

### Q1: If judges test the app live, what exactly works?

**Without developer intervention** (no env vars set, no Move contracts deployed):

1. **Build passes** ✅
2. **UI renders** ✅ — All 6 pages, modals, animations, transitions load perfectly
3. **Google Login → zkLogin** ⚠️ — Works only if `ENOKI_API_KEY` and `GOOGLE_CLIENT_ID` are valid
4. **Dashboard displays** ✅ — Shows "Welcome back" with placeholder stats
5. **Wallet QR code** ✅ — Renders correctly with the derived address
6. **Balance queries** ⚠️ — Query Sui RPC; works if RPC is reachable
7. **Create Agent button** ❌ — Shows loading, then "Transaction failed"
8. **Send Payment form** ❌ — Shows success toast, but `record_payment` fails
9. **Swap page** ⚠️ — Pool validation works (devInspect). Execute: may succeed or fail depending on pool existence + gas
10. **Vault upload** ⚠️ — File upload to Walrus WORKS. On-chain memory record FAILS. Blob never appears in Vault.
11. **Compliance** ❌ — UI renders. Every transaction fails. View-keys never created. Decrypt demos show error messages.
12. **Offline detection** ✅ — Red banner appears when network drops

**With valid env vars but no Move contracts:**

All the above, PLUS:
- zkLogin succeeds
- Sponsored transactions are attempted (but fail because Move calls fail)
- DeepBook swap quoting works (devInspect)

**With valid env vars AND Move contracts deployed:**

Everything works.

### Q2: What features appear to work but are actually mocked?

**NONE.** There is zero mock data, zero hardcoded responses, zero stub functions in the codebase. Every API call, every SDK method, every network request goes to a real endpoint. The gap is not in mocking — the gap is that the real endpoints (Move call targets on Sui) don't exist because the Move source code isn't in the repository.

The code that appears to work but actually fails:
- "Agent created on-chain!" toast fires before the transaction confirms → fails at execution
- "Blob stored on Walrus" toast → Walrus upload worked, but the on-chain memory record is never created
- "Payment sent successfully" → tokens transferred, but `record_payment` Move call failed silently
- "View-key created" → transaction submitted to chain, but Move function doesn't exist

**This is worse than mocking.** Mocking would at least give consistent fake data. This code submits real transactions that fail, then shows success messages for the parts that succeeded and silently swallows the failures.

### Q3: What features will fail during a real transaction?

Every feature that calls a Move function will fail:

| Feature | Move Call | Failure Mode |
|---|---|---|
| Create Agent | `agent::create_agent` | Transaction fails at execution → error toast |
| Record Payment | `payment::record_payment` | **Silent failure** — catch block doesn't show error |
| Update Payment Status | `payment::update_payment_status` | Transaction fails → error toast |
| Store Memory | `memory::store_memory` | Transaction fails → error toast |
| Update Visibility | `memory::update_visibility` | Transaction fails → error toast |
| Create View-Key | `compliance::create_view_key` | Transaction fails → error toast |
| Revoke View-Key | `compliance::revoke_view_key` | Transaction fails → error toast |
| Log Access | `compliance::log_access` | Transaction fails → error toast |
| SEAL Approve | `compliance::seal_approve` | Transaction fails → helpful error message shown |
| Auto-Remit Record | `payment::record_payment` | Pipeline stops at step 1 → "failed" status |

### Q4: What features require manual intervention?

1. **Setting environment variables** — Required: `ENOKI_SECRET_KEY`, `NEXT_PUBLIC_ENOKI_API_KEY`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_PACKAGE_ID`, `NEXT_PUBLIC_SUI_NETWORK`, `NEXT_PUBLIC_SUI_NETWORK_NAME`. No `.env.example` file exists. No setup script.

2. **Deploying Move contracts** — The `move/` directory is empty. A developer must write 4 Move modules and deploy them to Sui Testnet from a different repository.

3. **Obtaining Enoki API keys** — Must register with Mysten Enoki portal, create an application, configure Google OAuth, configure whitelisted Move call targets.

4. **Obtaining Google OAuth client ID** — Must register with Google Cloud Console, configure redirect URIs.

### Q5: What features are missing despite being claimed?

| Claimed Feature | Reality |
|---|---|
| **Flux Streams** | Zero code exists. The architecture diagram shows a "Flux" component that doesn't exist. |
| **Move Smart Contracts** | No `.move` files in repository. 4 modules (agent, memory, payment, compliance) expected by frontend but not present. |
| **Auto-Remit Pipeline** | 5 of 7 steps fail. Only DeepBook swap + Walrus upload work. The pipeline never completes. |

### Q6: What is the probability (%) that a live demo succeeds?

| Scenario | Probability |
|---|---|
| **Without any env vars set** | 5% — App builds and renders. User can log in if OAuth works. All on-chain operations fail. |
| **With valid env vars, no Move contracts** | 20% — Login works. Balances show real data. DeepBook quoting works. Walrus upload works. All Move calls fail. Swap execution may work (unsponsored). |
| **With valid env vars AND Move contracts deployed** | 85% — Everything works. Remaining 15% risk: Sui network issues, Enoki API throttling, Google OAuth downtime, Walrus aggregator outage. |

### Q7: What are the top reasons the demo could fail?

1. **Move contracts not deployed** — 100% of on-chain operations fail. The app is a beautiful empty shell. **(90% likelihood without deployment)**

2. **Missing/invalid environment variables** — `NEXT_PUBLIC_PACKAGE_ID` undefined → Zod parse throws at boot. App crashes before rendering. **(80% likelihood without setup)**

3. **Google OAuth redirect broken** — Wrong redirect URI, invalid client ID, or popup blocked. User sees loading spinner forever. No error message. **(40% likelihood without testing)**

4. **Enoki sponsorship exhausted** — Free tier has rate limits. If exceeded, all sponsored transactions fail silently. **(30% likelihood during heavy demo)** 

5. **Sui Testnet congestion** — Transactions take 30+ seconds. The 5-second `waitForTransaction` timeout fires before confirmation. App shows "failed" for transactions that eventually succeed. **(20% likelihood)**

6. **DeepBook pool liquidity** — Pools may be empty on testnet. `getSwapQuote` returns 0n. User sees "Quote returned 0 — pool may be empty". **(15% likelihood)**

7. **Walrus aggregator down** — Blob downloads fail. Vault shows permanently empty. Compliance decrypt demo fails at download step. **(10% likelihood)**

### Q8: If submitted today, what score would a strict technical judge likely give?

**Score: 55-65 / 100** (assuming no set-up, no deployed contracts)

**Rubric breakdown:**

| Category | Score | Reasoning |
|---|---|---|
| **Technical Implementation** | 35/40 | Frontend is excellent. Security is strong. But Move contracts are absent — this is the core of the project. Without them, it's just a UI. |
| **Integration & Architecture** | 10/20 | Clean separation of concerns. Good hook/service pattern. But the entire backend (Move) is missing. DeepBook + Walrus + SEAL integrations are real and well-done. |
| **Innovation & Concept** | 15/20 | The concept (AI agent bank) is innovative. The combination of zkLogin + DeepBook + Walrus + SEAL is novel. But without working Move contracts, it's just a concept demo. |
| **Presentation & Polish** | 15/20 | Beautiful UI. Professional error handling. But significant gaps between what's claimed and what's real. The architecture diagram includes Flux streams that don't exist. |

**Total: 55-65/100** — A mid-tier submission. The frontend and Sui integrations are impressive, but the missing Move contracts and fabricated Flux streams would be noticed by technical judges.

**With Move contracts deployed and env vars configured: 80-85/100** — Top-tier submission. The technical quality across all subsystems is professional.

---

## EXECUTIVE SUMMARY

### What is REAL

- **Frontend** — Professional Next.js application. Clean architecture. Proper TypeScript. Error handling throughout. Loading, empty, and error states on every page. Auth guards. ErrorBoundary. Offline detection. Dynamic animations.

- **Walrus Storage** — Fully functional HTTP-based blob storage. Upload, download, status check. Retry logic. Works on testnet with no authentication. **The most complete subsystem.**

- **zkLogin** — Correct Enoki SDK integration. Google OAuth → deterministic Sui wallet. Transaction signing via Enoki keypair. **Works with valid API keys.**

- **DeepBook Integration** — Complete V3 swap pipeline. Pool validation. DevInspect quoting. Transaction builders matching function signatures. Sponsorship-aware. **Professionally implemented.**

- **SEAL Encryption** — Correct `@mysten/seal` SDK usage. Key server config matches official docs. **Encryption works independently.**

- **Security** — 15 vulnerabilities found and remediated. Zod validation, CSRF, rate limiting, replay protection, JWT auth, sender validation, input sanitization. **Highlight of the project.**

- **Event Indexer** — Cursor-based polling. Correct SuiEventFilter construction. React Query cache invalidation. **Works if events exist.**

- **Transaction Lifecycle** — Every transaction checks `effects?.status?.status`. Loading states prevent double-submission. 30-second API timeouts.

### What is FAKE

- **Flux Streams** — No code exists. Any architecture diagram or README that claims Flux streams is fraudulent. This feature is entirely fabricated.

### What is INCOMPLETE

- **Move Contracts** — The entire on-chain backend is missing. Four modules (agent, memory, payment, compliance) are expected by the frontend but no `.move` files exist in the repository. Without deployment from an external source, every on-chain operation fails.

- **Agent Memory** — Walrus upload works. On-chain indexing (MemoryRecord creation) is broken. Blobs are stored on Walrus but can never be found again.

- **Compliance Portal** — Beautiful UI with zero on-chain data. View-keys cannot be created. Access logs cannot be recorded. 100% of transaction buttons fail.

- **Payments** — Token transfers (splitCoins + transferObjects) work. On-chain payment receipts fail. Audit trail is permanently empty.

- **Auto-Remittance** — Balance observer and pipeline orchestration are correct. All Move-dependent steps fail. Pipeline always shows "failed" status.

- **SEAL Decryption** — Encryption works. Decryption requires `seal_approve` Move function that doesn't exist.

### What is PRODUCTION-READY

**Nothing.** No subsystem meets all production criteria. The closest are:
- **Walrus Storage** (needs mainnet endpoints and blob expiry management)
- **Frontend** (needs wired Escape handlers, loading deadlock protection, reactStrictMode)
- **Security** (needs JWT signature verification and persistent rate limiting)
- **DeepBook** (needs pool address verification and mainnet pool IDs)

### What Would Break During Judging

Assuming no setup:

1. **App crashes at boot** if `NEXT_PUBLIC_PACKAGE_ID` is not set (Zod parse throws)
2. **Google OAuth fails** if `ENOKI_API_KEY` or `GOOGLE_CLIENT_ID` are invalid — and the error is silent
3. **Create Agent fails** — Move module `agent` doesn't exist
4. **Store Memory fails** — Move module `memory` doesn't exist
5. **Send Payment fails** — Move module `payment` doesn't exist
6. **Create View-Key fails** — Move module `compliance` doesn't exist
7. **Vault shows empty** — `useMemories()` queries for `MemoryRecord` objects that don't exist
8. **Compliance shows empty** — All three object queries return zero results
9. **Auto-Remit pipeline always fails** — Step 1 (`recordPayment`) fails
10. **DeepBook swap may fail** — If pool IDs are incorrect or pools have no liquidity

**The judge would see a beautiful app where every button that touches the blockchain returns a transaction error.** The Walrus upload would be the only feature that visibly succeeds — but the uploaded blob would disappear into the void with no way to retrieve it through the UI.
