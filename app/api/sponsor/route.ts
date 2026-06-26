import { SponsorTxRequestBody } from "@/types/SponsorTx";
import { NextRequest, NextResponse } from "next/server";
import { enokiClient } from "../EnokiClient";

/*
 - Right now any txBlock whose moveCall targets are whitelisted in the Enoki Portal can be sponsored
 - In mainnet products, we will probably want to add constraints, such as:
  - require a JWT token if the user is signed in with Enoki
  - require a signed message if the user uses wallet-kit
  - require that the number of commands in the txBlock is exactly one, we can check this via `TransactionBlock.from(txBytes)`
  - require that the allowedAddresses only contain the sender's address (in case of an airdrop)
*/

export const POST = async (request: NextRequest) => {
  const { network, txBytes, sender, allowedAddresses, allowedMoveCallTargets }: SponsorTxRequestBody =
    await request.json();

  return enokiClient
    .createSponsoredTransaction({
      network,
      transactionKindBytes: txBytes,
      sender,
      allowedAddresses,
      // Only restrict targets when the caller explicitly provides them.
      // When undefined, the Enoki Portal's API key configuration handles
      // the allowlist (needed for GhostPay's own contracts to work).
      allowedMoveCallTargets,
    })
    .then((resp) => {
      return NextResponse.json(resp, {
        status: 200,
      });
    })
    .catch((error) => {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : "Could not create sponsored transaction block.";
      return NextResponse.json(
        { error: message },
        {
          status: 500,
        }
      );
    });
};
