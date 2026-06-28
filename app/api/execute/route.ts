import { NextRequest, NextResponse } from "next/server";
import { enokiClient } from "../EnokiClient";
import {
  executeTxSchema,
  runExecuteSecurityChecks,
  sanitizeErrorMessage,
} from "@/lib/security";

export const POST = async (request: NextRequest) => {
  try {
    // ── 1. Parse and validate request body with Zod ────────────────
    const rawBody = await request.json();
    const parseResult = executeTxSchema.safeParse(rawBody);

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
    const security = runExecuteSecurityChecks(request, body, jwt);

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

    // ── 4. Execute the sponsored transaction ────────────────────────
    const result = await enokiClient.executeSponsoredTransaction({
      digest: body.digest,
      signature: body.signature,
    });

    const responseHeaders: Record<string, string> = {};
    if (security.headers) {
      Object.assign(responseHeaders, security.headers);
    }

    return NextResponse.json(
      { digest: result.digest },
      { status: 200, headers: responseHeaders },
    );
  } catch (error) {
    console.error("Execute error:", error);
    const message = sanitizeErrorMessage(error);
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
};
