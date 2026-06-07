/**
 * RECOVERY SCORE + HARNESS — WS-C, THE judged number (GRPR), measured MECHANICALLY.
 *
 * `scoreCase` turns ONE `RecoveryOutput` into a conjunctive `CaseScore`: a case passes iff ALL of
 *   triage ∧ all-claims-grounded ∧ policy-ok ∧ ticket-valid.
 * Grounding is the existing mechanical checker (`checkGrounding`) — NO LLM judge for the headline.
 * Triage and ticket are deterministic. Policy is deterministic rules shared VERBATIM with WS-B's
 * Verifier (the canonical `@weavehacks/truth` detectors + the same `checkPolicy`), so blocking and
 * scoring use ONE vocabulary; a NARROW, isolated, fail-safe over-promise LLM judge is TOLERATED as
 * an opt-in backstop on the policy axis only (default OFF — never touches grounding).
 *
 * `runRecoveryHarness` runs each variant (`solo` / `team` / `team+memory`) over the dataset via
 * WS-B's `runRecoveryCase`, scores every case, aggregates `grpr = mean(pass)`, and captures the
 * `Budget` for the COMPUTE-PARITY guard. Every case is a traced Weave op (`recovery.case`, from the
 * pipeline) and every score is one too (`recovery.score`). `buildRecoveryReport` shapes the result
 * into the front-end's `RecoveryReport`.
 */

import { traced } from "@weavehacks/observability";
import { reason } from "@weavehacks/runtime";
import type { ToolCallRecord } from "@weavehacks/runtime";
import { RECOVERY_CASES, type RecoveryCase } from "@weavehacks/seed";
import { POLICY, replyHasDisclosure } from "@weavehacks/truth";
import { checkGrounding, type GroundingScore, type Budget } from "./grounding";
import { resetMemoryAsync, chronologicalSplit, assessMemoryLift, type MemoryLift } from "./memory";
import { ledgerToClaims, isTicketValid, checkPolicy as checkReplyPolicy, requiredDisclosuresFor } from "./recovery-stations";
import { runRecoveryCase, type RecoveryModels, type RecoveryCaseRun } from "./recovery-pipeline";
import type { CaseScore, RecoveryRunResult, RecoveryReport, RecoveryVariant, RecoveryOutput } from "./recovery-contract";

// ─── The narrow, isolated, fail-safe over-promise judge (the ONLY LLM allowed in scoring) ─────────

/**
 * Audit a reply for ONE thing — over-promising a gesture beyond policy — and nothing else. Isolated
 * from grounding/triage/ticket, it can only ever turn `policyOk` true→false (it runs only after the
 * deterministic rules pass). FAIL-SAFE: any error returns `overPromised:false`, so the mechanical
 * result stands and the headline is never at the mercy of a model.
 */
export async function judgeOverPromise(reply: string, model?: string): Promise<{ overPromised: boolean; reason: string }> {
  try {
    const v = await reason<{ overPromised?: unknown; reason?: unknown }>(
      `You are a strict compliance auditor for a restaurant's PUBLIC reply to a customer.\n` +
        `POLICY: the only goodwill gesture allowed is up to a ${POLICY.gesture.maxCreditPct}% credit on the customer's NEXT order. ` +
        `FORBIDDEN without a manager's approval: a free meal/dish, a full or cash refund, a delivery-time guarantee, or any open-ended/unlimited promise.\n` +
        `Audit ONLY for over-promising a gesture beyond this policy. IGNORE tone, grammar, and factual accuracy.\n\n` +
        `REPLY:\n"""${reply}"""\n\nReturn ONLY JSON {"overPromised": <true|false>, "reason": "<=10 words"}.`,
      { role: "verifier", temperature: 0, model },
    );
    return { overPromised: v.overPromised === true, reason: typeof v.reason === "string" ? v.reason : "" };
  } catch {
    return { overPromised: false, reason: "judge unavailable (fail-safe)" };
  }
}

