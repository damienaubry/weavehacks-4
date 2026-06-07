/**
 * GROUNDING eval — the judged headline, measured MECHANICALLY (no LLM judge).
 *
 * A producing agent (Prep) writes a prep brief and emits every figure as a STRUCTURED claim
 * {claim, statedValue, citedTool?}. A deterministic checker then verifies each numeric/factual
 * claim against the tool RESULTS captured during the run — grounded iff the stated value actually
 * appears in a tool result (within tolerance). No model scores anything.
 *
 * Experimental control: SOLO and TEAM share the SAME producer (same model, same tools, same first
 * draft v1). The ONLY difference is the Critic:
 *   • SOLO  = v1 as-is.
 *   • TEAM  = v1 → mechanical Critic blocks ungrounded claims → producer rewrites ONCE using only
 *             tool-backed numbers → re-scored.
 * So any grounding gap is attributable to coordination (the Critic), nothing else.
 *
 * The matcher is deliberately GENEROUS (a claim counts as grounded if its number appears in ANY
 * captured tool result, within ±1 or ±8%): we would rather UNDER-count hallucinations than fake a
 * gap. If the solo still leaves claims ungrounded under generous matching, the gap is real.
 */

import { traced } from "@weavehacks/observability";
import { runToolAgent, reason, type ToolCallRecord, type ToolSpec, type TokenUsage } from "@weavehacks/runtime";
import { TARGET_DATE } from "@weavehacks/seed";
import { HISTORY_TOOLS } from "./tools/history";
import { REALTIME_TOOLS, MENU_TOOLS } from "./tools/realtime";
import { REVIEW_TOOLS } from "./tools/reviews";

// ─── Claims + mechanical grounding check ─────────────────────────────────────────────────

export interface Claim {
  /** one atomic statement, e.g. "prep ~32 gyoza" */
  claim: string;
  /** the number (or short factual string) the claim asserts */
  statedValue: number | string;
  /** the tool the producer says backs it (or null/omitted) */
  citedTool?: string | null;
}

export interface ClaimCheck extends Claim {
  grounded: boolean;
  /** which tool result the value was found in (or "(any)"/"(string match)") */
  matchedTool?: string;
  /** the tool-result number it matched */
  matchedValue?: number;
}

export interface GroundingScore {
  total: number;
  grounded: number;
  ungroundedCount: number;
  /** grounded / total, in [0,1] */
  groundingRate: number;
  checks: ClaimCheck[];
}

/** Structural numbers that are not "claimable values" — skip so they can't accidentally ground. */
const SKIP_KEYS = new Set(["dow", "hour", "lastN", "minimum", "maximum", "code"]);
const NUM_TOL_ABS = 1.0;
const NUM_TOL_REL = 0.08;

function numClose(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(NUM_TOL_ABS, NUM_TOL_REL * Math.max(Math.abs(a), Math.abs(b)));
}

/** Deep-collect finite numbers from a tool result, skipping obviously-structural fields. */
function collectNumbers(value: unknown, into: number[], parentKey = ""): void {
  if (typeof value === "number") {
    if (Number.isFinite(value) && !SKIP_KEYS.has(parentKey)) into.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectNumbers(v, into, parentKey);
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) collectNumbers(v, into, k);
  }
}

/** Deep-collect lowercased strings (for factual/string claims). */
function collectStrings(value: unknown, into: string[]): void {
  if (typeof value === "string") {
    into.push(value.toLowerCase());
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectStrings(v, into);
    return;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value)) collectStrings(v, into);
  }
}

/** Normalize a key/claim token for matching: lowercase, strip non-alphanumerics. */
const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const PCT_TOL = 4; // percentage points
const TOTAL_TOL_REL = 0.1;

/** Numbers keyed by the field they sit under (e.g. perItemAvg.cold_soba → "coldsoba" → [9.5, 4]). */
function collectKeyedNumbers(value: unknown, into: Map<string, number[]>, key = ""): void {
  if (typeof value === "number") {
    if (Number.isFinite(value) && !SKIP_KEYS.has(key)) {
      const k = norm(key);
      if (k) into.set(k, [...(into.get(k) ?? []), value]);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectKeyedNumbers(v, into, key);
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) collectKeyedNumbers(v, into, k);
  }
}

