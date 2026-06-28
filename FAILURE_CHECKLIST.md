# GhostPay Failure Checklist

> Inventory of every failure mode and how the demo handles it gracefully.
> Judges can use this to verify the app won't break during presentation.

---

## 1. Network Failures

| # | Failure Mode | How It's Handled | Severity |
|---|-------------|-------------------|----------|
| 1.1 | User goes offline | Red banner: "You are offline." Buttons remain clickable, but API calls will timeout gracefully and show error toasts | ✅ Handled |
| 1.2 | Slow network (>10s) | Axios calls timeout at 30s. Error toast shown with clear message | ✅ Handled |
| 1.3 | API server down (/api/sponsor) | Error caught by safe try/catch → user-friendly toast | ✅ Handled |
| 1.4 | API server down (/api/execute) | Error caught by safe try/catch → user-friendly toast | ✅ Handled |
| 1.5 | Walrus aggregator down | downloadFromWalrus catches error → toast: "Failed to download blob from Walrus" | ✅ Handled |
| 1.6 | Walrus publisher down | uploadToWalrus catches error → upload state shows error | ✅ Handled |
| 1.7 | WebSocket/disconnect during tx | suiClient.waitForTransaction with 5s timeout → throws → caught by sponsor/execute error handler | ✅ Handled |

---

## 2. Transaction Failures

| # | Failure Mode | How It's Handled | Severity |
|---|-------------|-------------------|----------|
| 2.1 | Transaction fails on chain | `effects?.status?.status === "failure"` → throw with error message → toast | ✅ Handled |
| 2.2 | Insufficient gas/balance | Enoki sponsorship covers gas. If sponsorship fails → error toast with message | ✅ Handled |
| 2.3 | Move call reverts | Error propagated from Enoki → toast with revert reason | ✅ Handled |
| 2.4 | Duplicate transaction (replay) | Backend nonce check → 409 Conflict → toast | ✅ Handled |
| 2.5 | Invalid signature | Enoki API returns error → toast | ✅ Handled |
| 2.6 | Sender address mismatch | Backend JWT validation → 403 → toast | ✅ Handled |

---

## 3. Rendering Failures

| # | Failure Mode | How It's Handled | Severity |
|---|-------------|-------------------|----------|
| 3.1 | Component throws during render | DemoErrorBoundary catches it → shows "Something went wrong" + "Try Again" button | ✅ Handled |
| 3.2 | Missing data (null/undefined) | Optional chaining (`?.`) everywhere → graceful fallback or "—" | ✅ Handled |
| 3.3 | Missing agent (no on-chain agent) | Dashboard shows "Create Agent" flow. Other pages show relevant error | ✅ Handled |
| 3.4 | Missing package (not deployed) | Pages check `isPackageDeployed` → shows appropriate placeholder | ✅ Handled |
| 3.5 | Invalid route | Next.js 404 page | ✅ Handled |

---

## 4. UI Interaction Failures

| # | Failure Mode | How It's Handled | Severity |
|---|-------------|-------------------|----------|
| 4.1 | User clicks button multiple times | Button disabled while loading (`disabled={sending}` pattern everywhere) | ✅ Handled |
| 4.2 | User clicks backdrop while modal is loading | Condition checks `!sending` / `!executing` before closing | ✅ Handled |
| 4.3 | User presses Escape during modal | Some modals have Escape handling; all close on backdrop click | ⚠️ Partial |
| 4.4 | User switches tabs mid-transaction | Transaction completes server-side; result fetched on return | ✅ Handled |
| 4.5 | User refreshes mid-upload | Upload state is not persisted → starts fresh. No orphan data (Walrus is append-only) | ✅ Handled |
| 4.6 | User enters negative amount | `min="0"` on number inputs, `amount <= 0` validation | ✅ Handled |
| 4.7 | User enters non-numeric amount | `type="number"` prevents non-numeric input, `isNaN` validation | ✅ Handled |
| 4.8 | User submits empty form | Button disabled until required fields are filled | ✅ Handled |
| 4.9 | Infinite spinner | `useLoadingDeadlock` cuts off any spinner after 30s | ✅ Handled |
| 4.10 | User opens multiple modals | No nested modals — each page has one modal at a time | ✅ Handled |

---

## 5. Authentication Failures

| # | Failure Mode | How It's Handled | Severity |
|---|-------------|-------------------|----------|
| 5.1 | JWT expired | Backend returns 401 → user sees "Authentication required" | ✅ Handled |
| 5.2 | Enoki flow fails | `enokiFlow.getKeypair()` catches error → console.error (non-breaking) | ✅ Handled |
| 5.3 | Google OAuth fails | User stays on landing page with sign-in button | ✅ Handled |
| 5.4 | Session storage cleared | User is treated as anonymous → redirected to landing | ✅ Handled |
| 5.5 | Cross-origin request | Backend CSRF check returns 403 → request rejected | ✅ Handled |

---

## 6. Data Consistency Failures

| # | Failure Mode | How It's Handled | Severity |
|---|-------------|-------------------|----------|
| 6.1 | Duplicate payment submission | Duplicate detection (5-min window) prevents re-submission | ✅ Handled |
| 6.2 | Balance discrepancy | Balance checked before every send transaction | ✅ Handled |
| 6.3 | Orphan memory records | `findOrphanRecords()` detects and reports them | ✅ Handled |
| 6.4 | Corrupted Walrus blob | `verifyBlobAvailability()` checks before download | ✅ Handled |
| 6.5 | Chain vs. local state mismatch | Chain sync effect matches on-chain receipts to local intents | ✅ Handled |

---

## 7. Security Failures

| # | Failure Mode | How It's Handled | Severity |
|---|-------------|-------------------|----------|
| 7.1 | Rate limit exceeded | Backend returns 429 with `Retry-After` header | ✅ Handled |
| 7.2 | CSRF attack | Backend validates Origin/Referer → 403 | ✅ Handled |
| 7.3 | Replay attack | Nonce cache prevents duplicate transactions (5-min TTL) | ✅ Handled |
| 7.4 | Unauthenticated API call | Backend returns 401 | ✅ Handled |
| 7.5 | SEAL key server MITM | `verifyKeyServers: true` verifies key server signatures | ✅ Handled |

---

## Loss Scenarios

| # | What Could Go Wrong | Worst Case | Mitigation |
|---|-------------------|------------|------------|
| 1 | Transaction submitted but error on client side | User thinks it failed | `suiClient.waitForTransaction` waits for confirmation. `suiClient.getTransactionBlock` fetches result |
| 2 | User clicks Send, modal closes, no feedback | User doesn't know if it worked | Toast notifications on success/failure |
| 3 | Agent creation transaction pending | Agent not created yet | Dashboard shows "Creating Agent…" spinner. Query auto-refreshes via refetchInterval |
| 4 | Swap quote fails to load | "Quote unavailable" shown | Error caught silently, estimated output shows null |
| 5 | Memory upload fails mid-way | Partial upload | Upload state shows error with details. Walrus doesn't have partial state |

---

## ⚠️ Remaining Risk Items

| # | Risk | Notes |
|---|------|-------|
| 1 | Enoki API key rotation would break sponsorship | Update `ENOKI_SECRET_KEY` env var |
| 2 | Sui RPC endpoint change | Update in network config |
| 3 | SEAL key server change | Update object ID + aggregator URL in constants |
| 4 | Next.js build-time env vars missing | Build fails with Zod parse error (intentional — fails fast) |
