import clientConfig from "@/config/clientConfig";
import { useCustomWallet } from "@/contexts/CustomWallet";
import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";

/** Sui Clock shared object ID (same on all networks) */
const CLOCK_ID = "0x6";

export function useComplianceTransaction() {
  const { sponsorAndExecuteTransactionBlock, address } = useCustomWallet();

  const createViewKey = async (
    agentId: string,
    viewer: string,
    label: string,
    expiresAt: number
  ): Promise<SuiTransactionBlockResponse> => {
    const txb = new Transaction();

    txb.moveCall({
      target: `${clientConfig.PACKAGE_ID}::compliance::create_view_key`,
      arguments: [
        txb.object(agentId),
        txb.pure.address(viewer),
        txb.pure.string(label),
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

  const revokeViewKey = async (
    viewKeyId: string
  ): Promise<SuiTransactionBlockResponse> => {
    const txb = new Transaction();

    txb.moveCall({
      target: `${clientConfig.PACKAGE_ID}::compliance::revoke_view_key`,
      arguments: [txb.object(viewKeyId)],
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

  const logAccess = async (
    agentId: string,
    viewer: string,
    action: string,
    resource: string
  ): Promise<SuiTransactionBlockResponse> => {
    const txb = new Transaction();

    txb.moveCall({
      target: `${clientConfig.PACKAGE_ID}::compliance::log_access`,
      arguments: [
        txb.object(agentId),
        txb.pure.address(viewer),
        txb.pure.string(action),
        txb.pure.string(resource),
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

  return { createViewKey, revokeViewKey, logAccess };
}