/** Candidate service totals = the sum of each per-item map a tool returned (e.g. a baseline sheet). */
function collectPerItemSums(value: unknown, into: number[]): void {
  if (Array.isArray(value)) {
    for (const v of value) collectPerItemSums(v, into);
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (k === "perItemAvg" && v && typeof v === "object" && !Array.isArray(v)) {
        const sum = Object.values(v as Record<string, unknown>).reduce<number>((s, x) => s + (typeof x === "number" ? x : 0), 0);
        if (sum > 0) into.push(Math.round(sum * 10) / 10);
      }
      collectPerItemSums(v, into);
    }
  }
}

interface GroundCtx {
  globalNums: number[];
  byTool: Map<string, number[]>;
  globalStrs: string[];
  itemNumbers: Map<string, number[]>;
  perItemSums: number[];
}

const isPercentClaim = (t: string): boolean => /%|percent|change/i.test(t);
const isTotalClaim = (t: string): boolean => /total|cover/i.test(t);
const isRatioClaim = (t: string): boolean => /\d+(\.\d+)?\s*x\b|\btimes\b|\bfold\b|multiplier/i.test(t);

/** Is `stated` (a multiplier, e.g. 3 for "3x") the ratio between two of this item's own numbers? */
function derivesRatio(stated: number, itemNums: number[]): boolean {
  if (stated <= 0) return false;
  for (const a of itemNums) {
    if (a === 0) continue;
    for (const b of itemNums) {
      if (b === a) continue;
      if (Math.abs(b / a - stated) <= Math.max(0.2, 0.15 * stated)) return true;
    }
  }
  return false;
}

/** The tool numbers belonging to the menu item(s) named in a claim. */
function itemNumbersForClaim(claimText: string, itemNumbers: Map<string, number[]>): number[] {
  const t = norm(claimText);
  const out: number[] = [];
  for (const [k, nums] of itemNumbers) if (k.length >= 3 && t.includes(k)) out.push(...nums);
  return out;
}

/** Is `stated` (a percent) the change between two of this item's own observed numbers? */
function derivesPercent(stated: number, itemNums: number[]): boolean {
  for (const a of itemNums) {
    if (a === 0) continue;
    for (const b of itemNums) {
      if (b === a) continue;
      if (Math.abs((100 * (b - a)) / a - stated) <= PCT_TOL) return true;
    }
  }
  return false;
}

function verbatim(sv: number, c: Claim, ctx: GroundCtx): ClaimCheck | null {
  const cited = c.citedTool && ctx.byTool.has(c.citedTool) ? ctx.byTool.get(c.citedTool)! : null;
  if (cited) {
    const m = cited.find((n) => numClose(sv, n));
    if (m !== undefined) return { ...c, grounded: true, matchedTool: c.citedTool ?? undefined, matchedValue: m };
  }
  const any = ctx.globalNums.find((n) => numClose(sv, n));
  if (any !== undefined) return { ...c, grounded: true, matchedTool: "(any tool)", matchedValue: any };
  return null;
}

function checkOne(c: Claim, ctx: GroundCtx): ClaimCheck {
  const sv = c.statedValue;
  if (typeof sv === "number" && Number.isFinite(sv)) {
    // RATIO ("3x"): item-scoped derivation ONLY — a bare small int must not coincidentally verbatim-match.
    if (isRatioClaim(c.claim)) {
      const itemNums = itemNumbersForClaim(c.claim, ctx.itemNumbers);
      return itemNums.length >= 2 && derivesRatio(sv, itemNums)
        ? { ...c, grounded: true, matchedTool: "(derived ratio)" }
        : { ...c, grounded: false };
    }
    // PERCENT: verbatim (a direct stat like a review %) OR item-scoped %-change derivation.
    if (isPercentClaim(c.claim) && Math.abs(sv) <= 300) {
      const v = verbatim(sv, c, ctx);
      if (v) return v;
      const itemNums = itemNumbersForClaim(c.claim, ctx.itemNumbers);
      if (itemNums.length >= 2 && derivesPercent(sv, itemNums)) return { ...c, grounded: true, matchedTool: "(derived %)" };
      return { ...c, grounded: false };
    }
    // TOTAL: verbatim OR matches a per-item sheet sum.
    if (isTotalClaim(c.claim)) {
      const v = verbatim(sv, c, ctx);
      if (v) return v;
      const m = ctx.perItemSums.find((s) => Math.abs(sv - s) <= Math.max(5, TOTAL_TOL_REL * s));
      return m !== undefined ? { ...c, grounded: true, matchedTool: "(derived total)", matchedValue: m } : { ...c, grounded: false };
    }
    // Plain quantity / temperature / price / count → verbatim.
    return verbatim(sv, c, ctx) ?? { ...c, grounded: false };
  }
  // Factual/string claim → grounded if the normalized value appears in any tool-result string.
  const needle = String(sv).toLowerCase().trim();
  const hit = needle.length >= 2 && ctx.globalStrs.some((s) => s.includes(needle));
  return { ...c, grounded: hit, matchedTool: hit ? "(string match)" : undefined };
}

