/**
 * AgentEngineWrapper — Mount point for the autonomous agent engine.
 *
 * Renders null. The engine runs in the background via the useAgentEngine
 * hook, which observes wallet balances, payments, and memory to make
 * autonomous decisions. Plans are surfaced through the hook's return
 * values for existing UI components to consume.
 *
 * ── No UI redesign ──────────────────────────────────────────────────
 * This component produces zero DOM output. The engine state is accessed
 * from existing UI components via useAgentEngine().
 */

"use client";

import { useAgentEngine } from "@/hooks/useAgentEngine";

/**
 * Expose the engine state to the React DevTools and other components.
 * The engine hook handles all persistence, analysis, and execution.
 */
export function AgentEngineWrapper() {
  // Mount the engine — it runs in the background
  useAgentEngine();

  // Zero DOM output
  return null;
}