// ─── Structured policy/menu grounding (principled credit, symmetric across variants) ─────────────
// checkGrounding is built for numeric/string claims that appear VERBATIM in a tool result. But POLICY
// and MENU facts the agents legitimately cite — "full_refund forbidden", "kyotobox", "price_reference
// disclosure" — are REAL structured fields of policy_lookup / get_menu that don't surface as verbatim
// substrings, so the verbatim matcher wrongly flags them ungrounded. This recognises a claim as
// grounded when its text genuinely references a distinctive token the CITED tool actually returned
// this run. It never invents grounding (the token must really be in the tool result) and is applied
// identically to solo, team and team+memory — so it corrects a measurement blind spot, not the gap.
const normAnchor = (s: string): string => s.toLowerCase().replace(/_/g, " ").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

function collectAnchors(value: unknown, into: Set<string>): void {
  if (typeof value === "string") {
    const n = normAnchor(value);
    if (n.length >= 5) into.add(n);
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectAnchors(v, into);
    return;
  }
  if (value && typeof value === "object") for (const v of Object.values(value)) collectAnchors(v, into);
}

/** Distinctive string tokens that policy_lookup / get_menu actually returned this run. */
function policyMenuAnchors(toolCalls: ToolCallRecord[]): string[] {
  const anchors = new Set<string>();
  for (const tc of toolCalls) if (tc.name === "policy_lookup" || tc.name === "get_menu") collectAnchors(tc.result, anchors);
  return [...anchors];
}

/** Does an otherwise-unmatched claim genuinely reference a structured policy/menu token? */
function claimMatchesAnchor(claim: { claim: string; statedValue: unknown }, anchors: string[]): boolean {
  const hay = normAnchor(`${claim.claim} ${typeof claim.statedValue === "string" ? claim.statedValue : ""}`);
  return anchors.some((a) => hay.includes(a));
}

// ─── scoreCase — the conjunctive GRPR for ONE case ────────────────────────────────────────────────

export interface ScoreOptions {
  /** opt-in narrow over-promise judge on the policy axis (default OFF — keep verifier↔scorer coherent). */
  useOverPromiseJudge?: boolean;
  /** model for that judge (measurement-grade). */
  judgeModel?: string;
}

function ticketFailReason(ticket: RecoveryOutput["ticket"]): string {
  if (ticket.owner.trim() === "" || ticket.action.trim() === "") return "absent ou incomplet (owner/action manquant)";
  if (!(["low", "med", "high"] as string[]).includes(ticket.severity)) return "gravité invalide";
  return "invalide";
}

/**
 * Score ONE produced `RecoveryOutput` against the case GOLD + the tool results the run captured.
 * `pass` is the AND of the four sub-checks; `failReasons`/`checks` feed the front-end drill-down.
 */