/**
 * MECHANICAL grounding check (no LLM). A claim is grounded iff its stated value is backed by the
 * tool results captured this run — either VERBATIM (the number appears, within ±1/±8%) or DERIVED
 * (a % change computable from the named item's own numbers; a total matching a per-item sum). A
 * derived figure only grounds if the data to compute it was actually pulled — so invented figures
 * stay flagged. Strings ground as substrings.
 */
export function checkGrounding(claims: Claim[], toolCalls: ToolCallRecord[]): GroundingScore {
  const ctx: GroundCtx = {
    globalNums: [],
    byTool: new Map(),
    globalStrs: [],
    itemNumbers: new Map(),
    perItemSums: [],
  };
  for (const tc of toolCalls) {
    const nums: number[] = [];
    collectNumbers(tc.result, nums);
    ctx.globalNums.push(...nums);
    ctx.byTool.set(tc.name, [...(ctx.byTool.get(tc.name) ?? []), ...nums]);
    collectStrings(tc.result, ctx.globalStrs);
    collectKeyedNumbers(tc.result, ctx.itemNumbers);
    collectPerItemSums(tc.result, ctx.perItemSums);
  }
  const checks = claims.map((c) => checkOne(c, ctx));
  const grounded = checks.filter((c) => c.grounded).length;
  const total = checks.length;
  return { total, grounded, ungroundedCount: total - grounded, groundingRate: total ? grounded / total : 1, checks };
}

// ─── Producers — Content (hero) + Prep. Same prompt + tools for solo and team; only the Critic differs ──

export interface ProducerConfig {
  id: string;
  /** provider-routing role */
  role: string;
  /** system prompt: who the producer is + which tools to use. NO "never invent" — grounding is the Critic's job. */
  instructions: string;
  /** the producing task */
  task: string;
  tools: ToolSpec[];
  /** phase-2 formatter: structure the producer's prose into checkable claims (no tools, no judging) */
  extract: (prose: string) => string;
  /** solo self-improvement prompt — a FAIR retry with NO mechanical grounding feedback (compute-parity baseline) */
  selfRetry: (task: string, prevProse: string) => string;
}

// Prep brief producer (kept available).
const PREP_INSTRUCTIONS =
  `You are Prep at Le Kyoto, a Japanese takeout near Paris. Write tonight's dinner prep brief for ${TARGET_DATE} (a Friday; dow=5). ` +
  `First gather data: call get_menu, demand_baseline with dow=5, get_weather / get_games / get_holidays / get_events, and demand_by_condition. ` +
  `Then write a SPECIFIC, confident brief. For EACH menu item give the prep QUANTITY and the % CHANGE vs a normal Friday, plus the expected TOTAL covers and tonight's weather (condition + temperature). Use exact numbers.`;

