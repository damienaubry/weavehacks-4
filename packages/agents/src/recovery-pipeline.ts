/**
 * RECOVERY PIPELINE — `runRecoveryCase(case, variant, models)`: turn ONE RecoveryCase into a
 * RecoveryOutput, in three variants. SAME base model + SAME tool union across all three — only the
 * orchestration differs, so the GRPR gap is cleanly attributable to coordination (toggle the
 * Verifier off and it collapses).
 *
 *   • solo        — ONE agent curates+analyses+writes in one shot, then self-revises N times with NO
 *                   grounding/policy feedback and NO independent Verifier. The strong, compute-matched
 *                   baseline (budget ≥ team).
 *   • team        — Curator → Analyst → Writer → mechanical Verifier; the Verifier blocks ≤1 rewrite
 *                   until the ledger is grounded, policy holds, and the ticket is valid.
 *   • team+memory — team + failure-card memory: retrieve lessons from past similar failures BEFORE the
 *                   Writer drafts; on a Verifier block, write a failure card the next similar case
 *                   retrieves — so the team stops repeating the same over-promise.
 *
 * WS-C imports `runRecoveryCase`, scores `output` against the case gold (grounding via
 * `checkGrounding(ledgerToClaims(output.ledger), toolCalls)`), and aggregates `budget` for the parity
 * guard. Each case run is one traced Weave op (`recovery.case`).
 */
import { traced } from "@weavehacks/observability";
import type { ToolCallRecord } from "@weavehacks/runtime";
import type { RecoveryCase, IncidentType } from "@weavehacks/seed";
import type { Budget } from "./grounding";
import type { RecoveryOutput, RecoveryVariant } from "./recovery-contract";
import { writeFailureCard, retrieveFailureCards, type FailureCard } from "./memory";
import {
  runCurator,
  runAnalyst,
  runWriter,
  runReviser,
  runSolo,
  runSoloRevise,
  verifyRecovery,
  buildRecoveryCritic,
  type RecoveryVerdict,
  type StationRunRaw,
} from "./recovery-stations";

/** Solo self-revisions after v1 — keeps the solo pass-count ≥ the team's (compute parity). */
const DEFAULT_SOLO_RETRIES = 3;

export interface RecoveryModels {
  /** the base model every station + the solo agent runs on (SAME across variants) */
  base?: string;
}

export interface RecoveryRunOptions {
  /** solo self-revision count (default 3 — set so solo budget ≥ team budget for parity) */
  soloRetries?: number;
  /** KILL-SHOT lever: run the team WITHOUT the Verifier's block/rewrite → GRPR must collapse toward solo */
  disableVerifier?: boolean;
}

export interface RecoveryCaseRun {
  variant: RecoveryVariant;
  caseId: string;
  /** what WS-C scores into a CaseScore */
  output: RecoveryOutput;
  /** union of every tool result captured this run — feed straight to checkGrounding */
  toolCalls: ToolCallRecord[];
  /** compute spent — used to assert parity across variants */
  budget: Budget;
  /** the Verifier blocked the first draft and drove a rewrite (team variants only) */
  rewrote: boolean;
  /** the mechanical critic feedback that drove the rewrite ("" if nothing was blocked) */
  criticFeedback: string;
  /** verdict on the first draft (the v1 a solo would ship) */
  verdictV1: RecoveryVerdict;
  /** verdict on the final (post-rewrite) output */
  verdictFinal: RecoveryVerdict;
  /** the pre-rewrite team draft — for the live v1→v2 demo + front-end drill-down */
  draftV1?: RecoveryOutput;
  /** a failure card reused before drafting (team+memory only) */
  memoryUsed?: { failureCardId: string; tag: string };
}

// ─── Budget accounting (mirrors grounding.ts's parity helpers; each LLM run = one pass) ───────────

