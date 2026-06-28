import clientConfig from "@/config/clientConfig";
import { useCustomWallet } from "@/contexts/CustomWallet";
import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { CLOCK_ID } from "@/lib/constants";

export function usePaymentTransaction() {
  const { sponsorAndExecuteTransactionBlock, address } = useCustomWallet();

  /**
   * Record a payment on-chain.
   * record_payment returns a PaymentReceipt object — must be transferred.
   */
  const recordPayment = async (
    agentId: string,
    recipient: string,
    amount: number,
    currency: string,
    memo: string
  ): Promise<SuiTransactionBlockResponse> => {
    const txb = new Transaction();

    const [receipt] = txb.moveCall({
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

    // Transfer the returned PaymentReceipt to the user's address
    txb.transferObjects([receipt], txb.pure.address(address!));

    return sponsorAndExecuteTransactionBlock({
      tx: txb,
      network: clientConfig.SUI_NETWORK_NAME,
      includesTransferTx: true,
      allowedAddresses: [address!],
      allowedMoveCallTargets: [`${clientConfig.PACKAGE_ID}::payment::record_payment`],
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

    const [receipt] = txb.moveCall({
      target: `${clientConfig.PACKAGE_ID}::payment::record_payment_with_cap`,
      arguments: [
        txb.object(agentId),
        txb.object(capId),
        txb.pure.u64(amount),
        txb.pure.string(currency),
        txb.pure.address(recipient),
        txb.pure.string(memo),
        txb.pure.option("string", undefined), // receipt_blob_id: none
        txb.object(CLOCK_ID),
      ],
    });

    txb.transferObjects([receipt], txb.pure.address(address!));

    return sponsorAndExecuteTransactionBlock({
      tx: txb,
      network: clientConfig.SUI_NETWORK_NAME,
      includesTransferTx: true,
      allowedAddresses: [address!],
      allowedMoveCallTargets: [`${clientConfig.PACKAGE_ID}::payment::record_payment_with_cap`],
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
  };

  const updatePaymentStatus = async (
    receiptId: string,
    newStatus: string,
    agentId: string
  ): Promise<SuiTransactionBlockResponse> => {
    const txb = new Transaction();

    txb.moveCall({
      target: `${clientConfig.PACKAGE_ID}::payment::update_payment_status`,
      arguments: [
        txb.object(receiptId),
        txb.pure.string(newStatus),
        txb.object(agentId),
      ],
    });

    return sponsorAndExecuteTransactionBlock({
      tx: txb,
      network: clientConfig.SUI_NETWORK_NAME,
      includesTransferTx: true,
      allowedAddresses: [address!],
      allowedMoveCallTargets: [`${clientConfig.PACKAGE_ID}::payment::update_payment_status`],
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
  };

  /**
   * Transfer tokens (SUI or USDC) AND record a payment receipt on-chain.
   *
   * Both operations are executed in a single PTB (atomic):
   *   1. splitCoins + transferObjects → actual token transfer
   *   2. record_payment → PaymentReceipt object (transferred to sender)
   *
   * @param agentId  The Agent object ID that owns the payment
   * @param recipient  Recipient Sui address
   * @param amount  Amount in human-readable units (SUI or USDC)
   * @param currency  "SUI" or "USDC"
   * @param memo  Optional payment memo
   * @param coinType  Full Sui coin type (e.g. 0x2::sui::SUI or the DBUSDC type)
   * @param coinObjectId  Optional specific coin object ID to split from.
   *                      If omitted and currency is "SUI", uses the gas coin.
   */
  const transferTokens = async (
    agentId: string,
    recipient: string,
    amount: number,
    currency: string,
    memo: string,
    coinType: string,
    coinObjectId?: string
  ): Promise<SuiTransactionBlockResponse> => {
    const txb = new Transaction();
    const decimals = currency === "SUI" ? 1_000_000_000 : 1_000_000;
    const amountInBase = BigInt(Math.floor(amount * decimals));

    // ── Step 1: Coin transfer ────────────────────────────────────────────
    let transferCoin;
    if (coinObjectId) {
      const coin = txb.object(coinObjectId);
      [transferCoin] = txb.splitCoins(coin, [txb.pure.u64(amountInBase)]);
    } else {
      throw new Error("coinObjectId is required for all transfers when using gas sponsorship.");
    }
    txb.transferObjects([transferCoin], txb.pure.address(recipient));

    // ── Step 2: On-chain receipt (same PTB — atomic) ──────────────────────
    if (agentId) {
      const [receipt] = txb.moveCall({
        target: `${clientConfig.PACKAGE_ID}::payment::record_payment`,
        arguments: [
          txb.object(agentId),
          txb.pure.u64(amountInBase),
          txb.pure.string(currency),
          txb.pure.address(recipient),
          txb.pure.string(memo),
          txb.pure.option("string", undefined),
          txb.object(CLOCK_ID),
        ],
      });
      // Transfer the PaymentReceipt to the sender (required — cannot drop)
      txb.transferObjects([receipt], txb.pure.address(address!));
    }

    return sponsorAndExecuteTransactionBlock({
      tx: txb,
      network: clientConfig.SUI_NETWORK_NAME,
      includesTransferTx: true,
      allowedAddresses: [address!, recipient],
      allowedMoveCallTargets: [`${clientConfig.PACKAGE_ID}::payment::record_payment`],
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
  };

  return {
    recordPayment,
    recordPaymentWithCap,
    updatePaymentStatus,
    transferTokens,
  };
}
