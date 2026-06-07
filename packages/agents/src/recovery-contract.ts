/**
 * RECOVERY CONTRACT — the shared interfaces every recovery workstream codes against.
 *
 * WS-B (agents) produces a `RecoveryOutput` per case. WS-C (eval) scores it into a `CaseScore`
 * (the conjunctive, mostly-mechanical GRPR) and aggregates into a `RecoveryRunResult`. The API
 * serves a `RecoveryReport` that the front-end (WS-E) renders. Keeping these here (a DOMAIN
 * package) — not in @weavehacks/shared — preserves the rule that the orchestration/observability
 * SPINE stays domain-agnostic.
 */
import type { IncidentType } from "@weavehacks/seed";
import type { ClaimCheck, Budget } from "./grounding";

/** The three pipelines under comparison (same model + tools; only orchestration differs). */
export type RecoveryVariant = "solo" | "team" | "team+memory";

/** What a pipeline emits for ONE case. */
export interface RecoveryOutput {
  incidentType: IncidentType;
  /** the customer-facing reply (HITL-gated, never auto-published) */
  publicReply: string;
  /** atomic, citable facts the reply rests on — checked mechanically by checkGrounding */
  ledger: { fact: string; statedValue: number | string; citedTool?: string | null }[];
  /** the internal action ticket */
  ticket: {
    severity: "low" | "med" | "high";
    owner: string;
    action: string;
    dueHint?: string;
  };
}

/** The conjunctive GRPR for ONE case. `pass` = AND of the four sub-checks. */
export interface CaseScore {
  caseId: string;
  /** predicted incidentType === gold (deterministic) */
  triageCorrect: boolean;
  /** every ledger claim backed by a tool result (mechanical, via checkGrounding) */
  allClaimsGrounded: boolean;
  /** required disclosures present, no forbidden claim, no over-promise (rules + narrow judge) */
  policyOk: boolean;
  /** ticket has valid severity/owner/action (schema check) */
  ticketValid: boolean;
  pass: boolean;
  /** per-claim grounding detail (for the trace + the front-end drill-down) */
  checks: ClaimCheck[];
  /** human-readable reasons a case failed (front-end highlights these) */
  failReasons: string[];
}

/** Aggregate result for one variant over the whole dataset. */
export interface RecoveryRunResult {
  variant: RecoveryVariant;
  /** Grounded Recovery Pass Rate = mean(pass) in [0,1] */
  grpr: number;
  perCase: CaseScore[];
  /** compute spent — used to assert parity across variants */
  budget: Budget;
}

/** The shape the API serves at GET /recovery and the front-end renders. */
export interface RecoveryReport {
  dataset: { n: number; realCount: number; syntheticCount: number };
  rows: {
    variant: RecoveryVariant;
    grpr: number;
    budgetTokens: number;
    budgetCalls: number;
  }[];
  /** one illustrative case for the drill-down (solo fails, team passes) */
  sampleCase: {
    id: string;
    review: string;
    incidentTypeGold: IncidentType;
    solo: { reply: string; pass: boolean; failReasons: string[] };
    team: { reply: string; pass: boolean };
    memoryReuse?: { failureCardId: string; tag: string };
  };
  /** true while runRecovery is a stub returning mock data (front-end can show a banner) */
  placeholder?: boolean;
}
