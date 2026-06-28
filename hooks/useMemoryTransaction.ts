import clientConfig from "@/config/clientConfig";
import { useCustomWallet } from "@/contexts/CustomWallet";
import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { CLOCK_ID } from "@/lib/constants";

export function useMemoryTransaction() {
  const { sponsorAndExecuteTransactionBlock, address } = useCustomWallet();

  /**
   * Store a memory record on-chain with a reference to a Walrus blob.
   * The MemoryRecord object returned by the Move function is transferred
   * to the user's address so it does not get dropped.
   */
  const storeMemory = async (
    agentId: string,
    blobId: string,
    dataType: string,
    size: number,
    visibility: boolean,
    label: string = ""
  ): Promise<SuiTransactionBlockResponse> => {
    const txb = new Transaction();

    // store_memory returns a MemoryRecord — must transfer it, not discard it
    const [record] = txb.moveCall({
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

    // Transfer the returned MemoryRecord to the user's own address
    txb.transferObjects([record], txb.pure.address(address!));

    return sponsorAndExecuteTransactionBlock({
      tx: txb,
      network: clientConfig.SUI_NETWORK_NAME,
      includesTransferTx: true,
      allowedAddresses: [address!],
      allowedMoveCallTargets: [`${clientConfig.PACKAGE_ID}::memory::store_memory`],
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

    const [record] = txb.moveCall({
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

    txb.transferObjects([record], txb.pure.address(address!));

    return sponsorAndExecuteTransactionBlock({
      tx: txb,
      network: clientConfig.SUI_NETWORK_NAME,
      includesTransferTx: true,
      allowedAddresses: [address!],
      allowedMoveCallTargets: [`${clientConfig.PACKAGE_ID}::memory::store_memory_with_cap`],
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
  };

  const updateVisibility = async (
    recordId: string,
    newVisibility: string,
    agentId: string
  ): Promise<SuiTransactionBlockResponse> => {
    const txb = new Transaction();

    txb.moveCall({
      target: `${clientConfig.PACKAGE_ID}::memory::update_visibility`,
      arguments: [
        txb.object(recordId),
        txb.pure.string(newVisibility),
        txb.object(agentId),
      ],
    });

    return sponsorAndExecuteTransactionBlock({
      tx: txb,
      network: clientConfig.SUI_NETWORK_NAME,
      includesTransferTx: true,
      allowedAddresses: [address!],
      allowedMoveCallTargets: [`${clientConfig.PACKAGE_ID}::memory::update_visibility`],
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
  };

  return { storeMemory, storeMemoryWithCap, updateVisibility };
}
