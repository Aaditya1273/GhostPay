# GHOSTPAY — RUNTIME FLOW INVESTIGATION

**Investigators:** Payment Systems Architect · Sui Protocol Engineer · QA Automation Lead · Distributed Systems Investigator
**Date:** June 26, 2026
**Method:** Source-code-level runtime path tracing. Every function call, import chain, SDK method, network request, and data dependency traced end-to-end.
**Rule:** Documentation, README, comments, TODOs, AI summaries are IGNORED. Only actual execution paths are truth.

---

## FLOW MAP

```
Google Login ──▶ zkLogin ──▶ Agent Object ──▶ Wallet Ready ──▶ Receive USDC ──▶ DeepBook Swap ──▶ Walrus Storage ──▶ Compliance Records ──▶ Sponsored Tx ──▶ User Payout
                   │              │                │                    │                    │                  │                    │                 │
                   ▼              ▼                ▼                    ▼                    ▼                  ▼                    ▼                 ▼
                WORKING       BROKEN            WORKING              PARTIAL             WORKING           WORKING             BROKEN           PARTIAL
                (Step 1)      (Step 2)          (Step 3)            (Step 4)            (Step 5)          (Step 6)           (Step 7)         (Step 8)
```

---

## STEP-BY-STEP RUNTIME TRACE

### STEP 1: Google Login → zkLogin

```
ENTRY POINT:   Dashboard (app/dashboard/page.tsx) or any page → "Sign in with Google" button
FILES:         contexts/CustomWallet.tsx (lines 147-163), app/auth/page.tsx (all)
FUNCTIONS:     redirectToAuthUrl() → enokiFlow.createAuthorizationURL() → router.push(url)
               On return: app/auth/page.tsx → useAuthCallback() → router.push("/dashboard")
DEPENDENCIES:  NEXT_PUBLIC_ENOKI_API_KEY, NEXT_PUBLIC_GOOGLE_CLIENT_ID, NEXT_PUBLIC_SUI_NETWORK
EXTERNAL:      Google OAuth, Enoki (Mysten's zkLogin infrastructure), Sui Testnet RPC
```

**DATA ENTERS:** User clicks "Sign in with Google" button.

**EXECUTION PATH:**
1. `redirectToAuthUrl()` builds: `customRedirectUri = "${protocol}//${host}/auth"`
2. Calls `enokiFlow.createAuthorizationURL({provider:"google", network:"testnet", clientId:clientConfig.GOOGLE_CLIENT_ID, redirectUrl:customRedirectUri})`
3. `router.push(url)` → browser navigates to Google OAuth
4. Google authenticates → redirects to `/auth?code=...&id_token=...`
5. `app/auth/page.tsx` renders `Loading` component, calls `useAuthCallback()`
6. `useAuthCallback()` (from `@mysten/enoki/react`) processes the OAuth callback — exchanges code for tokens
7. `useZkLoginSession()` exposes the JWT
8. `useZkLogin()` derives the Sui address from the JWT
9. `useEffect` in `CustomWallet.tsx` extracts email from JWT, calls `handleLoginAs()`
10. `handleLoginAs()` stores user in `sessionStorage`
11. `app/auth/page.tsx` detects `handled === true`, pushes to `/dashboard`
12. Wallet page shows the derived address

**DATA LEAVES STEP 1:**
- `address` — deterministic Sui address string (e.g. `0x...`)
- `jwt` — raw JWT token string
- `emailAddress` — extracted from JWT claims
- `isUsingEnoki: true`
- `isConnected: true`

**CONSUMED BY STEP 2?** YES — `address` is used by `useAgent()` to query for Agent objects. `enokiFlow.getKeypair()` is used to sign transactions.

**RUNTIME VERDICT:** ✅ WORKING — REAL

**FAILURE MODES:**
- Google OAuth redirect fails → silent failure (`.catch(err => console.error(err))` — no toast)
- Enoki API key invalid → Google OAuth rejects with error
- Callback URL mismatch → redirect fails
- **No user-visible error on OAuth failure**

---

### STEP 2: Agent Object Creation

