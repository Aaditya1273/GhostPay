import clientConfig from "@/config/clientConfig";
import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useCustomWallet } from "@/contexts/CustomWallet";

const isPackageDeployed = !!(
  clientConfig.PACKAGE_ID && clientConfig.PACKAGE_ID !== "0x0"
);

/** Query the user's Agent objects from the chain */
export function useAgentQuery() {
  const { address } = useCustomWallet();

  return useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: address!,
      filter: {
        StructType: `${clientConfig.PACKAGE_ID}::agent::Agent`,
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

/** Get the first Agent object from the query */
export function useAgent() {
  const { data, isPending, error, refetch } = useAgentQuery();

  const agent = data?.data?.[0]?.data;
  const agentFields = agent?.content as
    | {
        dataType: "moveObject";
        fields: {
          id: { id: string };
          owner: string;
          display_name: string;
          email_hash: string;
          created_at: string;
          payment_seq: string;
          memory_seq: string;
          active: boolean;
        };
      }
    | undefined;

  return {
    agentId: agent?.objectId,
    fields: agentFields?.fields,
    isPending,
    error,
    refetch,
    hasAgent: !!agent,
  };
}