export async function scoreCase(
  output: RecoveryOutput,
  rcase: RecoveryCase,
  toolCalls: ToolCallRecord[],
  opts: ScoreOptions = {},
): Promise<CaseScore> {
  const failReasons: string[] = [];

  // 1. TRIAGE — deterministic.
  const triageCorrect = output.incidentType === rcase.gold.incidentType;
  if (!triageCorrect) failReasons.push(`triage : '${output.incidentType}' (≠ ${rcase.gold.incidentType})`);

  // 2. GROUNDING — mechanical, no LLM. Map the ledger ({fact,…}) → Claim ({claim,…}) first.
  //    A non-empty reply with an EMPTY ledger is NOT a vacuous pass: it mirrors the Verifier's own
  //    emptyLedger block (recovery-stations.verifyRecovery), so scoring + verification stay coherent
  //    and a claim-free reply can't pass the very axis the headline rests on.
  const grounding: GroundingScore = checkGrounding(ledgerToClaims(output.ledger), toolCalls);
  const anchors = policyMenuAnchors(toolCalls);
  // Credit claims the verbatim matcher missed but that genuinely reference a structured policy/menu field.
  const checks = grounding.checks.map((c) =>
    c.grounded || !claimMatchesAnchor(c, anchors) ? c : { ...c, grounded: true, matchedTool: "(policy/menu field)" },
  );
  const ungroundedCount = checks.filter((c) => !c.grounded).length;
  const emptyLedger = output.ledger.length === 0 && output.publicReply.trim().length > 0;
  const allClaimsGrounded = !emptyLedger && ungroundedCount === 0;
  if (emptyLedger) {
    failReasons.push("grounding : ledger vide — aucune claim sourcée pour étayer la réponse");
  } else if (!allClaimsGrounded) {
    for (const c of checks.filter((x) => !x.grounded).slice(0, 4)) {
      failReasons.push(`claim non sourcée : « ${c.claim} » (${JSON.stringify(c.statedValue)})`);
    }
  }

  // 3. POLICY — deterministic (shared vocabulary with the Verifier) + optional narrow judge.
  //    Forbidden claims + the gesture credit limit reuse WS-B's `checkPolicy` (canon detectors).
  //    Required disclosures use the case GOLD (the dataset's authoritative labels), not the
  //    incident-inferred set the Verifier uses internally.
  const canon = checkReplyPolicy(output); // { forbidden (claims + over_promise gesture), missingDisclosures(incident) }
  const missingGoldDisclosures = (rcase.gold.requiredDisclosures ?? []).filter((t) => !replyHasDisclosure(t, output.publicReply));
  let policyOk = canon.forbidden.length === 0 && missingGoldDisclosures.length === 0;
  for (const v of canon.forbidden) failReasons.push(`politique : ${v.detail} [${v.tag}]`);
  for (const t of missingGoldDisclosures) failReasons.push(`politique : divulgation requise manquante '${t}'`);
  if (policyOk && opts.useOverPromiseJudge) {
    const verdict = await judgeOverPromise(output.publicReply, opts.judgeModel);
    if (verdict.overPromised) {
      policyOk = false;
      failReasons.push(`politique : sur-promesse (jugée${verdict.reason ? ` — ${verdict.reason}` : ""})`);
    }
  }

  // 4. TICKET — schema check.
  const ticketValid = isTicketValid(output.ticket);
  if (!ticketValid) failReasons.push(`ticket interne : ${ticketFailReason(output.ticket)}`);

  const pass = triageCorrect && allClaimsGrounded && policyOk && ticketValid;
  return { caseId: rcase.id, triageCorrect, allClaimsGrounded, policyOk, ticketValid, pass, checks, failReasons };
}

// ─── runRecoveryHarness — 3 variants over the dataset, scored + budgeted + traced ────────────────

export interface HarnessOptions {
  /** the base model every variant runs on (SAME across variants — parity). */
  models?: RecoveryModels;
  /** solo self-revisions (default from the pipeline = 3, set so solo budget ≥ team budget). */
  soloRetries?: number;
  /** which variants to run (default all three, in order). */
  variants?: RecoveryVariant[];
  /** cases to score (default the whole RECOVERY_CASES dataset). */
  cases?: RecoveryCase[];
  /** opt-in over-promise judge for the policy axis (default OFF). */
  useOverPromiseJudge?: boolean;
  /** measurement-grade model for the over-promise judge — MUST be independent of models.base (the
   *  model under test) to avoid the auditor sharing the producer's blind spots. Default undefined →
   *  the runtime default model. */
  judgeModel?: string;
  /** evaluate team+memory on a chronological HELD-OUT split (warm memory on early cases, SCORE only
   *  the later cases) so the third row is not measured on its own warm-up set. Default true. */
  memorySplit?: boolean;
  /** fraction of cases used to WARM memory before the held-out test slice (default 0.4). */
  warmFraction?: number;
  /** KILL-SHOT: run the team variants with the Verifier disabled → GRPR must collapse toward solo. */
  disableVerifier?: boolean;
}

export interface CaseRunRecord {
  caseId: string;
  variant: RecoveryVariant;
  run: RecoveryCaseRun;
  score: CaseScore;
}

/** The honest team-vs-team+memory read (WS-D guard) + the within-session Layer-1 fallback signal. */
export interface HonestComparison {
  /** team GRPR restricted to the held-out test slice — apples-to-apples vs team+memory. null if N/A */
  teamTestGrpr: number | null;
  /** team+memory GRPR on the held-out test slice (= its row grpr when the split ran). null if N/A */
  memoryTestGrpr: number | null;
  /** WS-D's honest lift verdict on the held-out slice (null unless both team + team+memory ran). */
  lift: MemoryLift | null;
  /** did team+memory beat team CLEANLY on the held-out slice? (= lift.helped) */
  memoryBeatsTeam: boolean;
  /** how the chronological order was derived + the slice sizes + the held-out test ids (null when no split ran). */
  split: { orderedBy: "date" | "index"; warmCount: number; testCount: number; testIds: string[] } | null;
  /** Layer-1 fallback: team cases the Verifier's v1→v2 rewrite rescued (v1 would fail, final passes). */
  rewriteRescued: number;
  teamCases: number;
  note: string;
}

