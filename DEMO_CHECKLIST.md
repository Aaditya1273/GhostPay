# GhostPay Demo Checklist

> Hand this to hackathon judges. Each item is a clickable action they can take.
> ✅ = should work, ❌ = expected failure mode explained.

---

## 1. Landing Page

| # | Action | Expected Result |
|---|--------|-----------------|
| 1.1 | Open the app | Landing page loads with animated hero, features, pricing |
| 1.2 | Click "Sign in with Google" | Redirected to Google OAuth, then back to `/auth` |
| 1.3 | Refresh the page | Session persists, no re-login needed |
| 1.4 | Navigate to `/dashboard` without signing in | Shows "Your Invisible Bank Awaits" with sign-in prompt |
| 1.5 | Go offline (airplane mode) | Red banner: "You are offline. Transactions will resume when connectivity is restored." |

---

## 2. Dashboard (`/dashboard`)

| # | Action | Expected Result |
|---|--------|-----------------|
| 2.1 | Load dashboard after login | Welcome message with agent name, 4 stat cards |
| 2.2 | Click "Send Payment" quick action | Navigates to `/payments` with send modal available |
| 2.3 | Click "View Wallet" quick action | Navigates to `/wallet` |
| 2.4 | Click "Store Memory" quick action | Navigates to `/vault` |
| 2.5 | Click "Share Access" quick action | Navigates to `/compliance` |
| 2.6 | Click sidebar navigation items | Each route loads correctly, active state highlighted |
| 2.7 | Click "Sign out" in profile popover | Logged out, redirected to landing |

---

## 3. Wallet (`/wallet`)

| # | Action | Expected Result |
|---|--------|-----------------|
| 3.1 | View wallet page | Balance cards show SUI + USDC, wallet identity section |
| 3.2 | Click "Send" button | Send modal opens with recipient/amount/memo/currency fields |
| 3.3 | Press Escape while modal is open | Modal closes |
| 3.4 | Click backdrop while modal is open | Modal closes |
| 3.5 | Type an invalid address (less than 40 chars) | Toast: "Enter a valid Sui address" |
| 3.6 | Type amount = 0 | Toast: "Enter a valid amount" |
| 3.7 | Leave recipient empty and click Send | Button is disabled |
| 3.8 | Click "Copy" on address | Toast: "Address copied to clipboard" |
| 3.9 | Click Suiscan link | Opens Suiscan explorer in new tab |
| 3.10 | Click "Refresh" | Balances reload |
| 3.11 | Click "Receive" | Receive modal opens with QR code + full address |

---

## 4. Swap (`/swap`)

| # | Action | Expected Result |
|---|--------|-----------------|
| 4.1 | Load swap page | Pool selector, swap form with From/To |
| 4.2 | Click a pool tab | Pool switches, form resets |
| 4.3 | Type an amount in "You pay" | Quote loads after 400ms debounce, shows estimated output |
| 4.4 | Click Settings gear | Slippage options appear (0.1%, 0.5%, 1.0%, custom) |
| 4.5 | Click Swap button when pool is unavailable | Button disabled with pool status message |
| 4.6 | Click Swap button when amount is 0 | Button shows "Enter an amount" |
| 4.7 | Successful swap | Progress indicator, success banner with Suiscan link |
| 4.8 | Failed swap | Error banner with "Dismiss" button |
| 4.9 | Click "New swap" after success | Form resets to initial state |

---

## 5. Payments (`/payments`)

| # | Action | Expected Result |
|---|--------|-----------------|
| 5.1 | Load payments page | Summary cards (Total Sent, Received, Pending, Scheduled) |
| 5.2 | Click "New Payment" button | Send modal opens with schedule + recurring options |
| 5.3 | Press Escape while modal is open | Modal closes |
| 5.4 | Click backdrop while modal is open | Modal closes |
| 5.5 | Enter invalid address | Toast: "Enter a valid Sui address" |
| 5.6 | Enter amount exceeding balance | Toast: "Insufficient balance" |
| 5.7 | Schedule future date + time | Payment saved as "scheduled", toast confirmation |
| 5.8 | Toggle recurring payroll | Frequency/ day/ max occurrences fields appear |
| 5.9 | Click status filter tabs | Table filters to matching payments |
| 5.10 | Search by address or memo | Table filters by search query |
| 5.11 | Click eye icon on a payment | Traceability panel opens with timeline |
| 5.12 | Click retry on failed payment | Payment re-executes |
| 5.13 | Click cancel on pending/scheduled | Payment cancelled |
| 5.14 | Click download on traceability panel | JSON file downloads |

---

## 6. Memory Vault (`/vault`)

| # | Action | Expected Result |
|---|--------|-----------------|
| 6.1 | Load vault page | Storage usage bar, memory grid |
| 6.2 | Click "Store Memory" | Upload modal opens |
| 6.3 | Press Escape while modal is open | Modal closes |
| 6.4 | Drag a file onto the drop zone | File is selected, name + size shown |
| 6.5 | Click to browse files | File picker opens |
| 6.6 | Select file > 50 MB | Toast: "File too large — max 50 MB" |
| 6.7 | Click "Remove" on selected file | File deselected |
| 6.8 | Toggle privacy switch | Changes between "SEAL Encrypted" and "Public" |
| 6.9 | Click "Encrypt & Upload" | Progress bar, status: encrypting → uploading → storing → done |
| 6.10 | Click a memory card | Blob downloads/opens from Walrus |
| 6.11 | Click SEAL-encrypted memory | Toast: "SEAL encrypted. Use Compliance Portal." |
| 6.12 | Upload error | Error banner shown with retry option |

---

## 7. Compliance Portal (`/compliance`)

| # | Action | Expected Result |
|---|--------|-----------------|
| 7.1 | Load compliance page | Overview cards, view-keys list, access log |
| 7.2 | Click "Generate New" view-key | Modal opens with viewer address/ label/ duration |
| 7.3 | Press Escape while any modal is open | Modal closes |
| 7.4 | Create a view-key | Toast: "View-key created and logged on-chain" |
| 7.5 | Click copy on a view-key | Key copied to clipboard |
| 7.6 | Click trash icon to revoke | Toast: "View-key revoked" |
| 7.7 | View access logs | Timestamped list of all access events |
| 7.8 | Click "Decrypt" on an encrypted memory | Decrypt modal with progress |

---

## 8. Error Boundaries

| # | Action | Expected Result |
|---|--------|-----------------|
| 8.1 | Navigate between all routes | No 500 errors, no blank pages |
| 8.2 | Force an unhandled error (e.g., window.badFunction()) | Error boundary catches it, shows "Try Again" button |
| 8.3 | Click "Try Again" on error boundary | Component re-renders, app continues working |

---

## 9. Transaction Recovery

| # | Action | Expected Result |
|---|--------|-----------------|
| 9.1 | Submit a send payment | If success → toast + balance update. If fail → error toast + retry button |
| 9.2 | Submit a swap | If success → Suiscan link. If fail → error banner + dismiss |
| 9.3 | Go offline during a transaction | Offline banner appears. Reconnect → transactions resume. |

---

## Pass Criteria

- [ ] All pages load without crashing
- [ ] All modals open/close (backdrop click + Escape key)
- [ ] All buttons are either clickable or clearly disabled with reason
- [ ] No infinite spinners (30s timeout cuts off any stuck loading)
- [ ] Console shows zero errors during normal operation
- [ ] Offline detection works (airplane mode toggle)
