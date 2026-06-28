"use client";

import { useIncomingFundDetector } from "@/hooks/useIncomingFundDetector";

/**
 * IncomingFundDetector — mounts the real-time fund detection hook.
 * Renders nothing; placed once in ProvidersAndLayout.
 */
export function IncomingFundDetector() {
  useIncomingFundDetector();
  return null;
}