const emptyBudget = (): Budget => ({ passes: 0, llmCalls: 0, producerTokens: 0 });
function addRun(b: Budget, r: StationRunRaw): void {
  b.passes += 1;
  b.llmCalls += r.llmCalls;
  b.producerTokens += r.usage.totalTokens;
}

// ─── Failure-card memory (Layer 2) — tags must overlap between WRITE and READ to retrieve ────────

/** The failure tags a case of this incident type is most at risk of — the retrieval filter. */
function riskTagsFor(incidentType: IncidentType): string[] {
  if (incidentType === "allergen_concern") return ["allergen_disclosure", "over_promise", "unsourced_claim"];
  return ["over_promise", "unsourced_claim", "missing_ticket"];
}

/**
 * The failure tags a blocked verdict actually exhibited — written onto the card. Kept to the SAME
 * small vocabulary `riskTagsFor` filters on so a written card is retrievable on a later similar case.
 * "allergen_disclosure" is the catch-all allergen-risk tag (covers both a missing disclaimer AND a
 * forbidden allergen-free overclaim) — the card's `bad_pattern` carries the precise detail.
 */
function verdictTags(v: RecoveryVerdict): string[] {
  const tags = new Set<string>();
  if (v.ungrounded.length || v.emptyLedger) tags.add("unsourced_claim");
  for (const pv of v.policyViolations) tags.add(pv.tag === "product_is_allergen_free" ? "allergen_disclosure" : "over_promise");
  if (v.missingDisclosures.includes("allergen_disclaimer")) tags.add("allergen_disclosure");
  if (!v.ticketValid) tags.add("missing_ticket");
  return [...tags];
}

function buildFailureCard(rcase: RecoveryCase, verdict: RecoveryVerdict): FailureCard {
  const missing = verdict.ungrounded.map((c) => c.claim).join("; ") || "(no ungrounded claim)";
  const badPattern =
    verdict.policyViolations[0]?.detail ??
    (verdict.missingDisclosures.length
      ? `missing disclosure: ${verdict.missingDisclosures.join(", ")}`
      : verdict.ungrounded[0]
        ? `unsupported figure: ${verdict.ungrounded[0].claim}`
        : !verdict.ticketValid
          ? "missing or invalid internal ticket"
          : "policy or grounding issue");
  return {
    id: `fc-${rcase.id}`,
    caseId: rcase.id,
    failure_tags: verdictTags(verdict),
    missing_evidence: missing,
    bad_pattern: badPattern,
    patch_exemplar:
      "Acknowledge the specific issue, frame goodwill as at most a 15% credit on the NEXT order (per " +
      "policy — never a free meal or full refund), add any required disclosure, and open a valid internal ticket.",
  };
}

function buildLessons(cards: FailureCard[]): string {
  return (
    "LESSONS FROM PAST SIMILAR CASES (don't repeat these):\n" +
    cards.map((c) => `  • Avoid: ${c.bad_pattern}. Instead: ${c.patch_exemplar}`).join("\n")
  );
}

// ─── Variant runners ─────────────────────────────────────────────────────────────────────────────

async function runSoloVariant(rcase: RecoveryCase, models: RecoveryModels, soloRetries: number): Promise<RecoveryCaseRun> {
  const budget = emptyBudget();
  const toolCalls: ToolCallRecord[] = [];

  const first = await runSolo(rcase, models.base);
  addRun(budget, first.raw);
  toolCalls.push(...first.raw.toolCalls);
  let output = first.output;

  for (let i = 0; i < soloRetries; i++) {
    const r = await runSoloRevise(rcase, output, models.base);
    addRun(budget, r.raw);
    toolCalls.push(...r.raw.toolCalls);
    output = r.output;
  }

  const verdict = verifyRecovery(output, toolCalls);
  return {
    variant: "solo",
    caseId: rcase.id,
    output,
    toolCalls,
    budget,
    rewrote: false,
    criticFeedback: "",
    verdictV1: verdict,
    verdictFinal: verdict,
  };
}

