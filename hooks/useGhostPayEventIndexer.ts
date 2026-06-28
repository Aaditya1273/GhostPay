/**
 * useGhostPayEventIndexer — Event-driven cache invalidation.
 *
 * Replaces the 10-15s polling architecture (refetchInterval) with
 * cursor-based Sui event polling.
 *
 * HOW IT WORKS
 * ────────────
 *  1. On mount, fetches the most recent GhostPay event to establish a cursor.
 *  2. Polls queryEvents({ Package: PACKAGE_ID }) every 5s with the cursor.
 *  3. When new events arrive, invalidates the relevant React Query caches
 *     (getOwnedObjects / getBalance) so mounted hooks refetch immediately.
 *  4. Updates the cursor to the last processed event — no duplicate fetches.
 *
 * EVENT → CACHE MAPPING
 * ─────────────────────
 *  AgentCreatedEvent         → getOwnedObjects
 *  AgentUpdatedEvent         → getOwnedObjects
 *  AgentDeactivatedEvent     → getOwnedObjects
 *  PaymentInitiatedEvent     → getOwnedObjects
 *  PaymentStatusChangedEvent → getOwnedObjects
 *  MemoryStoredEvent         → getOwnedObjects
 *  MemoryVisibilityChangedEvent → getOwnedObjects
 *  ViewKeyCreatedEvent       → getOwnedObjects
 *  ViewKeyRevokedEvent       → getOwnedObjects
 *  DataAccessedEvent         → getOwnedObjects
 *  SealApprovalEvent         → getOwnedObjects
 *  ANY GhostPay event        → getBalance (balances may have changed)
 */

import { useEffect, useRef } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { useQueryClient } from "@tanstack/react-query";
import { useCustomWallet } from "@/contexts/CustomWallet";
import clientConfig from "@/config/clientConfig";

const PACKAGE_ID = clientConfig.PACKAGE_ID;
const isPackageDeployed = !!(PACKAGE_ID && PACKAGE_ID !== "0x0");

/**
 * GhostPay module names used in SuiEventFilter.
 * Matches any event emitted by any GhostPay module.
 */
const GHOSTPAY_MODULES = ["agent", "payment", "memory", "compliance"];

/**
 * Build the SuiEventFilter to capture all GhostPay events.
 * Uses `Any` with one `MoveModule` filter per GhostPay module.
 */
function ghostPayEventFilter(): { Any: { MoveModule: { package: string; module: string } }[] } {
  return {
    Any: GHOSTPAY_MODULES.map((mod) => ({
      MoveModule: { package: PACKAGE_ID!, module: mod },
    })),
  };
}

/**
 * Polls GhostPay events every 5s and invalidates relevant React Query caches.
 *
 * Mount this ONCE in the app layout. It renders nothing.
 * Every query hook that removed its refetchInterval will still update
 * because React Query refetches after cache invalidation.
 */
export function useGhostPayEventIndexer() {
  const client = useSuiClient();
  const queryClient = useQueryClient();
  const { address } = useCustomWallet();

  // Persistent cursor across re-renders — never triggers effect re-runs
  const cursorRef = useRef<{ txDigest: string; eventSeq: string } | null>(null);

  useEffect(() => {
    if (!address || !isPackageDeployed) return;

    let isCancelled = false;

    /**
     * Any GhostPay event means on-chain state changed — invalidate all
     * relevant queries. Only mounted hooks actually refetch (React Query
     * deduplicates).
     */
    const invalidateQueries = () => {
      queryClient.invalidateQueries({ queryKey: ["getOwnedObjects"] });
      queryClient.invalidateQueries({ queryKey: ["getBalance"] });
    };

    /**
     * Single poll cycle: fetch new events since cursor, invalidate caches.
     */
    const poll = async () => {
      try {
        const result = await client.queryEvents({
          query: ghostPayEventFilter(),
          cursor: cursorRef.current,
          limit: 100,
          order: "ascending",
        });

        if (result.data.length > 0) {
          invalidateQueries();
          // Advance cursor to the last event returned
          const last = result.data[result.data.length - 1];
          cursorRef.current = {
            txDigest: last.id.txDigest,
            eventSeq: last.id.eventSeq,
          };
        }
      } catch {
        // Silently retry on next interval
      }
    };

    /**
     * Establish initial cursor by fetching the single most recent event.
     * After this, poll() only returns events AFTER the cursor.
     */
    const initCursor = async () => {
      try {
        const result = await client.queryEvents({
          query: ghostPayEventFilter(),
          limit: 1,
          order: "descending",
        });
        if (result.data.length > 0) {
          cursorRef.current = result.data[0].id;
        }
      } catch {
        // If event querying is not supported, we fall back silently.
      }
    };

    // Bootstrap
    initCursor().then(() => {
      if (!isCancelled) poll();
    });

    // Poll every 5 seconds
    const interval = setInterval(() => {
      if (!isCancelled) poll();
    }, 5_000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [address, client, queryClient]);
}