export const PREP_PRODUCER: ProducerConfig = {
  id: "prep",
  role: "prep",
  instructions: PREP_INSTRUCTIONS,
  task: `Write the dinner prep brief for ${TARGET_DATE}. Be specific and confident.`,
  tools: [...HISTORY_TOOLS, ...REALTIME_TOOLS, ...MENU_TOOLS],
  extract: (prose) =>
    `From this kitchen prep brief, extract ONLY the substantive demand figures as atomic claims: each menu item's prep QUANTITY, ` +
    `each item's % CHANGE vs a normal Friday, the expected TOTAL covers, and tonight's weather condition (string) + temperature (number). ` +
    `Do NOT extract the year, dates, clock times, or other structural numbers.\n\nBRIEF:\n${prose}\n\n` +
    `Return ONLY JSON: {"claims":[{"claim":"<short statement>","statedValue":<number or short string>,"citedTool":<tool or null>}]}. One figure per claim.`,
  selfRetry: (task, prev) =>
    `${task}\n\nYour current brief:\n"""${prev}"""\n\nRevise it to be more useful and precise; double-check each number against your tools and fix anything off.`,
};

// CONTENT — the hero producer: a social post that must ground its stats in POS + reviews.
export const CONTENT_PRODUCER: ProducerConfig = {
  id: "content",
  role: "content",
  instructions:
    `You are the Content agent for Le Kyoto, a Japanese takeout near Paris. Write ONE short, punchy Instagram post ` +
    `IN ENGLISH promoting Friday ${TARGET_DATE} dinner — make people want to pre-order. ` +
    `You have tools to back claims with real numbers: demand_baseline / demand_by_condition / orders_on (POS history), ` +
    `review_stats / get_reviews (customer reviews), get_menu (items + prices), get_weather / get_games (tonight's hooks). ` +
    `Use specific stats (a popular dish, a review stat, a match-night angle). Output ONLY the post — 3–5 short lines, no notes or tables.`,
  task: `Write the Instagram post (in English) for Friday ${TARGET_DATE} dinner.`,
  tools: [...HISTORY_TOOLS, ...REVIEW_TOOLS, ...REALTIME_TOOLS, ...MENU_TOOLS],
  extract: (prose) =>
    `From this restaurant Instagram post, extract every QUANTITATIVE claim as atomic claims and give statedValue as a NUMBER: ` +
    `a stat/percentage ("80% of 5-star mention broth" → 80), a multiplier ("gyoza sell 3x" → 3, keep "3x" in the claim text), ` +
    `a price ("14,50€" → 14.5), a quantity, a rating, or a "+N% busier" change. ` +
    `Do NOT extract clock times (e.g. 21h), single letters, dates, or non-quantitative fragments. Only quantitative claims.\n\nPOST:\n${prose}\n\n` +
    `Return ONLY JSON: {"claims":[{"claim":"<short statement, keep '%'/'x'>","statedValue":<NUMBER>,"citedTool":<tool or null>}]}. One number per claim.`,
  selfRetry: (task, prev) =>
    `${task}\n\nHere is your current draft:\n"""${prev}"""\n\n` +
    `Revise it: punchier, more compelling, with specific and credible numbers. You may use your tools. ` +
    `Output ONLY the final Instagram post (3–5 short lines in English) — no notes, tables, or explanations.`,
};

export interface ProducerOutput {
  prose: string;
  claims: Claim[];
  toolCalls: ToolCallRecord[];
  raw: string;
  parseError?: string;
  /** producer tool-agent token usage */
  usage: TokenUsage;
  /** chat-completions made by the producer tool-agent (incl. tool-loop steps) */
  producerCalls: number;
  /** chat-completions made by the phase-2 formatter */
  formatterCalls: number;
}

/**
 * Coerce a stated value into a number when it's a locale-formatted figure — "14,50€" → 14.5,
 * "100%" → 100, "21h" → 21, "3x" → 3 — so the numeric checker (not the brittle string path) runs.
 * Leaves genuine factual strings ("rain", "PSG–Marseille") as strings.
 */
function coerceValue(raw: unknown): number | string | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (s === "") return null;
  let cleaned = s.replace(/[€$£%]/g, "").replace(/\bh\b/gi, "").replace(/\s/g, "");
  if (cleaned.includes(",") && !cleaned.includes(".")) cleaned = cleaned.replace(",", "."); // decimal comma
  const m = cleaned.match(/^-?\d+(\.\d+)?/); // leading number, e.g. "3x" → 3
  if (m && Number.isFinite(Number(m[0]))) return Number(m[0]);
  return s;
}

