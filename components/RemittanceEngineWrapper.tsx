"use client";

import { useRemittanceEngine } from "@/hooks/useRemittanceEngine";

/**
 * RemittanceEngineWrapper — Zero-visual-impact component that mounts
 * the automated remittance engine into the React tree.
 *
 * This component:
 *  - Renders null (no DOM output).
 *  - Does not affect layout, spacing, colours, or any UI.
 *  - Mounts the useRemittanceEngine hook which watches SUI balance
 *    changes and triggers the auto-conversion pipeline.
 *
 * Place this inside CustomWalletProvider in the layout so it has
 * access to wallet context.
 */
export function RemittanceEngineWrapper() {
  useRemittanceEngine();
  return null;
}
