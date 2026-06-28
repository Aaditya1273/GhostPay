import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Transaction } from "@mysten/sui/transactions";
import {
  SuiTransactionBlockResponse,
  SuiTransactionBlockResponseOptions,
} from "@mysten/sui/client";
import { useCurrentAccount, useCurrentWallet, useDisconnectWallet, useSignTransaction, useSuiClient } from "@mysten/dapp-kit";
import { useEnokiFlow, useZkLogin, useZkLoginSession } from "@mysten/enoki/react";
import clientConfig from "@/config/clientConfig";
import { useRouter } from "next/navigation";
import { SponsorTxRequestBody } from "@/types/SponsorTx";
import { fromB64, toB64 } from "@mysten/sui/utils";
import axios, { AxiosResponse } from "axios";
import { useAuthentication } from "./Authentication";
import { UserRole } from "@/types/Authentication";
import { jwtDecode } from "jwt-decode";
import { toast } from "sonner";

export interface CreateSponsoredTransactionApiResponse {
  bytes: string;
  digest: string;
}

export interface ExecuteSponsoredTransactionApiInput {
  digest: string;
  signature: string;
}


interface SponsorAndExecuteTransactionBlockProps {
  tx: Transaction;
  network: "mainnet" | "testnet";
  options: SuiTransactionBlockResponseOptions;
  includesTransferTx: boolean;
  allowedAddresses?: string[];
  allowedMoveCallTargets?: string[];
}

interface ExecuteTransactionBlockWithoutSponsorshipProps {
  tx: Transaction;
  options: SuiTransactionBlockResponseOptions;
}
interface CustomWalletContextProps {
  isConnected: boolean;
  isUsingEnoki: boolean;
  address?: string;
  jwt?: string;
  emailAddress: string | null;
  authLoading: boolean;
  getAddressSeed: () => Promise<string>;
  sponsorAndExecuteTransactionBlock: (
    props: SponsorAndExecuteTransactionBlockProps
  ) => Promise<SuiTransactionBlockResponse>;
  executeTransactionBlockWithoutSponsorship: (
    props: ExecuteTransactionBlockWithoutSponsorshipProps
  ) => Promise<SuiTransactionBlockResponse | void>;
  logout: () => void;
  redirectToAuthUrl: () => void;
}

export const useCustomWallet = () => {
  const context = useContext(CustomWalletContext);
  return context;
};

export const CustomWalletContext = createContext<CustomWalletContextProps>({
  isConnected: false,
  isUsingEnoki: false,
  address: undefined,
  jwt: undefined,
  emailAddress: null,
  authLoading: false,
  getAddressSeed: async () => "",
  sponsorAndExecuteTransactionBlock: async () => {
    throw new Error("Not implemented");
  },
  executeTransactionBlockWithoutSponsorship: async () => {},
  logout: () => {},
  redirectToAuthUrl: () => {},
});

