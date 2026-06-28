/**
 * useAgentEngine — React hook that runs the GhostPay autonomous agent.
 *
 * Runs in the background, observing wallet balances, payments, and memory.
 * When the agent decides an action is needed, it:
 *   1. Persists the reasoning to Walrus
 *   2. Stores a memory record on-chain
 *   3. Exposes the plan for user approval
 *   4. On approval: executes the action through existing transaction hooks
 *
 * ── No UI changes ──────────────────────────────────────────────────
 * This hook only exposes state. Rendering is handled by existing UI
 * components that consume the state.
 *
 * ── Every reasoning step is persisted ──────────────────────────────
 * Before queuing any action, the agent writes its reasoning to Walrus
 * and creates an on-chain memory record. The full audit trail is
 * always available.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCustomWallet } from "@/contexts/CustomWallet";
import { useAgent } from "@/hooks/useAgentQuery";
import { useBalances } from "@/hooks/useBalances";
import { usePayments } from "@/hooks/usePaymentQuery";
import { useMemories, useMemoryContentsForAgent } from "@/hooks/useMemoryQuery";
import { useMemoryTransaction } from "@/hooks/useMemoryTransaction";
import { useDeepBook } from "@/hooks/useDeepBook";
import { uploadToWalrus } from "@/lib/WalrusService";
import { POOLS } from "@/lib/DeepBookService";
import {
  buildAgentContext,
  analyzeContext,
  buildPlan,
  persistReasoningToWalrus,
  formatReasoningMemoryParams,
  type AgentPlan,
  type AgentAction,
  type AgentActionSwap,
} from "@/lib/agentEngine";
import type { AgentPaymentInfo, AgentMemoryInfo } from "@/lib/agentEngine";

// ── Types ────────────────────────────────────────────────────────────────

export interface AgentEngineState {
  /** Whether the engine is initialized. */
  ready: boolean;
  /** The current plan (or null if idle). */
  currentPlan: AgentPlan | null;
  /** History of completed plans (most recent first, max 10). */
  planHistory: AgentPlan[];
  /** Number of times the engine has analyzed context. */
  runCount: number;
  /** Last error message. */
  error: string | null;
}

export interface AgentEngineActions {
  /** Approve the current pending plan and execute it. */
  approvePlan: () => Promise<void>;
  /** Reject the current pending plan. */
  rejectPlan: () => void;
  /** Manually trigger the engine to re-analyze context. */
  triggerAnalysis: () => void;
  /** Set a user preference (persisted as a memory record). */
  setPreference: (key: string, value: string) => Promise<void>;
}

// ── Storage key for plan history ─────────────────────────────────────────

const PLAN_HISTORY_KEY = "ghostpay_agent_plan_history";