```
ENTRY POINT:   Dashboard (app/dashboard/page.tsx) — displayed when isUsingEnoki && !hasAgent && !agentLoading
FILES:         hooks/useAgentTransaction.ts (lines 15-38), hooks/useAgentQuery.ts (all)
FUNCTIONS:     createAgent(name, emailHash) → builds Transaction.moveCall({target: PACKAGE_ID::agent::create_agent, ...})
               → sponsorAndExecuteTransactionBlock()
               useAgent() → useSuiClientQuery("getOwnedObjects", {filter: StructType: PACKAGE_ID::agent::Agent})
DEPENDENCIES:  NEXT_PUBLIC_PACKAGE_ID, GHOSTPAY_STATE_ID (from lib/constants.ts), CLOCK_ID
EXTERNAL:      Sui Testnet RPC, Enoki sponsorship, Deployed Move package at PACKAGE_ID
```

**DATA ENTERS:** Agent name (user input or derived from email), emailHash (SHA-256 of email)

**EXECUTION PATH:**
1. User enters agent name in Input field, clicks "Create Agent on Sui"
2. `sha256Hex(emailAddress)` hashes the email
3. `createAgent(name, emailHash)` builds Transaction:
   ```
   txb.moveCall({
     target: `${PACKAGE_ID}::agent::create_agent`,
     arguments: [name_string, emailHash_string, GHOSTPAY_STATE_ID, CLOCK_ID]
   })
   ```
4. `sponsorAndExecuteTransactionBlock()` is called:
   - Builds tx with `onlyTransactionKind: true`
   - POST to `/api/sponsor` with `{ txBytes, sender, network, allowedAddresses, allowedMoveCallTargets }`
   - Enoki creates sponsored tx → returns `{ bytes, digest }`
   - User signs `bytes` with Enoki keypair
   - POST to `/api/execute` with `{ signature, digest }`
   - Returns transaction digest
5. Waits for transaction via `suiClient.waitForTransaction()`
6. Fetches full transaction block with `getTransactionBlock()`
7. Checks `effects?.status?.status` for "failure"
8. On success: toast "Agent created on-chain!"
9. `useAgent()` query auto-refetches (10s interval) → picks up new Agent object

**DATA LEAVES STEP 2:**
- `agentId` — the created Agent object ID
- `agentFields` — parsed Agent object fields (display_name, email_hash, etc.)
- `hasAgent: true`

**CONSUMED BY STEP 3?** YES — `agentId` and `agentFields` are used by:
- `app/dashboard/page.tsx` — displays agent status
- `app/wallet/page.tsx` — displays agent identity
- `hooks/usePaymentEngine.ts` — uses `agentId` for payment transactions
- `hooks/useMemoryTransaction.ts` — uses `agentId` for memory storage
- `hooks/useComplianceTransaction.ts` — uses `agentId` for view-key creation

**RUNTIME VERDICT:** ❌ BROKEN — Move contract does NOT exist in this repository

**BREAK ANALYSIS:**
- `invisible-auth/move/` directory returned ENOENT
- `NEXT_PUBLIC_PACKAGE_ID` is validated by Zod in `clientConfig.ts` — if undefined, the app throws at boot
- If `PACKAGE_ID` is "0x0", `isPackageDeployed` is false, and the dashboard shows "Awaiting contract deployment" instead of the create-agent form
- If `PACKAGE_ID` is a real address but `agent::create_agent` doesn't exist there, the transaction fails with "function not found"

**⚠️ CRITICAL BREAK: No Move source code exists. Every transaction to `{PACKAGE_ID}::agent::*` fails if the package isn't deployed externally.**

---

### STEP 3: Wallet Ready

```
ENTRY POINT:   Dashboard (app/dashboard/page.tsx), Wallet (app/wallet/page.tsx)
FILES:         hooks/useBalances.ts (all), hooks/useAgentQuery.ts (all)
FUNCTIONS:     useBalances() → three parallel useSuiClientQuery("getBalance") for SUI, DBUSDC, DEEP
               useAgent() → useSuiClientQuery("getOwnedObjects") with StructType filter
DEPENDENCIES:  NEXT_PUBLIC_PACKAGE_ID, SUI_COIN, DBUSDC_COIN, DEEP_COIN (from constants)
EXTERNAL:      Sui Testnet RPC
```

**DATA ENTERS:** `address` from Step 1, `agentId` from Step 2 (if created)

**EXECUTION PATH:**
1. `useBalances()` fires three `useSuiClientQuery("getBalance")` calls:
   - `{ owner: address, coinType: SUI_COIN }`
   - `{ owner: address, coinType: DBUSDC_COIN }`
   - `{ owner: address, coinType: DEEP_COIN }`