function normalizeClaims(raw: unknown): Claim[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((c) => {
      if (!c || typeof c !== "object") return null;
      const o = c as Record<string, unknown>;
      const sv = coerceValue(o.statedValue);
      const claim = typeof o.claim === "string" ? o.claim : String(o.claim ?? "");
      const citedTool = typeof o.citedTool === "string" ? o.citedTool : null;
      if (sv === null || claim === "") return null;
      return { claim, statedValue: sv, citedTool } as Claim;
    })
    .filter((c): c is Claim => c !== null);
}

/** Retry a transient LLM/network failure a couple of times — W&B Inference occasionally drops a connection. */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 700 * (i + 1)));
    }
  }
  throw lastErr;
}

async function extractClaims(config: ProducerConfig, prose: string, model?: string): Promise<{ claims: Claim[]; parseError?: string; calls: number }> {
  let calls = 0;
  const once = async (): Promise<Claim[]> => {
    calls += 1;
    const obj = await withRetry(() => reason<{ claims?: unknown }>(config.extract(prose), { role: config.role, model, temperature: 0 }));
    return normalizeClaims(obj.claims);
  };
  try {
    let claims = await once();
    if (claims.length < 4) {
      try {
        const retry = await once();
        if (retry.length > claims.length) claims = retry;
      } catch {
        /* keep first attempt */
      }
    }
    return { claims, calls };
  } catch (e) {
    return { claims: [], parseError: (e as Error).message, calls };
  }
}

/** Producer = phase-1 tool-agent (writes the draft, grounds via tools) + phase-2 formatter (structures claims). */
async function runProducer(config: ProducerConfig, input: string, model?: string): Promise<ProducerOutput> {
  const res = await withRetry(() =>
    runToolAgent({ name: config.id, role: config.role, instructions: config.instructions, input, tools: config.tools, model, maxSteps: 6, temperature: 0.1 }),
  );
  const { claims, parseError, calls } = await extractClaims(config, res.text, model);
  return { prose: res.text, claims, toolCalls: res.toolCalls, raw: res.text, parseError, usage: res.usage, producerCalls: res.llmCalls, formatterCalls: calls };
}

// ─── The mechanical Critic feedback (drives ONE rewrite) ─────────────────────────────────

function buildCriticFeedback(blocked: ClaimCheck[]): string {
  const lines = blocked.map(
    (c) => `  • "${c.claim}" — stated ${JSON.stringify(c.statedValue)} (cited ${c.citedTool ?? "none"}): not backed by any tool result.`,
  );
  return (
    `${blocked.length} claim(s) in your draft are NOT backed by any tool result captured this run:\n` +
    lines.join("\n") +
    `\n\nRewrite with HARD RULES:\n` +
    `• Every number/stat must appear in — or be directly computable from — a tool result. Call your tools (demand_baseline, demand_by_condition, review_stats, get_menu) for exact figures.\n` +
    `• Do NOT state a multiplier ("3x"), percentage, or total unless the tool numbers support it — use the exact tool figure, or OMIT the claim.\n` +
    `• Do not restate any flagged number. A grounded draft with fewer numbers beats a punchy one with invented stats.`
  );
}

// ─── Solo vs Team scenario (with compute parity) ─────────────────────────────────────────

export interface GroundingRun {
  groundingRate: number;
  grounded: number;
  ungroundedCount: number;
  total: number;
  checks: ClaimCheck[];
  prose: string;
  claims: Claim[];
  toolCalls: ToolCallRecord[];
  parseError?: string;
}

/** Compute budget spent by a pipeline (for the parity guard). */
export interface Budget {
  /** number of producer drafts (v1 + retries/rewrite) */
  passes: number;
  /** total chat-completions (producer tool-loop steps + formatter calls) */
  llmCalls: number;
  /** total producer tokens (formatter tokens not captured; producer dominates) */
  producerTokens: number;
}

export interface PipelineResult extends GroundingRun {
  budget: Budget;
}

export interface GroundingComparison {
  producer: string;
  solo: PipelineResult;
  team: PipelineResult;
  /** the mechanical Critic feedback that drove the rewrite (empty if nothing was blocked) */
  criticFeedback: string;
  /** true if the rewrite ran (i.e. the first draft had ungrounded claims to block) */
  rewrote: boolean;
  /** the SHARED first-draft grounding (used by the across-run self-improvement series in BLOCK 2) */
  firstDraft: { groundingRate: number; ungroundedCount: number; total: number };
}

