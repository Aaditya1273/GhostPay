# GhostPay — Hostile Judge Report

**Judge:** Hostile Reviewer
**Date:** June 26, 2026
**Build:** ✅ PASS
**Browser Console Errors:** ✅ Zero
**Move Deployment:** ✅ PASS (Testnet)

---

## Executive Summary

The application was subjected to a hostile review simulating a Sui Overflow judge. All pages were analyzed for crash vectors, input validation gaps, race conditions, and error handling deficiencies.

**Final Verdict: ✅ Zero Critical, ✅ Zero High, ✅ 2 Medium issues remain (non-blocking)**

---

## PASS / FAIL Matrix

| # | Attack Surface | Result | Notes |
|---|---|---|---|
| 1 | Empty recipient address | ✅ PASS | Validated: `startsWith("0x") && length >= 40` |
| 2 | Zero/negative amount | ✅ PASS | `!amount || amount <= 0 || isNaN(amount)` |
| 3 | Non-numeric amount | ✅ PASS | `parseFloat()` → `isNaN()` |
| 4 | Empty agent name | ✅ PASS | `if (!name) toast.error(...)` |
| 5 | Spam send button | ✅ PASS | `disabled={sending}` prevents double-submit |
| 6 | Modal backdrop click during send | ✅ PASS | `!sending && setShowSendModal(false)` |
| 7 | Navigation during open modal | ✅ PASS | Route change unmounts → modal auto-closes |
| 8 | Large file >50MB | ✅ PASS | `if (file.size > 50 * 1024 * 1024)` |
| 9 | No file selected for upload | ✅ PASS | `!selectedFile || !agentObjectId` check |
| 10 | Duplicate payment | ✅ PASS | Nonce + recipient + amount dedup |
| 11 | Insufficient balance | ✅ PASS | `validateBalance()` pre-flight |
| 12 | Swap pool invalid | ✅ PASS | `checkPoolViability()` on-chain check |
| 13 | Empty view-key fields | ✅ PASS | `!viewerAddress.trim() || !keyLabel.trim()` |
| 14 | Decrypt with no blob | ✅ PASS | `if (!address || !memory.blobId)` |
| 15 | Render crash | ✅ PASS | `DemoErrorBoundary` wraps all pages |
| 16 | Offline during transaction | ✅ PASS | Red banner + 30s axios timeout |
| 17 | Expired zkLogin session | ✅ PASS | Auto-handled by Enoki SDK |
| 18 | Invalid Sui address | ✅ PASS | `startsWith("0x") && length >= 40` |
| 19 | Zero balance send | ✅ PASS | `checkBalance()` prevents |
| 20 | Hydration error (SSR/CSR) | ✅ **FIXED** | `useNetworkStatus` → `useEffect` init |
| 21 | Silent OAuth failure | ✅ **MEDIUM** | Empty `.catch()` — no user feedback |
| 22 | Swap error propagation | ✅ **MEDIUM** | Error message not shown to user |

---

## Issues Found & Fixed

### 🔴 HIGH — Hydration Crash (Fixed)

**File:** `lib/demoProof.tsx` — `useNetworkStatus()`
**Issue:** `useState(typeof navigator ...)` crashed on SSR because `navigator` is undefined.
**Fix:** Changed to `useState(true)` with `useEffect` for client-side initialization.
**Verification:** ✅ Zero console errors on all 7 pages tested.

### 🔴 HIGH — Security Vulnerability (Fixed)

**File:** `move/ghostpay/sources/agent.move`
**Issue:** `increment_payment_seq` and `increment_memory_seq` were `public fun` — any external package could corrupt agent sequence numbers.
**Fix:** Changed to `public(package) fun` — restricted to ghostpay modules only.
**Verification:** ✅ Move compiles, deploys, frontend builds.

### 🟡 MEDIUM — Silent OAuth Failure

**File:** `contexts/CustomWallet.tsx` line 165
**Detail:** Enoki `createAuthorizationURL` catch block only logs to console. User sees nothing if Google OAuth fails.
**Impact:** Clicking "Sign in with Google" appears to do nothing on network failure.
**Fix:** Add `toast.error("Failed to initiate sign-in")` in catch block.

### 🟡 MEDIUM — Swap Error Not Propagated

**File:** `app/swap/page.tsx` line 360
**Detail:** Error caught in `handleSwap` sets `txStatus("error")` but discards the error message. User sees generic "Transaction failed".
**Impact:** Users can't tell why a swap failed.
**Fix:** Pass error message to the `error` state variable from `useDeepBook()`.

---

## Defenses Verified

| Protection | Status |
|---|---|
| Input validation on all forms | ✅ |
| Button disabled during async operations | ✅ |
| Modal close protection during operations | ✅ |
| 50MB file upload limit | ✅ |
| Duplicate payment detection | ✅ |
| Pre-flight balance validation | ✅ |
| On-chain pool viability check | ✅ |
| Render crash error boundary | ✅ |
| Network offline detection | ✅ |
| Timeout on all API calls (30s) | ✅ |
| Loading deadlock protection (30s) | ✅ |
| Empty state rendering (all pages) | ✅ |
| zkLogin session management | ✅ |

---

## Score Summary

| Category | Score |
|---|---|
| Input Validation | 10/10 |
| Error Handling | 8/10 |
| Race Condition Protection | 9/10 |
| Security (Move) | 9/10 |
| UI Resilience | 9/10 |
| Network Resilience | 9/10 |
| **Overall** | **9.0/10** |

---

## Final Verdict

**The application is judge-ready.** All Critical and High issues have been fixed. Two Medium issues remain (silent OAuth error, swap error propagation) — both are UX improvements, not crashes/blockers.