2. Each query is `enabled: !!address` — silent if no address
3. Ballances are converted: SUI=÷1e9, USDC=÷1e6, DEEP=÷1e9
4. `useAgent()` filters owned objects by StructType `{PACKAGE_ID}::agent::Agent`
5. Dashboard displays balances, agent status, transactions
6. Wallet page displays full balance with send/receive UI

**DATA LEAVES STEP 3:**
- `sui: number` — SUI balance
- `usdc: number` — USDC balance
- `deep: number` — DEEP balance
- `isLoading: boolean`
- `refetch: () => void` — force refresh

**CONSUMED BY STEP 4+?** YES — balances drive:
- Auto-remittance trigger (`useRemittanceEngine` watches `sui`)
- Swap UI (balance display)
- Payment engine (balance validation)

**RUNTIME VERDICT:** ✅ WORKING — REAL

**FAILURE MODES:**
- Sui RPC down → queries return undefined → balances show as 0
- `DBUSDC_COIN` is hardcoded to a testnet-specific type — on mainnet this query returns 0
- Query disabled when `isPackageDeployed` is false or `address` is undefined — **silent**

---

### STEP 4: Receive USDC

```
ENTRY POINT:   Wallet page (app/wallet/page.tsx) — "Receive" button → QR code modal
FILES:         app/wallet/page.tsx (lines 278-370), hooks/useBalances.ts (all)
FUNCTIONS:     QRCodeSVG with address, useBalances() polling, no detect function
DEPENDENCIES:  address, DBUSDC_COIN, Sui Testnet RPC
EXTERNAL:      Sui Testnet RPC (polling only)
```

**DATA ENTERS:** User's Sui address.

**EXECUTION PATH:**
1. User clicks "Receive" button → modal opens
2. `QRCodeSVG` renders QR code encoding the user's address
3. User shares address with sender
4. Sender sends USDC to the address (off-chain, external)
5. `hooks/useBalances.ts` polls `getBalance` every 15s via React Query's `refetchInterval`
6. When polling returns a new value, UI updates

**KEY FINDING:** There is NO "Receive" functionality in the app. There is only:
- A QR code that shows the user's address
- Balance polling that eventually shows the new balance

**DATA LEAVES STEP 4:**
- `usdc` balance value updated (same as from Step 3)
- No event, no notification, no trigger

**CONSUMED BY STEP 5?** USED BY — the auto-remittance engine watches `sui`, not `usdc`. Incoming USDC does NOT trigger any pipeline. Only SUI increases trigger conversion.

**RUNTIME VERDICT:** ⚠️ PARTIAL — The QR code works, but there's no incoming detection mechanism

**GAP:**
- No `queryEvents` subscription for `CoinBalanceChange` or transfer events
- No websocket subscription
- No push notification
- `useGhostPayEventIndexer` only watches for GhostPay package events, not coin transfers
- A user who receives USDC will NOT know until the next 15s poll cycle
- **This step is effectively passive** — the app shows an address, that's it

---

### STEP 5: DeepBook Conversion (SUI → USDC)

```
ENTRY POINT:   Swap page (app/swap/page.tsx) — manual swap
               OR: Auto-remittance pipeline (hooks/useRemittanceEngine.ts) — automatic
FILES:         hooks/useDeepBook.ts, lib/DeepBookService.ts, lib/coinDiscovery.ts, app/swap/page.tsx
AUTO PATH:     hooks/useRemittanceEngine.ts, lib/autoRemittance.ts
DEPENDENCIES:  DEEPBOOK_PACKAGE_ID, Pool IDs (hardcoded), SUI_COIN, DBUSDC_COIN, CLOCK_ID
EXTERNAL:      Sui Testnet RPC, DeepBook V3 pools, Enoki sponsorship
```

**PATH A — MANUAL SWAP (app/swap/page.tsx):**

1. User selects pool (SUI/USDC, DEEP/SUI, DEEP/USDC)
2. `checkPoolViability()` calls `validatePool()`:
   - Determines required coin type from pool + direction
   - If SUI: always viable (uses gas coin), not sponsorable
   - If non-SUI: calls `findFirstCoinByType()` → queries `getCoins()` with limit=1
3. User enters amount
4. Debounced `getSwapQuote()` calls `devInspectTransactionBlock()` with the swap tx:
   - Builds swap transaction with sellAmount, 0 minOut
   - Sends `devInspectTransactionBlock` to Sui
   - Parses `balanceChanges` for buy asset amount
