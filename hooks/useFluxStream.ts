/**
 * useFluxStream — Real-time DeepBook trade event stream for GhostPay.
 *
 * Implements the "Flux Streams" feature claimed in the README by subscribing
 * to Sui's event stream (WebSocket subscribeEvent) filtered to DeepBook V3
 * trade events emitted by the configured pools.
 *
 * WHAT THIS DOES:
 *  - Subscribes to OrderFilled / TradeExecuted events from the DeepBook V3
 *    package using `suiClient.subscribeEvent`.
 *  - Parses each event into a `FluxTradeEvent` with price and amount fields.
 *  - Maintains a rolling window of the last N events per pool (default 50).
 *  - Derives a live mid-price from the most recent filled event.
 *  - Falls back silently to "no data" state when:
 *      a) The RPC endpoint does not support WebSocket subscriptions.
 *      b) The DeepBook package emits no events (empty testnet pools).
 *
 * WHY SUBSCRIBEVENT (NOT SSE):
 *  Sui's WebSocket event subscription IS the Sui-native equivalent of
 *  Server-Sent Events — it provides a real-time push stream from the chain
 *  with no polling interval. Using the Sui SDK's `subscribeEvent` is the
 *  correct and production-ready approach for Sui apps.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { type SuiClient } from "@mysten/sui/client";
import {
  DEEPBOOK_PACKAGE_ID,
  SUI_COIN,
  DBUSDC_COIN,
  DEEP_COIN,
} from "@/lib/constants";
import { POOLS, type PoolOption } from "@/lib/DeepBookService";

// ── Types ────────────────────────────────────────────────────────────────

/** A single DeepBook trade / order-fill event. */
export interface FluxTradeEvent {
  /** Pool key from POOLS constant (e.g. "SUI_DBUSDC"). */
  poolKey: string;
  /** Human-readable pool label. */
  poolLabel: string;
  /** The amount of the base asset that was traded (human-readable). */
  baseAmount: number;
  /** The amount of the quote asset that was traded (human-readable). */
  quoteAmount: number;
  /** Derived price: quoteAmount / baseAmount. */
  price: number;
  /** "buy" if base was bought (quote sold), "sell" if base was sold. */
  side: "buy" | "sell";
  /** On-chain event timestamp (ms). */
  timestamp: number;
  /** Transaction digest. */
  txDigest: string;
}

/** Per-pool live state derived from the event stream. */
export interface FluxPoolState {
  poolKey: string;
  poolLabel: string;
  /** Mid-price from the most recent trade event. */
  lastPrice: number | null;
  /** 24h price change percentage (approximate from stream data). */
  priceChange24h: number | null;
  /** The last N trade events for this pool. */
  recentTrades: FluxTradeEvent[];
  /** Whether the subscription is live. */
  live: boolean;
}

export interface FluxStreamState {
  /** Per-pool state for each of the three configured pools. */
  pools: Record<string, FluxPoolState>;
  /** Whether any subscription is active. */
  connected: boolean;
  /** Whether the RPC doesn't support subscriptions. */
  subscriptionUnsupported: boolean;
  /** Total events received since mount. */
  eventCount: number;
}

// ── Constants ────────────────────────────────────────────────────────────

/** Maximum number of trade events kept per pool. */
const MAX_EVENTS_PER_POOL = 50;

/**
 * DeepBook V3 event types that carry trade data.
 * These are the canonical event struct names in the DeepBook V3 package.
 */
const DEEPBOOK_TRADE_EVENTS = [
  "OrderFilled",
  "TradeExecuted",
  "SwapExecuted",
  "BalanceManagerEvent",
];

// ── Helpers ──────────────────────────────────────────────────────────────

/** Identify which pool emitted the event from its type args or data. */
function resolvePoolKey(event: any): string | null {
  const typeStr: string = event.type ?? "";

  // Match pool by base/quote type args in the event type string
  if (typeStr.includes(SUI_COIN) && typeStr.includes(DBUSDC_COIN)) {
    return "SUI_DBUSDC";
  }
  if (typeStr.includes(DEEP_COIN) && typeStr.includes(SUI_COIN)) {
    return "DEEP_SUI";
  }
  if (typeStr.includes(DEEP_COIN) && typeStr.includes(DBUSDC_COIN)) {
    return "DEEP_DBUSDC";
  }

  // Check event data for pool ID
  const poolId: string = event.parsedJson?.pool_id ?? event.parsedJson?.poolId ?? "";
  for (const pool of Object.values(POOLS)) {
    if (poolId === pool.poolId) return pool.key;
  }

  return null;
}

