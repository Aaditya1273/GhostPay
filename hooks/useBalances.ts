import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useCustomWallet } from "@/contexts/CustomWallet";
import { SUI_COIN, DBUSDC_COIN, DEEP_COIN } from "@/lib/constants";
import { useEffect, useRef } from "react";

export interface Balances {
  /** SUI balance in SUI (9 decimal places → divided by 1e9). */
  sui: number;
  /** DBUSDC balance in USDC units (6 decimal places → divided by 1e6). */
  usdc: number;
  /** DEEP balance in DEEP units (9 decimal places → divided by 1e9). */
  deep: number;
  isLoading: boolean;
  refetch: () => void;
}

/**
 * Hook that queries real SUI, DBUSDC, and DEEP balances from the chain.
 *
 * Polling strategy (two-tier):
 *   - Passive refetchInterval: every 15s (always on)
 *   - Rapid refresh: every 3s for 30s immediately after the component
 *     detects an incoming fund event (via a custom window event dispatched
 *     by useIncomingFundDetector).
 */
export function useBalances() {
  const { address } = useCustomWallet();
  // Controls how frequently React Query polls
  const refetchIntervalRef = useRef<number>(15_000);

  const suiBalance = useSuiClientQuery(
    "getBalance",
    { owner: address!, coinType: SUI_COIN },
    {
      enabled: !!address,
      refetchInterval: 15_000,
    }
  );

  const usdcBalance = useSuiClientQuery(
    "getBalance",
    { owner: address!, coinType: DBUSDC_COIN },
    {
      enabled: !!address,
      refetchInterval: 15_000,
    }
  );

  const deepBalance = useSuiClientQuery(
    "getBalance",
    { owner: address!, coinType: DEEP_COIN },
    {
      enabled: !!address,
      refetchInterval: 15_000,
    }
  );

  // Listen for the "ghostpay:incoming-funds" custom event dispatched by
  // useIncomingFundDetector and immediately trigger a manual refetch so
  // the UI shows new balances without waiting for the next 15s cycle.
  useEffect(() => {
    const handler = () => {
      suiBalance.refetch();
      usdcBalance.refetch();
      deepBalance.refetch();
    };
    window.addEventListener("ghostpay:incoming-funds", handler);
    return () => window.removeEventListener("ghostpay:incoming-funds", handler);
  }, [suiBalance, usdcBalance, deepBalance]);

  const sui = suiBalance.data
    ? Number(suiBalance.data.totalBalance) / 1_000_000_000
    : 0;

  const usdc = usdcBalance.data
    ? Number(usdcBalance.data.totalBalance) / 1_000_000
    : 0;

  const deep = deepBalance.data
    ? Number(deepBalance.data.totalBalance) / 1_000_000_000
    : 0;

  return {
    sui,
    usdc,
    deep,
    isLoading: suiBalance.isPending || usdcBalance.isPending || deepBalance.isPending,
    refetch: () => {
      suiBalance.refetch();
      usdcBalance.refetch();
      deepBalance.refetch();
    },
  };
}