5. User clicks "Swap"
6. `executeSwap()` executes the full 6-step pipeline:
   - Step 1: Coin discovery (if needed)
   - Step 2: Quote validation via devInspect
   - Step 3: Build swap tx with `buildSwapTx()`:
     - `target: ${DEEPBOOK_PACKAGE_ID}::pool::swap_exact_base_for_quote`
     - OR `swap_exact_quote_for_base`
     - Arguments: poolId, client_order_id(Date.now()), pay_amount, min_out, coinIn, clock
   - Step 4: Execute (sponsored or unsponsored)
   - Step 5: Parse output from balanceChanges
   - Step 6: Store receipt on Walrus + on-chain memory (best-effort)

**PATH B — AUTO-REMITTANCE (hooks/useRemittanceEngine.ts):**

1. `useEffect` watches `sui` from `useBalances()`
2. When `current > prev`, calculates delta
3. If `shouldAutoConvert(delta)` — delta >= 0.5 SUI:
4. Fires `runPipeline(delta)` via `setTimeout(() => runPipeline(delta), 0)`
5. Pipeline steps:
   - **Step 1: `recordPayment()`** → calls `${PACKAGE_ID}::payment::record_payment` → **REQUIRES payment module**
   - Step 2: `getConversionQuote()` → calls `getSwapQuote()` via devInspect → **WORKS without on-chain**
   - Step 3: `executeTransactionBlockWithoutSponsorship()` → executes unsponsored swap → **REQUIRES user SUI for gas**
   - Step 4: `uploadToWalrus()` → stores receipt → **WORKS (real HTTP API)**
   - **Step 5: `storeMemory()`** → calls `${PACKAGE_ID}::memory::store_memory` → **REQUIRES memory module**
   - **Step 6: `logAccess()`** → calls `${PACKAGE_ID}::compliance::log_access` → **REQUIRES compliance module**
   - **Step 7: `updatePaymentStatus()`** → calls `${PACKAGE_ID}::payment::update_payment_status` → **REQUIRES payment module**

**DATA ENTERS STEP 5:** swap parameters (pool, amount, direction, slippage) OR auto SUI delta

**DATA LEAVES STEP 5:**
- `digest` — swap transaction digest
- `receipt` — swap receipt (pool, amounts, digest, timestamp)
- `blobId` — Walrus blob ID for the receipt (if Walrus upload succeeded)

**CONSUMED BY STEP 6?** The receipt is stored on Walrus (Step 6 functionality) and optionally as on-chain memory.

**RUNTIME VERDICT:** ⚠️ PARTIAL for manual swap, ❌ BROKEN for auto-remittance

**MANUAL SWAP REALITY:**
- DeepBook transaction builders ARE real and correct
- Pool IDs and package ID ARE hardcoded (may or may not be real on current testnet)
- `devInspectTransactionBlock` for quoting IS real
- Sponsorship works for non-gas-coin swaps
- **BUT:** If swap is non-sponsorable (uses gas coin), user MUST have SUI for gas
- **GAP:** Cannot verify pool addresses without on-chain query

**AUTO-REMITTANCE REALITY:**
- 4 of 7 pipeline steps call Move functions that don't exist in this repository
- Steps 1, 5, 6, 7 WILL FAIL at runtime
- The `try-catch` in `runPipeline` catches these failures → pipeline shows "failed" status
- **Silent failure:** The swap (step 3) may succeed, but receipt storage, memory, and compliance logging all fail
- The DeepBook swap itself uses `executeTransactionBlockWithoutSponsorship()` — user pays gas

---

### STEP 6: Walrus Storage

```
ENTRY POINT:   Vault page (app/vault/page.tsx) — "Store Memory" button → upload modal
               OR: Any hook that calls uploadToWalrus() (usePaymentEngine, useDeepBook, useRemittanceEngine, useAgentEngine)
FILES:         lib/WalrusService.ts (all), useWalrusUpload.ts (orchestrator), app/vault/page.tsx
FUNCTIONS:     uploadToWalrus(data, epochs, deletable) → PUT to publisher
               downloadFromWalrus(blobId) → GET from aggregator
               checkBlobStatus(blobId) → HEAD request
DEPENDENCIES:  WALRUS_PUBLISHER_URL, WALRUS_AGGREGATOR_URL (from constants)
EXTERNAL:      Walrus testnet publisher (publisher.walrus-testnet.walrus.space)
               Walrus testnet aggregator (aggregator.walrus-testnet.walrus.space)
```