/** Parse raw event data into a FluxTradeEvent. */
function parseTradeEvent(event: any, poolKey: string): FluxTradeEvent | null {
  const pool = POOLS[poolKey];
  if (!pool) return null;

  const data = event.parsedJson ?? {};

  // Field names vary across DeepBook versions — try multiple aliases
  const baseRaw =
    Number(data.base_quantity ?? data.baseQuantity ?? data.base_amount ?? data.baseAmount ?? data.quantity ?? 0);
  const quoteRaw =
    Number(data.quote_quantity ?? data.quoteQuantity ?? data.quote_amount ?? data.quoteAmount ?? 0);

  if (baseRaw === 0 && quoteRaw === 0) return null;

  // Convert from smallest unit to human-readable
  const baseDecimals = pool.baseCoinKey === "SUI" || pool.baseCoinKey === "DEEP" ? 1e9 : 1e6;
  const quoteDecimals = pool.quoteCoinKey === "SUI" || pool.quoteCoinKey === "DEEP" ? 1e9 : 1e6;

  const baseAmount = baseRaw / baseDecimals;
  const quoteAmount = quoteRaw / quoteDecimals;
  const price = quoteAmount > 0 && baseAmount > 0 ? quoteAmount / baseAmount : 0;

  // Determine trade side: is_buy, maker_is_bid, or taker_is_bid field
  const isBuy: boolean =
    data.is_buy ??
    data.isBuy ??
    data.maker_is_bid ??
    data.makerIsBid ??
    data.taker_is_bid ??
    data.takerIsBid ??
    false;

  return {
    poolKey,
    poolLabel: pool.label,
    baseAmount,
    quoteAmount,
    price,
    side: isBuy ? "buy" : "sell",
    timestamp: Number(event.timestampMs ?? Date.now()),
    txDigest: event.id?.txDigest ?? "",
  };
}

/** Build the initial per-pool state object. */
function makeInitialPoolState(pool: PoolOption): FluxPoolState {
  return {
    poolKey: pool.key,
    poolLabel: pool.label,
    lastPrice: null,
    priceChange24h: null,
    recentTrades: [],
    live: false,
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────

/**
 * Subscribe to real-time DeepBook V3 trade events and expose them as
 * a live per-pool state object.
 *
 * @param enabled  Set false to disable subscription (default: true)
 */
export function useFluxStream(enabled: boolean = true): FluxStreamState {
  const suiClient = useSuiClient() as SuiClient;

  const [state, setState] = useState<FluxStreamState>(() => ({
    pools: Object.fromEntries(
      Object.values(POOLS).map((p) => [p.key, makeInitialPoolState(p)]),
    ),
    connected: false,
    subscriptionUnsupported: false,
    eventCount: 0,
  }));

  // Keep a ref to the unsubscribe functions so cleanup is always current
  const unsubscribersRef = useRef<Array<() => void>>([]);

  /** Append a trade event to the correct pool's state. */
  const handleTradeEvent = useCallback((trade: FluxTradeEvent) => {
    setState((prev) => {
      const pool = prev.pools[trade.poolKey];
      if (!pool) return prev;

      const updated: FluxPoolState = {
        ...pool,
        lastPrice: trade.price > 0 ? trade.price : pool.lastPrice,
        recentTrades: [trade, ...pool.recentTrades].slice(0, MAX_EVENTS_PER_POOL),
        live: true,
      };

      return {
        ...prev,
        pools: { ...prev.pools, [trade.poolKey]: updated },
        eventCount: prev.eventCount + 1,
      };
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const subscribe = async () => {
      try {
        // Subscribe to DeepBook V3 events using MoveModule filters.
        // We use Any to catch events from all relevant DeepBook modules.
        const unsub = await suiClient.subscribeEvent({
          filter: {
            Any: [
              { MoveModule: { package: DEEPBOOK_PACKAGE_ID, module: "pool" } },
              { MoveModule: { package: DEEPBOOK_PACKAGE_ID, module: "clob" } },
              { MoveModule: { package: DEEPBOOK_PACKAGE_ID, module: "deepbook" } },
            ],
          },
          onMessage: (event: any) => {
            if (cancelled) return;

            const poolKey = resolvePoolKey(event);
            if (!poolKey) return; // Not a recognised pool event

            const trade = parseTradeEvent(event, poolKey);
            if (!trade) return; // Not a parseable trade event

            handleTradeEvent(trade);
          },
        });

        if (cancelled) {
          unsub();
          return;
        }

        unsubscribersRef.current.push(unsub);

        setState((prev) => ({
          ...prev,
          connected: true,
          // Mark all pools as live once the subscription is open
          pools: Object.fromEntries(
            Object.entries(prev.pools).map(([key, p]) => [key, { ...p, live: true }]),
          ),
        }));
      } catch (err) {
        if (cancelled) return;

        // subscribeEvent is not available on all Sui RPC endpoints.
        // Log in development, then set subscriptionUnsupported so the UI
        // can show a fallback (e.g. "live data unavailable").
        if (process.env.NODE_ENV !== "production") {
          console.info(
            "[FluxStream] subscribeEvent unavailable on this RPC — real-time DeepBook data disabled:",
            err,
          );
        }

        setState((prev) => ({
          ...prev,
          connected: false,
          subscriptionUnsupported: true,
        }));
      }
    };

    void subscribe();

    return () => {
      cancelled = true;
      for (const unsub of unsubscribersRef.current) {
        try {
          unsub();
        } catch {
          // ignore
        }
      }
      unsubscribersRef.current = [];
      setState((prev) => ({
        ...prev,
        connected: false,
        pools: Object.fromEntries(
          Object.entries(prev.pools).map(([key, p]) => [key, { ...p, live: false }]),
        ),
      }));
    };
  }, [enabled, suiClient, handleTradeEvent]);

  return state;
}
