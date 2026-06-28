/**
 * GhostPayEventIndexer — Mount point for the event-driven cache invalidation.
 *
 * Renders nothing. Wires useGhostPayEventIndexer into the component tree
 * so it runs as long as the app is mounted.
 */
"use client";

import { useGhostPayEventIndexer } from "@/hooks/useGhostPayEventIndexer";

export function GhostPayEventIndexer() {
  useGhostPayEventIndexer();
  return null;
}
