/**
 * @weavehacks/memory — Layer 2 self-improvement: the across-runs failure-card store.
 *
 * After the Verifier blocks a draft, the harness writes a FailureCard; on a future similar case
 * the Curator/Writer retrieve relevant cards (embedding similarity + tag filter) so the team
 * doesn't repeat the same over-promise — this is what makes `team+memory` beat `team`.
 *
 * Backed by Redis vector search when available (RediSearch FT.SEARCH KNN), portable cosine over
 * plain Redis otherwise (the demo's redis:7-alpine), and an in-memory mirror when Redis is down —
 * so the demo never hard-fails. The chronological split + leakage/honesty guards keep the third
 * leaderboard row legitimate.
 */

export {
  writeFailureCard,
  retrieveFailureCards,
  __resetMemory,
  resetMemoryAsync,
  describeMemory,
  type FailureCard,
  type RetrieveQuery,
} from "./failure-cards";

export { getStore, replaceStore, FailureCardStore } from "./store";

export {
  chronologicalSplit,
  auditLeakage,
  assertNoLeakage,
  assessMemoryLift,
  type ChronoSplit,
  type SplitOptions,
  type MemoryLift,
} from "./split";

export { embed, cosine, embedderInfo, __resetEmbeddings, type EmbedMode } from "./embeddings";