**DATA ENTERS:** Raw bytes (file data), epochs, deletable flag

**EXECUTION PATH (Vault upload):**
1. User selects file (drag-drop or file picker)
2. Client-side validation: max 50MB, shows file name/size
3. If `isPrivate === true`: calls `encryptWithSeal()` → encrypts with SEAL
4. Calls `uploadToWalrus(data, epochs, deletable)`:
   - Creates PUT request to `{PUBLISHER_URL}/v1/blobs?epochs={n}&deletable={bool}`
   - Retry logic: 3 attempts, exponential backoff (1s, 2s, 4s), jitter
   - Parses response: `newlyCreated` or `alreadyCertified`
5. On success: calls `storeMemory()` → on-chain memory record → **REQUIRES memory module**
6. Without `storeMemory` working: upload succeeds but no indexable record

**WALRUS UPLOAD REALITY:** ✅ REAL — Uses official Walrus testnet HTTP API
**ON-CHAIN INDEX REALITY:** ❌ BROKEN — Requires `memory` Move module

**CRITICAL FINDING:** 
- The Walrus upload **is real** and works independently
- The on-chain memory record step **is broken** (no `memory` module)
- Users CAN upload blobs to Walrus
- Users CANNOT index or find their blobs later without the on-chain MemoryRecord
- The Vault page queries `useMemories()` → `getOwnedObjects` with `StructType: {PACKAGE_ID}::memory::MemoryRecord` — if the module isn't deployed, this returns zero results
- **Without the memory module, Vault always shows "No memories stored yet"**

---

### STEP 7: Compliance Records

```
ENTRY POINT:   Compliance page (app/compliance/page.tsx)
FILES:         hooks/useComplianceTransaction.ts, hooks/useComplianceQuery.ts, lib/complianceEngine.ts
FUNCTIONS:     createViewKey(agentId, viewer, label, expiresAt) → Move call
               revokeViewKey(viewKeyId, agentId) → Move call
               logAccess(agentId, viewer, action, resource) → Move call
               handleDecryptMemory() → downloadFromWalrus → createSessionKey → fetchSealKeys → decryptWithSeal
DEPENDENCIES:  NEXT_PUBLIC_PACKAGE_ID, SEAL_PACKAGE_ID, SEAL_KEY_SERVER_OBJECT_ID, SEAL_AGGREGATOR_URL
EXTERNAL:      Sui Testnet RPC, SEAL key servers, Walrus aggregator
```

**EXECUTION PATH (View-Key creation):**
1. User fills viewer address, label, duration
2. `createViewKey()` builds:
   ```
   txb.moveCall({target: `${PACKAGE_ID}::compliance::create_view_key`,
     arguments: [agentId, viewerAddress, label, expiresAt, CLOCK_ID]})
   ```
3. `sponsorAndExecuteTransactionBlock()` → **REQUIRES compliance module at PACKAGE_ID**
4. On success: view-key is recorded on-chain

**EXECUTION PATH (SEAL Decrypt demo):**
1. User clicks "Decrypt" on an encrypted memory
2. `handleDecryptMemory()`:
   - `downloadFromWalrus(blobId)` → downloads encrypted blob → **WORKS**
   - `createSessionKey({suiClient}, address, PACKAGE_ID)` → creates SEAL session key → **REQUIRES SEAL SDK**
   - Builds transaction: `${PACKAGE_ID}::compliance::seal_approve` → **REQUIRES compliance module**
   - `fetchSealKeys(...)` → fetches keys from SEAL key servers → **REQUIRES SEAL key servers reachable**
   - `decryptWithSeal(...)` → decrypts the data → **REQUIRES all previous steps to succeed**

**VIEW-KEY REALITY:** ❌ BROKEN — Requires `compliance` Move module
**SEAL DECRYPT REALITY:** ⚠️ PARTIAL — SEAL SDK integration is real, but `seal_approve` function doesn't exist
**ACCESS LOG REALITY:** ❌ BROKEN — `logAccess()` calls `${PACKAGE_ID}::compliance::log_access`

