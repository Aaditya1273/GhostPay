import clientConfig from "@/config/clientConfig";
import { useCustomWallet } from "@/contexts/CustomWallet";
import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { CLOCK_ID, GHOSTPAY_STATE_ID } from "@/lib/constants";

export function useAgentTransaction() {
  const { sponsorAndExecuteTransactionBlock, address } = useCustomWallet();

  const createAgent = async (
    name: string,
    emailHash: string
  ): Promise<SuiTransactionBlockResponse> => {
    const txb = new Transaction();

    const [agent] = txb.moveCall({
      target: `${clientConfig.PACKAGE_ID}::agent::create_agent`,
      arguments: [
        txb.pure.string(name),
        txb.pure.string(emailHash),
        txb.object(GHOSTPAY_STATE_ID),
        txb.object(CLOCK_ID),
      ],
    });

    txb.transferObjects([agent], address!);


    return sponsorAndExecuteTransactionBlock({
      tx: txb,
      network: clientConfig.SUI_NETWORK_NAME,
      includesTransferTx: true,
      allowedAddresses: [address!],
      allowedMoveCallTargets: [`${clientConfig.PACKAGE_ID}::agent::create_agent`],
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
      allowedMoveCallTargets: [`${clientConfig.PACKAGE_ID}::agent::update_display_name`],
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
      allowedMoveCallTargets: [`${clientConfig.PACKAGE_ID}::agent::deactivate_agent`],
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
      allowedMoveCallTargets: [`${clientConfig.PACKAGE_ID}::agent::grant_capability`],
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
  };

  return { createAgent, updateDisplayName, deactivateAgent, grantCapability };
}
