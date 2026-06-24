import clientConfig from "@/config/clientConfig";
import { useCustomWallet } from "@/contexts/CustomWallet";
import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";

/** Sui Clock shared object ID (same on all networks) */
const CLOCK_ID = "0x6";

export function useMemoryTransaction() {
  const { sponsorAndExecuteTransactionBlock, address } = useCustomWallet();

  const storeMemory = async (
    agentId: string,
    blobId: string,
    dataType: string,
    size: number,
    visibility: boolean,
    label: string = ""
  ): Promise<SuiTransactionBlockResponse> => {
    const txb = new Transaction();

    txb.moveCall({
      target: `${clientConfig.PACKAGE_ID}::memory::store_memory`,
      arguments: [
        txb.object(agentId),
        txb.pure.string(blobId),
        txb.pure.string(dataType),
        txb.pure.string(visibility ? "private" : "public"),
        txb.pure.u64(size),
        txb.pure.string(label),
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

  const storeMemoryWithCap = async (
    agentId: string,
    capId: string,
    blobId: string,
    dataType: string,
    size: number,
    visibility: boolean,
    label: string = ""
  ): Promise<SuiTransactionBlockResponse> => {
    const txb = new Transaction();

    txb.moveCall({
      target: `${clientConfig.PACKAGE_ID}::memory::store_memory_with_cap`,
      arguments: [
        txb.object(agentId),
        txb.object(capId),
        txb.pure.string(blobId),
        txb.pure.string(dataType),
        txb.pure.string(visibility ? "private" : "public"),
        txb.pure.u64(size),
        txb.pure.string(label),
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

  const updateVisibility = async (
    recordId: string,
    newVisibility: boolean
  ): Promise<SuiTransactionBlockResponse> => {
    const txb = new Transaction();

    txb.moveCall({
      target: `${clientConfig.PACKAGE_ID}::memory::update_visibility`,
      arguments: [txb.object(recordId), txb.pure.bool(newVisibility)],
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

  return { storeMemory, storeMemoryWithCap, updateVisibility };
}