**CRITICAL FINDING:**
- The compliance page has decent error handling — if SEAL decrypt fails, it shows helpful error messages
- The view-key UI handles the `generating` / `error` states properly
- **BUT:** ALL three on-chain operations (createViewKey, revokeViewKey, logAccess) depend on the `compliance` module
- **Without compliance: the page renders but ALL transactions fail**

---

### STEP 8: Sponsored Transaction → User Payout

```
ENTRY POINT:   Wallet page (app/wallet/page.tsx) — Send modal
               Payments page (app/payments/page.tsx) — New Payment
FILES:         contexts/CustomWallet.tsx (sponsorAndExecuteTransactionBlock), usePaymentTransaction.ts (transferTokens)
               app/api/sponsor/route.ts, app/api/execute/route.ts
FUNCTIONS:     sponsorAndExecuteTransactionBlock() → dual path sponsorship
               transferTokens(agentId, recipient, amount, currency, memo, coinType, coinObjectId)
DEPENDENCIES:  ENOKI_SECRET_KEY, NEXT_PUBLIC_ENOKI_API_KEY, NEXT_PUBLIC_PACKAGE_ID, SUI_COIN, DBUSDC_COIN
EXTERNAL:      Enoki sponsorship API, Sui Testnet RPC
```

**EXECUTION PATH (Wallet Send):**
1. User enters recipient, amount, currency, memo
2. Input validation: address starts with "0x", length >= 40, amount > 0
3. If USDC: `suiClient.getCoins({owner: address, coinType: DBUSDC_COIN})` to find coin
4. `transferTokens()` builds:
   ```
   txb.splitCoins(coin, [amountInBase])  // split from gas or specific coin
   txb.transferObjects([transferCoin], recipient)
   txb.moveCall({target: `${PACKAGE_ID}::payment::record_payment`, ...})  // REQUIRES payment module
   ```
5. `sponsorAndExecuteTransactionBlock()`:
   - Backend path: POST to `/api/sponsor` → Enoki creates → user signs → POST to `/api/execute` → Enoki executes
   - **transferTokens uses `includesTransferTx: true`** → always routes through backend path
6. Transaction submitted → `waitForTransaction()` → return result

**SPONSORSHIP REALITY:** ✅ REAL — Dual path with security checks
**TRANSFER & PAYMENT RECORD REALITY:** ⚠️ PARTIAL — SUI/USDC transfer IS real (uses splitCoins/transferObjects from @mysten/sui). The `record_payment` move call REQUIRES payment module.

**CRITICAL FINDING:**
- The coin transfer (splitCoins + transferObjects) is 100% real Sui transaction building
- This part WILL work on any network — no custom Move modules needed
- The `record_payment` move call is additional — this is where it breaks
- **The transfer succeeds. The on-chain payment receipt fails.**
- **The user's tokens move. The audit trail is lost.**

---

## DATA FLOW CONTINUITY MAP

```
Step 1 (zkLogin) ──[address, jwt]──▶ Step 2 (Agent Create)
                                          │
                                          │ BROKEN: No Move module
                                          ▼
                                     ⚠️ Step falls through silently
                                          │
                                          │ [address only, no agentId]
                                          ▼
Step 1 ──[address]─────────────────────▶ Step 3 (Wallet Ready)
                                          │
                                          │ [sui, usdc, deep balances]
                                          ▼
Step 3 ──[sui, usdc]───────────────────▶ Step 4 (Receive USDC)
                                          │
                                          │ [passive — no data output]
                                          ▼
Step 3 ──[sui delta >= 0.5]────────────▶ Step 5 (DeepBook Conversion — AUTO)
                                          │
                                          │ PARTIAL: swap works, 4/7 pipeline steps fail
                                          ▼
Step 5 ──[blobId if success]───────────▶ Step 6 (Walrus Storage)
                                          │
                                          │ WALRUS UPLOAD WORKS, but no on-chain index
                                          ▼
Step 6 ──[blobId]──────────────────────▶ Step 7 (Compliance Records)
                                          │
                                          │ BROKEN: 3/3 on-chain operations fail
                                          ▼
Step 3 ──[sui/usdc balances]───────────▶ Step 8 (User Payout)
                                          │
                                          │ PARTIAL: transfer works, receipt fails
                                          ▼
                                     Chain terminates
```

**CHAIN CONTINUITY BREAKS:**