function loadPlanHistory(): AgentPlan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(PLAN_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePlanHistory(plans: AgentPlan[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PLAN_HISTORY_KEY, JSON.stringify(plans.slice(0, 10)));
  } catch {
    // sessionStorage full — ignore
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────

export function useAgentEngine(): AgentEngineState & AgentEngineActions {
  const { address } = useCustomWallet();
  const { agentId, isPending: agentPending } = useAgent();
  const { sui, usdc, deep, isLoading: balancesLoading } = useBalances();
  const { payments, isPending: paymentsPending } = usePayments();
  // Use intelligent memory retrieval: fetch blob content from Walrus
  // before the agent makes any decisions. This retrieves the 5 most
  // recent memories with their actual content.
  const { memories, isPending: memoriesPending } = useMemories();
  const { enriched: enrichedMemories, isPending: enrichedPending } = useMemoryContentsForAgent(5);
  const { storeMemory } = useMemoryTransaction();
  const { executeSwap } = useDeepBook();

  const [state, setState] = useState<AgentEngineState>({
    ready: false,
    currentPlan: null,
    planHistory: loadPlanHistory(),
    runCount: 0,
    error: null,
  });

  // Track previous balances to detect changes
  const prevSuiRef = useRef(sui);
  const analysisScheduledRef = useRef(false);

  // ── Engine initialisation ──────────────────────────────────────────

  const isLoading = agentPending || balancesLoading || paymentsPending || memoriesPending || enrichedPending;

  useEffect(() => {
    if (!isLoading && !!address) {
      setState(prev => ({ ...prev, ready: true }));
    }
  }, [isLoading, address]);

  // ── Balance change detection ───────────────────────────────────────

  useEffect(() => {
    if (!state.ready || analysisScheduledRef.current) return;

    const prevSui = prevSuiRef.current;
    const currentSui = sui;

    // Detect increase in SUI balance
    if (currentSui > prevSui) {
      analysisScheduledRef.current = true;
      // Debounce: wait 2s after last change before analyzing
      const timer = setTimeout(() => {
        analysisScheduledRef.current = false;
        runAnalysis();
      }, 2_000);
      return () => clearTimeout(timer);
    }

    prevSuiRef.current = currentSui;
  }, [sui, state.ready]);

  // ── Analysis ───────────────────────────────────────────────────────

  const runAnalysis = useCallback(() => {
    if (!state.ready) return;

    // Convert data to agent types
    const agentPayments: AgentPaymentInfo[] = payments.map(p => ({
      id: p.id,
      seq: p.seq,
      amount: p.amount,
      currency: p.currency,
      recipient: p.recipient,
      memo: p.memo,
      status: p.status,
      timestamp: p.timestamp,
    }));

    const agentMemories: AgentMemoryInfo[] = memories.map(m => ({
      id: m.id,
      seq: m.seq,
      blobId: m.blobId,
      dataType: m.dataType,
      visibility: m.visibility,
      label: m.label,
      timestamp: m.timestamp,
    }));

    // Build memory content array from enriched records
    const memoryContent = enrichedMemories.length > 0
      ? enrichedMemories.map(m => ({
          memoryId: m.id,
          seq: m.seq,
          blobId: m.blobId,
          dataType: m.dataType,
          label: m.label,
          category: m.category,
          content: m.content,
          available: m.blobAvailable ?? false,
        }))
      : undefined;

    const hasOrphanRecords = enrichedMemories.some(m => m.blobAvailable === false);

    const ctx = buildAgentContext({
      agentId,
      sui,
      usdc,
      deep,
      payments: agentPayments,
      memories: agentMemories,
      runCount: state.runCount + 1,
      memoryContent,
      hasOrphanRecords,
    });

    const reasoning = analyzeContext(ctx);
    const plan = buildPlan(ctx, reasoning);

    setState(prev => ({
      ...prev,
      currentPlan: plan,
      runCount: prev.runCount + 1,
    }));

    // Persist reasoning asynchronously (don't block state update)
    if (plan.actions.length > 0 && plan.actions[0].type !== "noop") {
      persistReasoning(plan);
    }
  }, [
    state.ready,
    state.runCount,
    agentId,
    sui,
    usdc,
    deep,
    payments,
    memories,
    enrichedMemories,
  ]);

  // ── Persistence ────────────────────────────────────────────────────

  const persistReasoning = useCallback(
    async (plan: AgentPlan) => {
      try {
        // Upload reasoning to Walrus
        const { blobId } = await persistReasoningToWalrus(plan, true);

        // Update the plan with the blob ID
        setState(prev => {
          if (!prev.currentPlan || prev.currentPlan.id !== plan.id) return prev;
          return {
            ...prev,
            currentPlan: { ...prev.currentPlan, reasoningBlobId: blobId },
          };
        });

        // Store on-chain memory record
        if (agentId) {
          const memParams = formatReasoningMemoryParams({
            ...plan,
            reasoningBlobId: blobId,
          });
          const memoryResult = await storeMemory(
            agentId,
            memParams.blobId,
            memParams.dataType,
            memParams.size,
            memParams.visibility,
            memParams.label,
          );

          const memoryId = memoryResult.effects?.created?.[0]?.reference?.objectId;
          if (memoryId) {
            setState(prev => {
              if (!prev.currentPlan || prev.currentPlan.id !== plan.id) return prev;
              return {
                ...prev,
                currentPlan: {
                  ...prev.currentPlan,
                  reasoningBlobId: blobId,
                  reasoningMemoryId: memoryId,
                },
              };
            });
          }
        }
      } catch (err) {
        console.warn("Agent reasoning persistence failed:", err);
        // Non-critical — plan still exists in memory
      }
    },
    [agentId, storeMemory],
  );

  // ── Plan Approval / Rejection ──────────────────────────────────────

  const approvePlan = useCallback(async () => {
    const plan = state.currentPlan;
    if (!plan || plan.status !== "pending_approval") return;

    setState(prev => ({
      ...prev,
      currentPlan: prev.currentPlan
        ? { ...prev.currentPlan, status: "executing" as const }
        : null,
    }));

    try {
      // Execute each action sequentially
      for (const action of plan.actions) {
        await executeAction(action);
      }

      // Mark plan as completed
      setState(prev => {
        const completedPlan = prev.currentPlan
          ? { ...prev.currentPlan, status: "completed" as const }
          : null;
        const history = completedPlan
          ? [completedPlan, ...prev.planHistory].slice(0, 10)
          : prev.planHistory;
        savePlanHistory(history);
        return {
          ...prev,
          currentPlan: null,
          planHistory: history,
        };
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Plan execution failed";
      setState(prev => {
        const failedPlan = prev.currentPlan
          ? { ...prev.currentPlan, status: "failed" as const, error: msg }
          : null;
        return { ...prev, currentPlan: failedPlan, error: msg };
      });
    }
  }, [state.currentPlan]);

  const rejectPlan = useCallback(() => {
    const plan = state.currentPlan;
    if (!plan || plan.status !== "pending_approval") return;

    const rejected = { ...plan, status: "rejected" as const };
    const history = [rejected, ...state.planHistory].slice(0, 10);
    savePlanHistory(history);

    setState(prev => ({
      ...prev,
      currentPlan: null,
      planHistory: history,
    }));
  }, [state.currentPlan, state.planHistory]);

  // ── Action Execution ──────────────────────────────────────────────

  const executeAction = useCallback(
    async (action: AgentAction): Promise<void> => {
      switch (action.type) {
        case "noop":
          return;

        case "swap": {
          const swapAction = action as AgentActionSwap;
          const pool = POOLS[swapAction.poolKey];
          if (!pool) {
            throw new Error(`Agent cannot swap: unknown pool key "${swapAction.poolKey}"`);
          }
          try {
            await executeSwap(
              pool,
              swapAction.sellAmount,
              swapAction.minBuyAmount,
              swapAction.sellBase,
            );
          } catch (err) {
            throw new Error(
              `Auto-convert swap failed: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
          break;
        }

        case "store_memory":
          // Handled by the persistence step before execution
          break;

        case "transfer":
        case "record_payment":
          // Reserved for future rules — not yet generated by the engine
          console.warn(`Agent action type "${action.type}" is reserved but not yet executed. No-op.`);
          break;

        default: {
          // Exhaustiveness check — if a new AgentAction type is added without
          // a corresponding case, TypeScript will flag this as an error.
          const _exhaustive: never = action;
          throw new Error(`Unknown agent action type: ${(_exhaustive as never as { type: string }).type}`);
        }
      }
    },
    [agentId, executeSwap],
  );

  // ── Manual trigger ─────────────────────────────────────────────────

  const triggerAnalysis = useCallback(() => {
    runAnalysis();
  }, [runAnalysis]);

  // ── Preference Setting ─────────────────────────────────────────────

  const setPreference = useCallback(
    async (key: string, value: string): Promise<void> => {
      if (!agentId) return;

      const encoder = new TextEncoder();
      const payload = JSON.stringify({ type: "agent_preference", [key]: value });
      const bytes = encoder.encode(payload);

      try {
        const result = await uploadToWalrus(bytes, 30, false);
        if (result.blobId) {
          await storeMemory(
            agentId,
            result.blobId,
            "agent_preference",
            bytes.length,
            true,
            `${key}:${value}`,
          );
        }
      } catch (err) {
        console.warn("Failed to store preference:", err);
      }

      // Trigger re-analysis so the agent picks up the new preference
      triggerAnalysis();
    },
    [agentId, storeMemory, triggerAnalysis],
  );

  return {
    ...state,
    approvePlan,
    rejectPlan,
    triggerAnalysis,
    setPreference,
  };
}
