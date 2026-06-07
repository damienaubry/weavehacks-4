/**
 * FAILURE-CARD MEMORY — re-export of the promoted store (WS-D).
 *
 * The Phase-0 in-memory stub now lives in `@weavehacks/memory` (Redis vector search + in-memory
 * fallback + the chronological split / honesty guards). This file keeps the SAME exported names so
 * nothing downstream (WS-B's `team+memory`, WS-C's harness) had to change.
 *
 * Stable surface (unchanged from Phase 0): `writeFailureCard`, `retrieveFailureCards`,
 * `__resetMemory`, `FailureCard`, `RetrieveQuery`.
 * Additive (for WS-C): `resetMemoryAsync`, `chronologicalSplit`, `auditLeakage`, `assertNoLeakage`,
 * `assessMemoryLift`, `describeMemory`.
 */

export {
  writeFailureCard,
  retrieveFailureCards,
  __resetMemory,
  resetMemoryAsync,
  describeMemory,
  chronologicalSplit,
  auditLeakage,
  assertNoLeakage,
  assessMemoryLift,
  type FailureCard,
  type RetrieveQuery,
  type ChronoSplit,
  type SplitOptions,
  type MemoryLift,
} from "@weavehacks/memory";