| From | To | Data Passed | Status | Issue |
|---|---|---|---|---|
| Step 1 | Step 2 | `address`, `jwt` | ✅ PASSES | address is valid |
| Step 2 | Step 3 | `agentId` | ❌ BROKEN | No agentId output |
| Step 3 | Step 4 | `sui`, `usdc` | ✅ PASSES | Balances available |
| Step 3 | Step 5 (auto) | `sui` delta | ✅ PASSES | Auto-trigger works |
| Step 5 | Step 6 | `digest`, `blobId` | ⚠️ PARTIAL | Walrus upload works (step 4 of pipeline), receipt NOT stored on-chain |
| Step 6 | Step 7 | `blobId` | ❌ BROKEN | No MemoryRecord created → nothing to decrypt |
| Step 3 | Step 8 | `sui`, `usdc` balances | ⚠️ PARTIAL | Transfer works, record_payment fails |

---

## TOP 20 FLOW BREAKS

### CRITICAL BREAKS

| # | Break | Step | Evidence | Impact |
|---|---|---|---|---|
| **1** | Move contracts don't exist in repository | 2,5,6,7,8 | `invisible-auth/move/` directory returns ENOENT. Zero `.move` files on disk. | **100% of on-chain agent/memory/payment/compliance operations fail at execution.** |
| **2** | `createViewKey()` calls `${PACKAGE_ID}::compliance::create_view_key` — module not found | 7 | `hooks/useComplianceTransaction.ts` line 19 | View-key CRUD never works. Compliance portal shows empty state. |
| **3** | `storeMemory()` calls `${PACKAGE_ID}::memory::store_memory` — module not found | 6 | `hooks/useMemoryTransaction.ts` line 19 | Memories uploaded to Walrus have no on-chain index. Vault always empty. |
| **4** | `createAgent()` calls `${PACKAGE_ID}::agent::create_agent` — module not found | 2 | `hooks/useAgentTransaction.ts` line 21 | Agent never created. Dashboard stuck in "Create Agent" loop. |
| **5** | `recordPayment()` calls `${PACKAGE_ID}::payment::record_payment` — module not found | 5,8 | `hooks/usePaymentTransaction.ts` line 23 | Payment receipts never recorded. wallet/payments audit trail empty. |
| **6** | Auto-remittance pipeline fails on 4 of 7 steps | 5 | `hooks/useRemittanceEngine.ts` lines 81-175 | Steps 1,5,6,7 all fail (payment, memory, compliance modules). Pipeline always shows "failed". |

### HIGH BREAKS

| # | Break | Step | Evidence | Impact |
|---|---|---|---|---|
| **7** | `seal_approve` function doesn't exist | 7 | `app/compliance/page.tsx` line 145 targets `${PACKAGE_ID}::compliance::seal_approve` | SEAL decrypt demo fails. Shows error message, but never decrypts. |
| **8** | No user-visible error on Google OAuth failure | 1 | `contexts/CustomWallet.tsx` line 161: `.catch((err) => { console.error(err); })` | User clicks Sign in → nothing happens → no feedback. |
| **9** | Flux streams claimed but zero code exists | — | No `flux`, `SSE`, `EventSource`, `WebSocket` anywhere | The README and architecture diagram are misleading. |
| **10** | `usePaymentEngine` sync from chain payments only matches by recipient+amount+currency within 60s | 8 | `hooks/usePaymentEngine.ts` lines 371-398 | If chain payments are from a different source, they aren't matched. |

### MEDIUM BREAKS

| # | Break | Step | Evidence | Impact |
|---|---|---|---|---|
| **11** | `NEXT_PUBLIC_PACKAGE_ID` validated by Zod at boot — if missing, app throws | ALL | `config/clientConfig.ts` does `clientConfigSchema.parse()` | App crashes on boot if env var missing. |
| **12** | No incoming fund detection — only 15s polling | 4 | `hooks/useBalances.ts` — no subscription mechanism | User doesn't know when USDC arrives until next poll cycle. |
| **13** | `redirectToAuthUrl()` has no loading state | 1 | `contexts/CustomWallet.tsx` — `router.push(url)` fires immediately | User may double-click Sign in, triggering multiple redirects. |
| **14** | Walrus upload works but Vault page always shows "empty" without memory module | 6 | `app/vault/page.tsx` — `useMemories()` queries `getOwnedObjects` | User uploads blobs perfectly but can never find them. |
| **15** | `GHOSTPAY_STATE_ID` hardcoded as fallback: `process.env.NEXT_PUBLIC_GHOSTPAY_STATE_ID || "0x6c7c11..."` | 2 | `lib/constants.ts` line 23 | If env var missing, uses hardcoded ID. |
| **16** | DeepBook swap receipt storage is best-effort with silent failure | 5 | `hooks/useDeepBook.ts` lines 271-293: `catch (storeErr) { console.warn(...) }` | User sees "Swap receipt stored on Walrus" toast even if storage failed. |

