import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { enokiClient } from "../EnokiClient";
import {
  sponsorTxSchema,
  runSponsorSecurityChecks,
  sanitizeErrorMessage,
  clearReplayNonce,
} from "@/lib/security";

export const POST = async (request: NextRequest) => {
  let usedNonce: string | undefined;

  try {
    // ── 1. Parse and validate request body with Zod ────────────────
    const rawBody = await request.json();
    const parseResult = sponsorTxSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return NextResponse.json(
        { error: `Validation error: ${firstError.message}` },
        { status: 400 },
      );
    }

    const body = parseResult.data;

    // ── 2. Extract JWT from Authorization header ────────────────────
    const authHeader = request.headers.get("authorization");
    const jwt = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    // ── 3. Run all security checks ──────────────────────────────────
    const security = runSponsorSecurityChecks(request, body, jwt);

    if (!security.passed) {
      const headers: Record<string, string> = {};
      if (security.headers) {
        Object.assign(headers, security.headers);
      }
      return NextResponse.json(
        { error: security.error },
        { status: security.status, headers },
      );
    }

    // Save the nonce so we can clear it if the upstream request fails
    usedNonce = security.nonce;

    // ── 4. Forward to Enoki ─────────────────────────────────────────
    const resp = await enokiClient.createSponsoredTransaction({
      network: body.network,
      transactionKindBytes: body.txBytes,
      sender: body.sender,
      allowedAddresses: body.allowedAddresses,
      allowedMoveCallTargets: body.allowedMoveCallTargets,
    });

    const responseHeaders: Record<string, string> = {};
    if (security.headers) {
      Object.assign(responseHeaders, security.headers);
    }

    return NextResponse.json(resp, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    if (usedNonce) {
      clearReplayNonce(usedNonce);
    }

    console.error("Sponsor error:", error);
    let detailedMessage = sanitizeErrorMessage(error);
    
    const enokiErrors = (error && typeof error === "object" && "errors" in error)
      ? (error as any).errors
      : null;

    return NextResponse.json(
      { 
        error: detailedMessage,
        ...(enokiErrors && { enokiErrors }) // surface upstream error in dev
      },
      { status: 502 }, // 502 = upstream rejected, more accurate than 500
    );
  }
};
