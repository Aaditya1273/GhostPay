/**
 * useIncomingFundDetector — Real-time incoming fund detection via Sui RPC.
 *
 * Strategy:
 *  1. Opens a WebSocket subscription to `subscribeTransaction` filtered
 *     to transactions that affect the user's address (AffectedAddresses).
 *  2. When any such transaction is confirmed, dispatches a custom DOM event
 *     "ghostpay:incoming-funds" so useBalances immediately refetches.
 *  3. Falls back gracefully to silent no-op if the RPC does not support
 *     subscriptions (some public endpoints disable it).
 *
 * Mount once in ProvidersAndLayout — renders nothing.
 */

"use client";

import { useEffect, useRef } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { useCustomWallet } from "@/contexts/CustomWallet";
import { SuiClient } from "@mysten/sui/client";

/**
 * Dispatch the custom event so useBalances force-refetches immediately.
 */
function notifyIncomingFunds() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ghostpay:incoming-funds"));
  }
}

export function useIncomingFundDetector() {
  const { address } = useCustomWallet();
  const suiClient = useSuiClient() as SuiClient;
  // Store the unsubscribe function so we can clean up on address change
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!address) return;

    let cancelled = false;

    /**
     * Attempt to open a real-time transaction subscription.
     * `subscribeTransaction` notifies us whenever a transaction touches
     * the given address — both sends and receives.
     */
    const subscribe = async () => {
      try {
        const unsub = await suiClient.subscribeTransaction({
          filter: {
            FromOrToAddress: { addr: address },
          },
          onMessage: (effect) => {
            if (cancelled) return;
            // We don't need to parse the full effect — any transaction
            // touching our address is worth re-checking the balance.
            notifyIncomingFunds();
          },
        });

        if (cancelled) {
          // Effect ran after cleanup — unsubscribe immediately
          unsub();
          return;
        }

        unsubscribeRef.current = unsub;
      } catch (err) {
        // subscribeTransaction is not available on all RPC endpoints
        // (e.g. some public fullnodes disable WebSocket subscriptions).
        // Fall back silently — useBalances still polls every 15s.
        if (process.env.NODE_ENV !== "production") {
          console.info(
            "[GhostPay] subscribeTransaction unavailable — falling back to 15s polling:",
            err,
          );
        }
      }
    };

    void subscribe();

    return () => {
      cancelled = true;
      if (unsubscribeRef.current) {
        try {
          unsubscribeRef.current();
        } catch {
          // ignore unsubscribe errors on cleanup
        }
        unsubscribeRef.current = null;
      }
    };
  }, [address, suiClient]);
}
