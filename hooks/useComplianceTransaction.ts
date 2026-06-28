import clientConfig from "@/config/clientConfig";
import { useCustomWallet } from "@/contexts/CustomWallet";
import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { CLOCK_ID } from "@/lib/constants";

export function useComplianceTransaction() {
  const { sponsorAndExecuteTransactionBlock, address } = useCustomWallet();

  /**
   * Create a view-key on-chain that grants a viewer access to decrypt
   * SEAL-encrypted Walrus blobs owned by this agent.
   *
   * create_view_key returns a ViewKey object — must be transferred.
   */
  const createViewKey = async (
    agentId: string,
    viewer: string,
    label: string,
    expiresAt: number
  ): Promise<SuiTransactionBlockResponse> => {
    const txb = new Transaction();

    const [viewKey] = txb.moveCall({
      target: `${clientConfig.PACKAGE_ID}::compliance::create_view_key`,
      arguments: [
        txb.object(agentId),
        txb.pure.address(viewer),
        txb.pure.string(label),
        txb.pure.u64(expiresAt),
        txb.object(CLOCK_ID),
      ],
    });

    // Transfer ViewKey to the viewer so they can hold it for decryption
    txb.transferObjects([viewKey], txb.pure.address(viewer));

    return sponsorAndExecuteTransactionBlock({
      tx: txb,
      network: clientConfig.SUI_NETWORK_NAME,
      includesTransferTx: true,
      allowedAddresses: [address!, viewer],
      allowedMoveCallTargets: [`${clientConfig.PACKAGE_ID}::compliance::create_view_key`],
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
  };

  const revokeViewKey = async (
    viewKeyId: string,
    agentId: string
  ): Promise<SuiTransactionBlockResponse> => {
    const txb = new Transaction();

    txb.moveCall({
      target: `${clientConfig.PACKAGE_ID}::compliance::revoke_view_key`,
      arguments: [
        txb.object(viewKeyId),
        txb.object(agentId),
      ],
    });

    return sponsorAndExecuteTransactionBlock({
      tx: txb,
      network: clientConfig.SUI_NETWORK_NAME,
      includesTransferTx: true,
      allowedAddresses: [address!],
      allowedMoveCallTargets: [`${clientConfig.PACKAGE_ID}::compliance::revoke_view_key`],
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
  };

  /**
   * Log an access event on-chain for audit trail.
   * log_access returns an AccessLogEntry — must be transferred.
   */
  const logAccess = async (
    agentId: string,
    viewer: string,
    action: string,
    resource: string
  ): Promise<SuiTransactionBlockResponse> => {
    const txb = new Transaction();

    const [logEntry] = txb.moveCall({
      target: `${clientConfig.PACKAGE_ID}::compliance::log_access`,
      arguments: [
        txb.object(agentId),
        txb.pure.address(viewer),
        txb.pure.string(action),
        txb.pure.string(resource),
        txb.object(CLOCK_ID),
      ],
    });

    // Transfer the log entry to the agent owner for their records
    txb.transferObjects([logEntry], txb.pure.address(address!));

    return sponsorAndExecuteTransactionBlock({
      tx: txb,
      network: clientConfig.SUI_NETWORK_NAME,
      includesTransferTx: true,
      allowedAddresses: [address!],
      allowedMoveCallTargets: [`${clientConfig.PACKAGE_ID}::compliance::log_access`],
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
  };

  return { createViewKey, revokeViewKey, logAccess };
}
