/**
 * FAILURE-CARD MEMORY — Layer 2 self-improvement contract (Phase 0 skeleton).
 *
 * After the Verifier blocks a draft, it writes a FailureCard; on a future similar case the
 * Curator/Writer retrieve relevant cards (by similarity + tag filter) so the team doesn't repeat
 * the same ungrounded claim / over-promise. This is what makes `team+memory` beat `team`.
 *
 * ⚠️ Phase 0 = an IN-MEMORY stub so the pipeline compiles and runs degraded. WS-D PROMOTES this to
 * `packages/memory` backed by Redis VECTOR SEARCH (embedding similarity + tag metadata filter,
 * see .agents/skills/redis-vector-search) and adds the CHRONOLOGICAL eval split. Keep these
 * signatures stable — WS-B's `team+memory` pipeline codes against them.
 */

export interface FailureCard {
  id: string;
  /** the case that produced the failure */
  caseId: string;
  /** machine tags, e.g. ["over_promise_refund","unsourced_claim"] */
  failure_tags: string[];
  /** what evidence was missing/ungrounded */
  missing_evidence: string;
  /** the bad pattern to avoid, in one line */
  bad_pattern: string;
  /** a short corrected exemplar the Writer can imitate */
  patch_exemplar: string;
  /** optional embedding (WS-D fills this for vector search) */
  embedding?: number[];
}

export interface RetrieveQuery {
  /** free-text (review or draft) to embed + match */
  text: string;
  /** restrict to cards carrying ANY of these tags */
  tags?: string[];
  /** max cards to return */
  k?: number;
}

/** In-memory store — process-local, lost between runs. WS-D swaps for Redis. */
const STORE: FailureCard[] = [];

/** Persist a failure card. (WS-D: write to Redis + index the embedding.) */
export async function writeFailureCard(card: FailureCard): Promise<void> {
  STORE.push(card);
}

/**
 * Retrieve relevant failure cards. Phase 0 = naive tag-overlap match (no embeddings).
 * WS-D: replace with Redis vector similarity + tag metadata filter.
 */
export async function retrieveFailureCards(query: RetrieveQuery): Promise<FailureCard[]> {
  const k = query.k ?? 3;
  const tags = query.tags;
  const scored = STORE.map((c) => {
    const overlap = tags ? c.failure_tags.filter((t) => tags.includes(t)).length : 0;
    return { c, overlap };
  })
    .filter((s) => (tags ? s.overlap > 0 : true))
    .sort((a, b) => b.overlap - a.overlap);
  return scored.slice(0, k).map((s) => s.c);
}

/** Test/demo helper — clear the in-memory store between chronological splits. */
export function __resetMemory(): void {
  STORE.length = 0;
}
