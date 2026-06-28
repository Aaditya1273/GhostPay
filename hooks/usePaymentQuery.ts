import clientConfig from "@/config/clientConfig";
import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useCustomWallet } from "@/contexts/CustomWallet";

const isPackageDeployed = !!(
  clientConfig.PACKAGE_ID && clientConfig.PACKAGE_ID !== "0x0"
);

export interface PaymentReceiptFields {
  id: { id: string };
  seq: string;
  timestamp: string;
  amount: string;
  currency: string;
  recipient: string;
  memo: string;
  status: string;
  receipt_blob_id: { vec: string[] };
}

/** Query the user's PaymentReceipt objects from the chain */
export function usePaymentReceiptsQuery() {
  const { address } = useCustomWallet();

  return useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: address!,
      filter: {
        StructType: `${clientConfig.PACKAGE_ID}::payment::PaymentReceipt`,
      },
      options: {
        showContent: true,
        showOwner: true,
        showType: true,
      },
    },
    {
      enabled: isPackageDeployed && !!address,
    }
  );
}

/** Parsed payment receipt for the frontend */
export interface ParsedPayment {
  id: string;
  seq: number;
  amount: number;
  currency: string;
  recipient: string;
  memo: string;
  status: string;
  timestamp: number;
  dateStr: string;
}

function formatPaymentTime(timestampMs: number): string {
  const now = Date.now();
  const diff = now - timestampMs;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hour ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)} days ago`;
  return new Date(timestampMs).toLocaleDateString();
}

/** Hook that returns parsed payments for display */
export function usePayments() {
  const { data, isPending, error } = usePaymentReceiptsQuery();

  const payments: ParsedPayment[] =
    data?.data
      ?.map((obj) => {
        const fields = obj.data?.content as
          | { dataType: "moveObject"; fields: PaymentReceiptFields }
          | undefined;
        if (!fields?.fields) return null;
        const f = fields.fields;
        const rawAmount = Number(f.amount);
        const amount = f.currency === "USDC" ? rawAmount / 1_000_000 : rawAmount / 1_000_000_000;
        return {
          id: f.id.id,
          seq: Number(f.seq),
          amount,
          currency: f.currency,
          recipient: f.recipient,
          memo: f.memo,
          status: f.status,
          timestamp: Number(f.timestamp),
          dateStr: formatPaymentTime(Number(f.timestamp)),
        };
      })
      .filter((p): p is ParsedPayment => p !== null) ?? [];

  // Sort by timestamp descending
  payments.sort((a, b) => b.timestamp - a.timestamp);

  return { payments, isPending, error, hasPayments: payments.length > 0 };
}
