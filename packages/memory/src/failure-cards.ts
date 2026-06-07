/**
 * Public failure-card API — the STABLE surface WS-B's `team+memory` codes against. Names and
 * signatures match the Phase-0 stub (`packages/agents/src/memory.ts`) exactly, so promoting the
 * stub to this Redis-backed store changes nothing downstream.
 *
 * Each call is a Weave op, so a memory retrieval (and the card it reused to avoid repeating an
 * over-promise) is traceable in the recovery run, next to the agent calls.
 */
import { traced } from "@weavehacks/observability";
import { getStore } from "./store";
import type { FailureCard, RetrieveQuery } from "./types";

export type { FailureCard, RetrieveQuery } from "./types";

/** Persist + index a failure card. Computes its embedding if one wasn't supplied. */
export const writeFailureCard = traced(
  "memory.writeFailureCard",
  async function writeFailureCard(card: FailureCard): Promise<void> {
    await getStore().write(card);
  },
);

/** Retrieve the top-k relevant cards by embedding similarity, hard-filtered to ANY of `tags`. */
export const retrieveFailureCards = traced(
  "memory.retrieveFailureCards",
  async function retrieveFailureCards(query: RetrieveQuery): Promise<FailureCard[]> {
    return getStore().retrieve(query);
  },
);

/**
 * Clear the store. Synchronous to preserve the Phase-0 signature: the in-memory mirror is cleared
 * immediately and the Redis purge runs in the background. Tests/harness code that needs the Redis
 * side fully cleared before continuing should await `resetMemoryAsync()` instead.
 */
export function __resetMemory(): void {
  getStore().resetSync();
}

/** Fully clear the store (Redis keys + FT index + mirror) and await it — for deterministic tests. */
export async function resetMemoryAsync(): Promise<void> {
  await getStore().resetAsync();
}

/** Diagnostics: which tier/embedder is live + how many cards this process has written. */
export function describeMemory(): ReturnType<ReturnType<typeof getStore>["describe"]> {
  return getStore().describe();
}