function toRun(out: ProducerOutput, score: GroundingScore): GroundingRun {
  return {
    groundingRate: score.groundingRate,
    grounded: score.grounded,
    ungroundedCount: score.ungroundedCount,
    total: score.total,
    checks: score.checks,
    prose: out.prose,
    claims: out.claims,
    toolCalls: out.toolCalls,
    parseError: out.parseError,
  };
}

const budgetOf = (o: ProducerOutput): Budget => ({ passes: 1, llmCalls: o.producerCalls + o.formatterCalls, producerTokens: o.usage.totalTokens });
function addBudget(b: Budget, o: ProducerOutput): void {
  b.passes += 1;
  b.llmCalls += o.producerCalls + o.formatterCalls;
  b.producerTokens += o.usage.totalTokens;
}

/**
 * Run the grounding comparison with COMPUTE PARITY. v1 is the SHARED first draft. The SOLO pipeline
 * then self-retries `soloRetries` times with NO Critic (a fair, equal-or-greater compute budget); the
 * TEAM pipeline runs the mechanical Critic + ONE rewrite. Both score their final draft against every
 * tool result their pipeline pulled. Each producer call and grounding check is a traced Weave op.
 */
export async function runGroundingScenario(
  config: ProducerConfig,
  opts: { model?: string; soloRetries?: number } = {},
): Promise<GroundingComparison> {
  const soloRetries = opts.soloRetries ?? 2;
  const produce = traced(`agent.${config.id}.produce`, (input: string) => runProducer(config, input, opts.model));
  const soloRetry = traced(`agent.${config.id}.solo_retry`, (input: string) => runProducer(config, input, opts.model));
  const rewrite = traced(`agent.${config.id}.rewrite`, (input: string) => runProducer(config, input, opts.model));
  const checkSolo = traced("grounding.check.solo", (claims: Claim[], calls: ToolCallRecord[]) => checkGrounding(claims, calls));
  const checkTeam = traced("grounding.check.team", (claims: Claim[], calls: ToolCallRecord[]) => checkGrounding(claims, calls));

  // v1 — the shared first draft.
  const v1 = await produce(config.task);
  const v1Score = checkGrounding(v1.claims, v1.toolCalls);

  // SOLO pipeline — v1 + self-retries (NO Critic), equal/greater compute budget.
  const soloBudget = budgetOf(v1);
  const soloCalls = [...v1.toolCalls];
  let soloOut = v1;
  for (let i = 0; i < soloRetries; i++) {
    const sr = await soloRetry(config.selfRetry(config.task, soloOut.prose));
    addBudget(soloBudget, sr);
    soloCalls.push(...sr.toolCalls);
    soloOut = sr;
  }
  const soloScore = await checkSolo(soloOut.claims, soloCalls);

  // TEAM pipeline — v1 → mechanical Critic → ONE rewrite.
  const teamBudget = budgetOf(v1);
  const blocked = v1Score.checks.filter((c) => !c.grounded);
  let teamOut = v1;
  let teamScore = v1Score;
  let criticFeedback = "";
  let rewrote = false;
  if (blocked.length) {
    criticFeedback = buildCriticFeedback(blocked);
    const v2 = await rewrite(`${config.task}\n\nYOUR PREVIOUS DRAFT:\n${v1.raw}\n\nMECHANICAL GROUNDING CRITIC:\n${criticFeedback}`);
    addBudget(teamBudget, v2);
    teamOut = v2;
    teamScore = await checkTeam(v2.claims, [...v1.toolCalls, ...v2.toolCalls]);
    rewrote = true;
  }

  return {
    producer: config.id,
    solo: { ...toRun(soloOut, soloScore), budget: soloBudget },
    team: { ...toRun(teamOut, teamScore), budget: teamBudget },
    criticFeedback,
    rewrote,
    firstDraft: { groundingRate: v1Score.groundingRate, ungroundedCount: v1Score.ungroundedCount, total: v1Score.total },
  };
}