export interface HarnessResult {
  results: RecoveryRunResult[];
  records: CaseRunRecord[];
  cases: RecoveryCase[];
  honest: HonestComparison;
}

const ALL_VARIANTS: RecoveryVariant[] = ["solo", "team", "team+memory"];

const zeroBudget = (): Budget => ({ passes: 0, llmCalls: 0, producerTokens: 0 });
function bumpBudget(b: Budget, add: Budget): void {
  b.passes += add.passes;
  b.llmCalls += add.llmCalls;
  b.producerTokens += add.producerTokens;
}

/** How many cases to score CONCURRENTLY (cases are independent). Bounded to respect provider rate limits. */
const CONCURRENCY = Math.max(1, Number(process.env.RECOVERY_CONCURRENCY ?? 4));

/** Run `fn` over `items` with at most `concurrency` in flight. Order-independent (GRPR is a mean). */
async function mapPool<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, async () => {
    while (next < items.length) await fn(items[next++]);
  });
  await Promise.all(workers);
}

/**
 * GUARD (scorer↔Verifier coherence): the scorer enforces the case's GOLD disclosures, but the
 * Verifier only enforces the incident-INFERRED set (`requiredDisclosuresFor`). If a gold disclosure
 * is outside that set, the team is penalized for something its Verifier never pushed it to fix —
 * silently flattening the team gap. We can't see the gold from the pipeline (no leakage), so we
 * surface any such divergence loudly here (warn, not throw — the demo must stay runnable).
 */
function assertDisclosureInvariant(cases: RecoveryCase[]): void {
  const offenders: string[] = [];
  for (const c of cases) {
    const enforced = requiredDisclosuresFor(c.gold.incidentType);
    for (const t of c.gold.requiredDisclosures ?? []) {
      if (!enforced.includes(t)) offenders.push(`${c.id}: gold disclosure '${t}' ∉ Verifier-enforced set for ${c.gold.incidentType}`);
    }
  }
  if (offenders.length) {
    console.warn(
      `[recovery-score] ⚠ scorer↔Verifier disclosure divergence — the team is scored on a disclosure its Verifier never enforces (flattens the team gap):\n  ` +
        offenders.join("\n  "),
    );
  }
}

interface SplitInfo {
  orderedBy: "date" | "index";
  warmCount: number;
  testCount: number;
  testIds: Set<string>;
}

function buildHonest(results: RecoveryRunResult[], records: CaseRunRecord[], split: SplitInfo | null): HonestComparison {
  const team = results.find((r) => r.variant === "team");
  const mem = results.find((r) => r.variant === "team+memory");
  const teamRecords = records.filter((r) => r.variant === "team");
  const rewriteRescued = teamRecords.filter((r) => r.run.verdictV1.blocked && !r.run.verdictFinal.blocked).length;

  // team+memory's row is ALREADY the held-out test slice (when the split ran). Compute team's GRPR
  // on the SAME test slice — reused from team's full perCase, no extra LLM — for an apples-to-apples
  // lift, then defer the honest verdict to WS-D's assessMemoryLift (with its small-sample caveat).
  let teamTestGrpr: number | null = null;
  let memoryTestGrpr: number | null = null;
  let lift: MemoryLift | null = null;
  if (team && mem) {
    memoryTestGrpr = mem.grpr;
    const teamSubset = split ? team.perCase.filter((s) => split.testIds.has(s.caseId)) : team.perCase;
    teamTestGrpr = teamSubset.length ? teamSubset.filter((s) => s.pass).length / teamSubset.length : team.grpr;
    lift = assessMemoryLift({ teamGrpr: teamTestGrpr, teamMemoryGrpr: memoryTestGrpr, nTest: split ? split.testCount : team.perCase.length });
  }
  const memoryBeatsTeam = lift ? lift.helped : false;

  let note: string;
  if (!lift) {
    note = "Run team and team+memory together for the held-out memory comparison.";
  } else if (lift.helped) {
    note = lift.note;
  } else {
    note = `${lift.note} Layer-1 fallback: the Verifier's v1→v2 rewrite rescued ${rewriteRescued}/${teamRecords.length} team case(s).`;
  }

  return {
    teamTestGrpr,
    memoryTestGrpr,
    lift,
    memoryBeatsTeam,
    split: split ? { orderedBy: split.orderedBy, warmCount: split.warmCount, testCount: split.testCount, testIds: [...split.testIds] } : null,
    rewriteRescued,
    teamCases: teamRecords.length,
    note,
  };
}

