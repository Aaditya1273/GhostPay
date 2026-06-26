import { NextRequest, NextResponse } from "next/server";
import { enokiClient } from "../EnokiClient";
import { ExecuteSponsoredTransactionApiInput } from "@/contexts/CustomWallet";

export const POST = async (request: NextRequest) => {
  const { digest, signature }: ExecuteSponsoredTransactionApiInput =
    await request.json();

  return enokiClient
    .executeSponsoredTransaction({
      digest,
      signature,
    })
    .then(({ digest }) => {
      return NextResponse.json(
        { digest },
        {
          status: 200,
        }
      );
    })
    .catch((error) => {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : "Could not execute sponsored transaction block.";
      return NextResponse.json(
        { error: message },
        {
          status: 500,
        }
      );
    });
};
