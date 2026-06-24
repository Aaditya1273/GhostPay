"use client";
import "./mockStorage";

import { AuthenticationProvider } from "@/contexts/Authentication";
import { ChildrenProps } from "@/types/ChildrenProps";
import React from "react";
import { EnokiFlowProvider } from "@mysten/enoki/react";
import {
  createNetworkConfig,
  SuiClientProvider,
  WalletProvider,
} from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { registerStashedWallet } from "@mysten/zksend";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import clientConfig from "@/config/clientConfig";
import "@mysten/dapp-kit/dist/index.css";
import CustomWalletProvider from "@/contexts/CustomWallet";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { Analytics } from '@vercel/analytics/react';

export interface StorageAdapter {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
}

const sessionStorageAdapter: StorageAdapter = {
  getItem: async (key) => {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      window.sessionStorage.setItem(key, value);
    } catch {}
  },
  removeItem: async (key) => {
    try {
      window.sessionStorage.removeItem(key);
    } catch {}
  },
};

registerStashedWallet("Breaking the Ice - Community Vote", {});

export const ProvidersAndLayout = ({ children }: ChildrenProps) => {
  const { networkConfig } = createNetworkConfig({
    testnet: { url: getFullnodeUrl("testnet") },
    mainnet: { url: getFullnodeUrl("mainnet") },
  });

  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider
        networks={networkConfig}
        defaultNetwork={clientConfig.SUI_NETWORK_NAME}
      >
        <WalletProvider
          autoConnect
          stashedWallet={{
            name: "Breaking the Ice - Community Vote",
          }}
          storage={sessionStorageAdapter}
        >
          <EnokiFlowProvider apiKey={clientConfig.ENOKI_API_KEY}>
            <AuthenticationProvider>
              <CustomWalletProvider>
                <ThemeProvider
                  attribute="class"
                  defaultTheme="dark"
                  enableSystem={false}
                  disableTransitionOnChange
                >
                  <main>
                    {children}
                    <Toaster duration={2000} />
                    <Analytics />
                  </main>
                </ThemeProvider>
              </CustomWalletProvider>
            </AuthenticationProvider>
          </EnokiFlowProvider>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
};