async function runTeamVariant(
  rcase: RecoveryCase,
  variant: RecoveryVariant,
  models: RecoveryModels,
  opts: RecoveryRunOptions,
): Promise<RecoveryCaseRun> {
  const useMemory = variant === "team+memory";
  const budget = emptyBudget();
  const toolCalls: ToolCallRecord[] = [];

  // 1. Curator — pull the authorized evidence (its tool calls are what ground the ledger).
  const curator = await runCurator(rcase, models.base);
  addRun(budget, curator);
  toolCalls.push(...curator.toolCalls);

  // 2. Analyst — triage (incidentType) + the cited atomic-fact ledger.
  const analyst = await runAnalyst(rcase, curator.text, models.base);
  addRun(budget, analyst.raw);
  toolCalls.push(...analyst.raw.toolCalls);

  // 2.5 Memory — retrieve lessons from past similar failures BEFORE the Writer drafts.
  let memoryUsed: RecoveryCaseRun["memoryUsed"];
  let lessons = "";
  if (useMemory) {
    const cards = await retrieveFailureCards({ text: rcase.review.text, tags: riskTagsFor(analyst.incidentType), k: 3 });
    if (cards.length) {
      lessons = buildLessons(cards);
      memoryUsed = { failureCardId: cards[0].id, tag: cards[0].failure_tags[0] ?? "" };
    }
  }

  // 3. Writer — draft the public reply + internal ticket from the ledger (v1).
  const writer = await runWriter(rcase, analyst.incidentType, analyst.ledger, { lessons }, models.base);
  addRun(budget, writer.raw);
  toolCalls.push(...writer.raw.toolCalls);

  let output: RecoveryOutput = {
    incidentType: analyst.incidentType,
    publicReply: writer.publicReply,
    ledger: analyst.ledger,
    ticket: writer.ticket,
  };
  const draftV1 = output;

  // 4. Verifier — mechanical grounding + deterministic policy + ticket schema. Blocks ≤1 rewrite.
  const verdictV1 = verifyRecovery(output, toolCalls);
  let verdictFinal = verdictV1;
  let rewrote = false;
  let criticFeedback = "";

  if (verdictV1.blocked && !opts.disableVerifier) {
    criticFeedback = buildRecoveryCritic(verdictV1);
    if (useMemory) await writeFailureCard(buildFailureCard(rcase, verdictV1));

    const rev = await runReviser(rcase, analyst.incidentType, output, criticFeedback, models.base);
    addRun(budget, rev.raw);
    toolCalls.push(...rev.raw.toolCalls);

    output = {
      incidentType: analyst.incidentType,
      publicReply: rev.publicReply,
      ledger: rev.ledger,
      ticket: rev.ticket,
    };
    verdictFinal = verifyRecovery(output, toolCalls);
    rewrote = true;
  }

  return {
    variant,
    caseId: rcase.id,
    output,
    toolCalls,
    budget,
    rewrote,
    criticFeedback,
    verdictV1,
    verdictFinal,
    draftV1,
    memoryUsed,
  };
}

/**
 * Run ONE case through ONE variant. Same model + tools across variants; only orchestration differs.
 * `opts.disableVerifier` is the kill-shot lever (run the team with the Verifier off → GRPR collapses).
 */
export async function runRecoveryCase(
  rcase: RecoveryCase,
  variant: RecoveryVariant,
  models: RecoveryModels = {},
  opts: RecoveryRunOptions = {},
): Promise<RecoveryCaseRun> {
  const run = traced("recovery.case", (v: RecoveryVariant, _caseId: string): Promise<RecoveryCaseRun> =>
    v === "solo"
      ? runSoloVariant(rcase, models, opts.soloRetries ?? DEFAULT_SOLO_RETRIES)
      : runTeamVariant(rcase, v, models, opts),
  );
  return run(variant, rcase.id);
}