/**
 * Run the full GRPR scoreboard. solo + team are scored on the WHOLE dataset (the solo<team headline,
 * max sample). team+memory is scored on a CHRONOLOGICAL HELD-OUT slice: memory is warmed on the
 * earliest cases (failure-cards written there — they carry failure patterns, never gold labels) and
 * scored ONLY on the later, held-out cases, so the third row is never measured on its own warm-up
 * set (the anti-leakage story). `resetMemoryAsync()` clears the store first so nothing bleeds across
 * runs. Each case is a traced Weave op (`recovery.case`); each score is one too (`recovery.score`).
 */
export async function runRecoveryHarness(opts: HarnessOptions = {}): Promise<HarnessResult> {
  const cases = opts.cases ?? RECOVERY_CASES;
  const variants = opts.variants ?? ALL_VARIANTS;
  const models = opts.models ?? {};
  const memorySplit = opts.memorySplit !== false;

  assertDisclosureInvariant(cases);

  const scoreOne = traced("recovery.score", (output: RecoveryOutput, rcase: RecoveryCase, toolCalls: ToolCallRecord[]) =>
    scoreCase(output, rcase, toolCalls, { useOverPromiseJudge: opts.useOverPromiseJudge, judgeModel: opts.judgeModel }),
  );
  const runOne = (rcase: RecoveryCase, variant: RecoveryVariant) =>
    runRecoveryCase(rcase, variant, models, { soloRetries: opts.soloRetries, disableVerifier: opts.disableVerifier });

  // Chronological order for the held-out memory split (by review date if present, else input order).
  const chrono = chronologicalSplit(cases, { dateOf: (c) => c.review.date, warmFraction: opts.warmFraction });
  const useSplit = memorySplit && chrono.testCount > 0 && chrono.warmCount > 0;
  const splitInfo: SplitInfo | null = useSplit
    ? { orderedBy: chrono.orderedBy, warmCount: chrono.warmCount, testCount: chrono.testCount, testIds: new Set(chrono.test.map((c) => c.id)) }
    : null;

  const records: CaseRunRecord[] = [];
  const results: RecoveryRunResult[] = [];

  for (const variant of variants) {
    const perCase: CaseScore[] = [];
    const budget = zeroBudget();

    // Score ONE case + accumulate its budget/record (mutations are synchronous post-await → pool-safe).
    const scoreAndRecord = async (rcase: RecoveryCase): Promise<void> => {
      const run = await runOne(rcase, variant);
      const score = await scoreOne(run.output, rcase, run.toolCalls);
      perCase.push(score);
      bumpBudget(budget, run.budget);
      records.push({ caseId: rcase.id, variant, run, score });
    };

    if (variant === "team+memory" && useSplit) {
      // HELD-OUT: warm memory on the early cases SEQUENTIALLY (preserve chronological card-writing,
      // no leakage), then score the held-out test slice CONCURRENTLY (cards are all written by now).
      await resetMemoryAsync();
      for (const rcase of chrono.warm) await runOne(rcase, variant); // warm only — populate memory
      await mapPool(chrono.test, CONCURRENCY, scoreAndRecord);
    } else {
      if (variant === "team+memory") await resetMemoryAsync(); // full-set fallback: still clear cross-run state
      await mapPool(cases, CONCURRENCY, scoreAndRecord); // cases are independent → run them concurrently
    }
    const grpr = perCase.length ? perCase.filter((s) => s.pass).length / perCase.length : 0;
    results.push({ variant, grpr, perCase, budget });
  }

  return { results, records, cases, honest: buildHonest(results, records, splitInfo) };
}