export default function CustomWalletProvider({children}: {children: React.ReactNode}) {
  const suiClient = useSuiClient();
  const router = useRouter();
  const { address: enokiAddress } = useZkLogin();
  const zkLoginSession = useZkLoginSession();
  const enokiFlow = useEnokiFlow();
  const { handleLoginAs } = useAuthentication();

  const currentAccount = useCurrentAccount();
  const { isConnected: isWalletConnected } = useCurrentWallet();
  const { mutateAsync: signTransactionBlock } = useSignTransaction();
  const { mutate: disconnect } = useDisconnectWallet();

  const [emailAddress, setEmailAddress] = useState<string | null>(null);

  const { isConnected, isUsingEnoki, address, logout } = useMemo(() => {
    return {
      isConnected: !!enokiAddress || isWalletConnected,
      isUsingEnoki: !!enokiAddress,
      address: enokiAddress || currentAccount?.address,
      logout: () => {
        if (isUsingEnoki) {
          enokiFlow.logout();     
        } else {
          disconnect();
        }
        sessionStorage.clear();
        window.location.href = "/";
      },
    };
  }, [
    enokiAddress,
    currentAccount?.address,
    enokiFlow,
    isWalletConnected,
    disconnect,
  ]);

  useEffect(() => {
    if (isConnected && zkLoginSession && zkLoginSession.jwt) {
      const token = zkLoginSession.jwt;
      const decoded = jwtDecode(token);

      setEmailAddress((decoded as any).email);

      handleLoginAs({
        firstName: "Wallet",
        lastName: "User",
        role:
          sessionStorage.getItem("userRole") !== "null"
            ? (sessionStorage.getItem("userRole") as UserRole)
            : "anonymous",
        email: (decoded as any).email,
        picture: "",
      });  
    }
  }, [isConnected, isWalletConnected, handleLoginAs, zkLoginSession]);

  const getAddressSeed = async (): Promise<string> => {
    if (isUsingEnoki) {
      const { addressSeed } = await enokiFlow.getProof({
        network: clientConfig.SUI_NETWORK_NAME,
      });
      return addressSeed;
    }
    return "";
  };

  const [authLoading, setAuthLoading] = useState(false);

  const redirectToAuthUrl = () => {
    if (authLoading) return; // prevent double-clicks
    setAuthLoading(true);
    const protocol = window.location.protocol;
    const host = window.location.host;
    const customRedirectUri = `${protocol}//${host}/auth`;
    enokiFlow
      .createAuthorizationURL({
        provider: "google",
        network: clientConfig.SUI_NETWORK_NAME,
        clientId: clientConfig.GOOGLE_CLIENT_ID,
        redirectUrl: customRedirectUri,
        extraParams: {
          scope: ["openid", "email", "profile"],
        },
      })
      .then((url) => {
        router.push(url);
        // Keep loading state until navigation completes
      })
      .catch((err) => {
        console.error(err);
        setAuthLoading(false);
        toast.error(
          err?.message ||
            "Google sign-in failed. Check your network and try again.",
        );
      });
  };

  const signTransaction = async (bytes: Uint8Array): Promise<string> => {
    if (isUsingEnoki) {
      const signer = await enokiFlow.getKeypair({
        network: clientConfig.SUI_NETWORK_NAME,
      });
      const signature = await signer.signTransaction(bytes);
      return signature.signature;
    }
    return signTransactionBlock({
      transaction: toB64(bytes),
      chain: `sui:${clientConfig.SUI_NETWORK_NAME}`,
    }).then((resp) => resp.signature);
  };

  const sponsorAndExecuteTransactionBlock = async ({
    tx,
    network,
    options,
    includesTransferTx,
    allowedAddresses = [],
    allowedMoveCallTargets,
  }: SponsorAndExecuteTransactionBlockProps): Promise<SuiTransactionBlockResponse> => {
    if (!isConnected) {
      throw new Error("Wallet is not connected");
    }
    try {
      let digest = "";
      if (!isUsingEnoki || includesTransferTx) {
        // Sponsorship will happen in the back-end
        const txBytes = await tx.build({
          client: suiClient,
          onlyTransactionKind: true,
        });
        const sponsorTxBody: SponsorTxRequestBody = {
          network,
          txBytes: toB64(txBytes),
          sender: address!,
          allowedAddresses,
          allowedMoveCallTargets,
        };
        const sponsorResponse: AxiosResponse<CreateSponsoredTransactionApiResponse> =
          await axios.post("/api/sponsor", sponsorTxBody, { 
            timeout: 30_000,
            headers: zkLoginSession?.jwt ? {
              Authorization: `Bearer ${zkLoginSession.jwt}`
            } : undefined
          });
        const { bytes, digest: sponsorDigest } = sponsorResponse.data;
        const signature = await signTransaction(fromB64(bytes));
        const executeSponsoredTxBody: ExecuteSponsoredTransactionApiInput = {
          signature,
          digest: sponsorDigest,
        };
        const executeResponse: AxiosResponse<{ digest: string }> =
          await axios.post("/api/execute", executeSponsoredTxBody, { 
            timeout: 30_000,
            headers: zkLoginSession?.jwt ? {
              Authorization: `Bearer ${zkLoginSession.jwt}`
            } : undefined
          });
        digest = executeResponse.data.digest;
        console.log("[GhostPay] Execute returned digest:", digest);
        console.log(`[GhostPay] Verify on explorer: https://testnet.suivision.xyz/txblock/${digest}`);
      } else {
        // Sponsorship can happen in the front-end
        const response = await enokiFlow.sponsorAndExecuteTransaction({
          network: clientConfig.SUI_NETWORK_NAME,
          transaction: tx,
          client: suiClient,
        });
        digest = response.digest;
        console.log("[GhostPay] EnokiFlow digest:", digest);
      }
      console.log("[GhostPay] Polling for transaction confirmation:", digest);
      // waitForTransaction uses WebSocket subscriptions which may be blocked.
      // Poll via HTTP RPC instead — much more reliable.
      let confirmed = false;
      for (let i = 0; i < 20; i++) {
        try {
          const check = await suiClient.getTransactionBlock({ digest, options: {} });
          if (check?.digest) {
            confirmed = true;
            console.log("[GhostPay] Transaction confirmed on chain! Digest:", digest);
            console.log(`[GhostPay] Explorer: https://testnet.suivision.xyz/txblock/${digest}`);
            break;
          }
        } catch (_) {
          // not indexed yet, keep polling
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (!confirmed) {
        console.warn("[GhostPay] Transaction not confirmed after 30s, digest:", digest);
        throw new Error(`Transaction not confirmed on chain. Digest: ${digest}`);
      }
      return suiClient.getTransactionBlock({
        digest,
        options,
      });
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        console.error("Backend Error Status:", err.response?.status);
        console.error("Backend Error Data:", JSON.stringify(err.response?.data, null, 2));

        if (err.response?.status === 401) {
          toast.error("Session expired. Please log in again.");
          logout();
        }
      } else {
        console.error("Sponsor/execute failed:", err);
      }
      
      // Pass through the original error message if available;
      if (err.response?.data?.error) {
        throw new Error(err.response.data.error);
      } else if (err instanceof Error) {
        throw err;
      }
      throw new Error("Failed to sponsor and execute transaction block");
    }
  };

  // some transactions cannot be sponsored by Enoki in its current state
  // for example when want to use the gas coin as an argument in a move call
  // so we provide an additional method to execute transactions without sponsorship
  const executeTransactionBlockWithoutSponsorship = async ({
    tx,
    options,
  }: ExecuteTransactionBlockWithoutSponsorshipProps): Promise<SuiTransactionBlockResponse | void> => {
    if (!isConnected) {
      return;
    }
    tx.setSender(address!);
    const txBytes = await tx.build({ client: suiClient });
    const signature = await signTransaction(txBytes);
    return suiClient.executeTransactionBlock({
      transactionBlock: txBytes,
      signature: signature!,
      requestType: "WaitForLocalExecution",
      options,
    });
  };
  
  
  return (
    <CustomWalletContext.Provider
      value={{
        isConnected,
        isUsingEnoki,
        address,
        jwt: zkLoginSession?.jwt,
        emailAddress,
        authLoading,
        sponsorAndExecuteTransactionBlock,
        executeTransactionBlockWithoutSponsorship,
        logout,
        redirectToAuthUrl,
        getAddressSeed,
      }}
    >
      {children}
    </CustomWalletContext.Provider>
  );
}