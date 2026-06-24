import clientConfig from "@/config/clientConfig";
import { useCustomWallet } from "@/contexts/CustomWallet";
import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";

/** Sui Clock shared object ID (same on all networks) */
const CLOCK_ID = "0x6";

/** GhostPayState shared object — created during publish */
const GHOSTPAY_STATE_ID =
  process.env.NEXT_PUBLIC_GHOSTPAY_STATE_ID ||
  "0x6c7c1188cd3299591b4ef7f69156a8c2a96982babffb5043007a91a7adca9c1a";

export function useAgentTransaction() {
  const { sponsorAndExecuteTransactionBlock, address } = useCustomWallet();

  const createAgent = async (
    name: string,
    emailHash: string
  ): Promise<SuiTransactionBlockResponse> => {
    const txb = new Transaction();

    txb.moveCall({
      target: `${clientConfig.PACKAGE_ID}::agent::create_agent`,
      arguments: [
        txb.pure.string(name),
        txb.pure.string(emailHash),
        txb.object(GHOSTPAY_STATE_ID),
        txb.object(CLOCK_ID),
      ],
    });

    return sponsorAndExecuteTransactionBlock({
      tx: txb,
      network: clientConfig.SUI_NETWORK_NAME,
      includesTransferTx: true,
      allowedAddresses: [address!],
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
  };

  const updateDisplayName = async (
    agentId: string,
    name: string
  ): Promise<SuiTransactionBlockResponse> => {
    const txb = new Transaction();

    txb.moveCall({
      target: `${clientConfig.PACKAGE_ID}::agent::update_display_name`,
      arguments: [txb.object(agentId), txb.pure.string(name)],
    });

    return sponsorAndExecuteTransactionBlock({
      tx: txb,
      network: clientConfig.SUI_NETWORK_NAME,
      includesTransferTx: true,
      allowedAddresses: [address!],
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
  };

  const deactivateAgent = async (
    agentId: string
  ): Promise<SuiTransactionBlockResponse> => {
    const txb = new Transaction();

    txb.moveCall({
      target: `${clientConfig.PACKAGE_ID}::agent::deactivate_agent`,
      arguments: [txb.object(agentId)],
    });

    return sponsorAndExecuteTransactionBlock({
      tx: txb,
      network: clientConfig.SUI_NETWORK_NAME,
      includesTransferTx: true,
      allowedAddresses: [address!],
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
  };

  const grantCapability = async (
    agentId: string,
    delegate: string,
    expiresAt: number
  ): Promise<SuiTransactionBlockResponse> => {
    const txb = new Transaction();

    txb.moveCall({
      target: `${clientConfig.PACKAGE_ID}::agent::grant_capability`,
      arguments: [
        txb.object(agentId),
        txb.pure.address(delegate),
        txb.pure.u64(expiresAt),
        txb.object(CLOCK_ID),
      ],
    });

    return sponsorAndExecuteTransactionBlock({
      tx: txb,
      network: clientConfig.SUI_NETWORK_NAME,
      includesTransferTx: true,
      allowedAddresses: [address!],
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
  };

  return { createAgent, updateDisplayName, deactivateAgent, grantCapability };
}