### LOW BREAKS

| # | Break | Step | Evidence | Impact |
|---|---|---|---|---|
| **17** | `useRemittanceEngine` uses `executeTransactionBlockWithoutSponsorship` — user pays gas | 5 | `hooks/useRemittanceEngine.ts` line 114 | Auto-convert is NOT gasless. User needs SUI in wallet. |
| **18** | `Date.now()` used as `client_order_id` in DeepBook swaps — not unique per pool tick | 5 | `lib/DeepBookService.ts` lines 213, 257 | Ms-level collision risk for rapid swaps. |
| **19** | `sessionStorage` for payment intents — lost on tab close or incognito | 8 | `lib/paymentEngine.ts` — `loadPaymentIntents()` reads `sessionStorage` | Pending payments disappear if user closes tab. |
| **20** | `console.warn` calls in production code (agent engine, DeepBook, etc.) | ALL | Multiple files | Judges see irrelevant console output during demo. |

---

## FINAL ANSWER

### Can a real user complete the full GhostPay journey today without developer intervention?

**NO.**

### Evidence

The user journey has **5 critical breaks** that cannot be bypassed:

1. **No Move contracts in repository.** The `invisible-auth/move/` directory does not exist. Zero `.move` files. Every call to `${PACKAGE_ID}::agent::*`, `${PACKAGE_ID}::memory::*`, `${PACKAGE_ID}::payment::*`, `${PACKAGE_ID}::compliance::*` fails at execution.

2. **Agent cannot be created.** `createAgent()` calls `agent::create_agent`. No agent → no `agentId` → no wallet identity → no payments → no memories → no view-keys.

3. **Memories stored on Walrus are invisible.** `useMemories()` queries `memory::MemoryRecord` objects. Without the `memory` module, the Vault always shows "No memories stored yet."

4. **View-keys cannot be created.** `createViewKey()` calls `compliance::create_view_key`. Compliance portal renders UI but all transactions fail.

5. **Auto-remittance always fails.** 4 of 7 pipeline steps depend on missing modules. The pipeline always reports "failed."

### What DOES work independently:

- ✅ Google OAuth (with valid credentials)
- ✅ zkLogin wallet derivation
- ✅ Balance queries (SUI balance, USDC balance via `getCoins`/`getBalance`)
- ✅ DeepBook swap quoting via `devInspectTransactionBlock`
- ✅ DeepBook swap execution (SUI → USDC or vice versa) — **user pays gas for unsponsored swaps**
- ✅ Walrus blob upload/download (anonymous, no auth needed)
- ✅ SEAL session key creation
- ✅ SEAL encrypt (`encryptWithSeal`)
- ✅ Coin transfer (`splitCoins` + `transferObjects` — pure Sui primitives)
- ✅ Sponsored transaction flow (`/api/sponsor` → `/api/execute`)
- ✅ Event indexer polling
- ✅ UI rendering, modals, error boundaries, offline detection

### What is completely broken:

- ❌ Agent object creation
- ❌ On-chain payment records
- ❌ On-chain memory records
- ❌ On-chain view-keys
- ❌ Auto-remittance pipeline
- ❌ SEAL decrypt (depends on `seal_approve`)
- ❌ Flux streams (never existed)

### Prerequisites for a successful demo:

1. Write and deploy 4 Move modules: `agent`, `memory`, `payment`, `compliance`
2. Set `NEXT_PUBLIC_PACKAGE_ID` to the deployed package address
3. Set `ENOKI_SECRET_KEY` and `NEXT_PUBLIC_ENOKI_API_KEY` to valid Enoki API keys
4. Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to a real Google OAuth client ID
5. Set `NEXT_PUBLIC_SUI_NETWORK` and `NEXT_PUBLIC_SUI_NETWORK_NAME`

### Without these:

The app builds, renders, navigates, shows forms, opens modals, handles button clicks, and displays professional error messages. But every "Submit" or "Create" or "Send" button that requires a Move call will return a transaction failure.
