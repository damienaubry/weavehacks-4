/**
 * FAILURE-CARD contract — Layer 2 self-improvement. These shapes are STABLE: WS-B's
 * `team+memory` pipeline and the Phase-0 stub (`packages/agents/src/memory.ts`) code against
 * them, so the field names must not drift.
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
  /** L2-normalized embedding used for vector search (WS-D fills this on write) */
  embedding?: number[];
}

export interface RetrieveQuery {
  /** free-text (review or draft) to embed + match */
  text: string;
  /** restrict to cards carrying ANY of these tags (hard pre-filter, applied before the vector) */
  tags?: string[];
  /** max cards to return */
  k?: number;
}
