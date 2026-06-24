import clientConfig from "@/config/clientConfig";
import { useCustomWallet } from "@/contexts/CustomWallet";
import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";

/** Sui Clock shared object ID (same on all networks) */
const CLOCK_ID = "0x6";

export function usePaymentTransaction() {
  const { sponsorAndExecuteTransactionBlock, address } = useCustomWallet();

  const recordPayment = async (
    agentId: string,
    recipient: string,
    amount: number,
    currency: string,
    memo: string
  ): Promise<SuiTransactionBlockResponse> => {
    const txb = new Transaction();

    txb.moveCall({
      target: `${clientConfig.PACKAGE_ID}::payment::record_payment`,
      arguments: [
        txb.object(agentId),
        txb.pure.u64(amount),
        txb.pure.string(currency),
        txb.pure.address(recipient),
        txb.pure.string(memo),
        txb.pure.option("string", undefined), // receipt_blob_id: none
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

  const recordPaymentWithCap = async (
    agentId: string,
    capId: string,
    recipient: string,
    amount: number,
    currency: string,
    memo: string
  ): Promise<SuiTransactionBlockResponse> => {
    const txb = new Transaction();

    txb.moveCall({
      target: `${clientConfig.PACKAGE_ID}::payment::record_payment_with_cap`,
      arguments: [
        txb.object(agentId),
        txb.object(capId),
        txb.pure.u64(amount),
        txb.pure.string(currency),
        txb.pure.address(recipient),
        txb.pure.string(memo),
        txb.pure.option("vector<u8>", []),
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

  const updatePaymentStatus = async (
    receiptId: string,
    newStatus: string
  ): Promise<SuiTransactionBlockResponse> => {
    const txb = new Transaction();

    txb.moveCall({
      target: `${clientConfig.PACKAGE_ID}::payment::update_payment_status`,
      arguments: [txb.object(receiptId), txb.pure.string(newStatus)],
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

  return { recordPayment, recordPaymentWithCap, updatePaymentStatus };
}