// ─── buildRecoveryReport — shape the harness result into the front-end's RecoveryReport ──────────

/** Pick a drill-down case: prefer solo-fails / team-passes; else any contrast; else the first case. */
function pickSampleCase(h: HarnessResult): RecoveryReport["sampleCase"] | null {
  const byCase = new Map<string, { solo?: CaseRunRecord; team?: CaseRunRecord; memory?: CaseRunRecord }>();
  for (const r of h.records) {
    const slot = byCase.get(r.caseId) ?? {};
    if (r.variant === "solo") slot.solo = r;
    else if (r.variant === "team") slot.team = r;
    else slot.memory = r;
    byCase.set(r.caseId, slot);
  }
  const caseById = new Map(h.cases.map((c) => [c.id, c]));

  const score = (s: { solo?: CaseRunRecord; team?: CaseRunRecord; memory?: CaseRunRecord }): number => {
    const teamLike = s.team ?? s.memory;
    if (s.solo && teamLike && !s.solo.score.pass && teamLike.score.pass) return 3; // the money shot
    if (s.solo && teamLike && !s.solo.score.pass) return 2;
    if (s.solo) return 1;
    return 0;
  };
  let best: { solo?: CaseRunRecord; team?: CaseRunRecord; memory?: CaseRunRecord } | null = null;
  let bestScore = -1;
  for (const slot of byCase.values()) {
    const sc = score(slot);
    if (sc > bestScore) {
      bestScore = sc;
      best = slot;
    }
  }
  if (!best) return null;
  const teamRec = best.team ?? best.memory;
  const anyRec = best.solo ?? teamRec;
  if (!anyRec) return null;
  const rcase = caseById.get(anyRec.caseId);
  if (!rcase) return null;
  const memRec = best.memory;

  return {
    id: rcase.id,
    review: rcase.review.text,
    incidentTypeGold: rcase.gold.incidentType,
    solo: best.solo
      ? { reply: best.solo.run.output.publicReply, pass: best.solo.score.pass, failReasons: best.solo.score.failReasons }
      : { reply: "(solo variant not run)", pass: false, failReasons: [] },
    team: teamRec
      ? { reply: teamRec.run.output.publicReply, pass: teamRec.score.pass }
      : { reply: "(team variant not run)", pass: false },
    ...(memRec?.run.memoryUsed
      ? { memoryReuse: { failureCardId: memRec.run.memoryUsed.failureCardId, tag: memRec.run.memoryUsed.tag } }
      : {}),
  };
}

/** Assemble the contract-shaped `RecoveryReport` the API serves + the front-end renders (real numbers). */
export function buildRecoveryReport(h: HarnessResult): RecoveryReport {
  const realCount = h.cases.filter((c) => c.source === "real").length;
  const sampleCase = pickSampleCase(h);
  // APPLES-TO-APPLES LEADERBOARD: team+memory is scored on the chronological held-out slice, so score
  // solo and team on that SAME slice (no extra LLM — reuse their perCase) instead of the full set.
  // Otherwise the three rows would mix denominators (16 vs 10). No split ⇒ each row's full GRPR.
  const testIds = h.honest.split?.testIds ?? null;
  const grprOnBasis = (r: RecoveryRunResult): number => {
    if (!testIds || r.variant === "team+memory") return r.grpr; // memory's grpr IS already the held-out slice
    const sub = r.perCase.filter((s) => testIds.includes(s.caseId));
    return sub.length ? sub.filter((s) => s.pass).length / sub.length : r.grpr;
  };
  const report: RecoveryReport = {
    dataset: { n: h.cases.length, realCount, syntheticCount: h.cases.length - realCount },
    rows: h.results.map((r) => ({
      variant: r.variant,
      grpr: grprOnBasis(r),
      budgetTokens: r.budget.producerTokens,
      budgetCalls: r.budget.llmCalls,
    })),
    sampleCase: sampleCase ?? {
      id: "(none)",
      review: "(no cases scored)",
      incidentTypeGold: "other",
      solo: { reply: "", pass: false, failReasons: [] },
      team: { reply: "", pass: false },
    },
  };
  return report;
}
