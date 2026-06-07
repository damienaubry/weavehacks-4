/**
 * RECOVERY CASE — the data contract for the Grounded Recovery Copilot.
 *
 * A case is ONE real (or clearly-marked synthetic) customer review plus the authorized context
 * needed to ground a reply, plus the GOLD labels the GRPR scorer checks against. This file is a
 * CONTRACT only — the actual ~50-case dataset (`recovery-cases.json`) is produced by workstream
 * WS-A from Le Kyoto's real Google reviews, and validated by the operator.
 *
 * ⚠️ Curated demo data. `source: "real"` = derived from a real public review; `"synthetic"` =
 * a paraphrase/variant generated to widen the set. Never pass a fabricated fact off as canon.
 */

import type { MenuItem } from "@weavehacks/truth";

/** Triage label — the incident type the Analyst must infer (checked deterministically). */
export type IncidentType =
  | "food_quality"
  | "delivery_late"
  | "wrong_or_missing_item"
  | "allergen_concern"
  | "hygiene"
  | "service_staff"
  | "pricing_billing"
  | "praise_no_issue"
  | "other";

/** A piece of authorized context the Curator may surface (aggregates only — no exact PII join). */
export interface CaseContext {
  /** aggregated POS window relevant to the review (e.g. that service's totals) */
  posWindow?: unknown;
  weather?: unknown;
  event?: unknown;
}

export interface RecoveryCase {
  id: string;
  /** "real" = derived from a real review; "synthetic" = clearly-marked generated variant */
  source: "real" | "synthetic";
  review: {
    /** 1–5 stars */
    stars: number;
    text: string;
    /** ISO date or short hint */
    date?: string;
    /** BCP-47-ish hint, e.g. "fr", "en" */
    lang?: string;
    /** menu item ids the review refers to, if any */
    mentions?: MenuItem["id"][];
  };
  context?: CaseContext;
  /** the ground truth the GRPR scorer checks the produced reply/ticket against */
  gold: {
    /** expected triage */
    incidentType: IncidentType;
    /** facts/aspects the evidence ledger MUST cover, e.g. ["acknowledge_delay","cite_policy_gesture"] */
    requiredEvidenceTags: string[];
    /** disclosures that MUST be present, e.g. ["allergen_disclaimer","no_refund_promise"] */
    requiredDisclosures: string[];
    /** claims that MUST NOT appear, e.g. ["free_meal","full_refund"] */
    forbiddenClaims?: string[];
  };
}
