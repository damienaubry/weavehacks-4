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
import { runToolAgent, reason, type ToolCallRecord } from "@weavehacks/runtime";
import { TARGET_DATE } from "@weavehacks/seed";
import { HISTORY_TOOLS } from "./tools/history";
import { REALTIME_TOOLS, MENU_TOOLS } from "./tools/realtime";

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

function checkOne(c: Claim, ctx: GroundCtx): ClaimCheck {
  const sv = c.statedValue;
  if (typeof sv === "number" && Number.isFinite(sv)) {
    // 1) Verbatim — the value appears in a tool result (cited tool first, then any; generous).
    const cited = c.citedTool && ctx.byTool.has(c.citedTool) ? ctx.byTool.get(c.citedTool)! : null;
    if (cited) {
      const m = cited.find((n) => numClose(sv, n));
      if (m !== undefined) return { ...c, grounded: true, matchedTool: c.citedTool ?? undefined, matchedValue: m };
    }
    const any = ctx.globalNums.find((n) => numClose(sv, n));
    if (any !== undefined) return { ...c, grounded: true, matchedTool: "(any tool)", matchedValue: any };

    // 2) Derived percent — correctly computable from the named item's own baseline→conditional numbers.
    if (isPercentClaim(c.claim) && Math.abs(sv) <= 300) {
      const itemNums = itemNumbersForClaim(c.claim, ctx.itemNumbers);
      if (itemNums.length >= 2 && derivesPercent(sv, itemNums)) return { ...c, grounded: true, matchedTool: "(derived %)" };
    }
    // 3) Derived total — matches the sum of a per-item sheet a tool returned.
    if (isTotalClaim(c.claim)) {
      const m = ctx.perItemSums.find((s) => Math.abs(sv - s) <= Math.max(5, TOTAL_TOL_REL * s));
      if (m !== undefined) return { ...c, grounded: true, matchedTool: "(derived total)", matchedValue: m };
    }
    return { ...c, grounded: false };
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

// ─── The producing agent (Prep) — same prompt + tools for solo and team ──────────────────

const PRODUCER_TOOLS = [...HISTORY_TOOLS, ...REALTIME_TOOLS, ...MENU_TOOLS];

// Phase-1 producer: write the brief, calling tools for numbers. NO JSON constraint here — forcing
// JSON in the same turn makes some models emit tool calls as text and break function-calling. We
// deliberately do NOT say "never invent a number" — grounding discipline is the Critic's job, and
// baking it into the shared producer would erase the very gap we are measuring.
const PROSE_INSTRUCTIONS =
  `You are Prep at Le Kyoto, a Japanese takeout near Paris. Write tonight's dinner prep brief for ${TARGET_DATE} (a Friday; dow=5). ` +
  `First gather data: call get_menu (the items), demand_baseline with dow=5 (the typical Friday), get_weather / get_games / get_holidays / get_events for the date, and demand_by_condition to see how those conditions moved demand historically. ` +
  `Then write a SPECIFIC, confident brief a head chef can act on. For EACH menu item give the prep QUANTITY and the % CHANGE vs a normal Friday. Then give the single biggest swing, the expected TOTAL covers tonight, and tonight's weather (condition + temperature). Use exact numbers.`;

// Phase-2 formatter: convert the producer's own prose into checkable claims. No tools, no judging —
// pure text→JSON structuring, which models do reliably. The grounding DECISION stays mechanical.
function extractInstruction(prose: string): string {
  return (
    `From this kitchen prep brief, extract ONLY the substantive demand/prep figures, as separate atomic claims: ` +
    `(1) each menu item's prep QUANTITY, (2) each menu item's % CHANGE vs a normal Friday, (3) the expected TOTAL covers, ` +
    `(4) tonight's weather condition (short string) and temperature (number). ` +
    `Do NOT extract the year, calendar dates, clock/kickoff times, staff counts, or other structural numbers — only the demand figures above.\n\nBRIEF:\n${prose}\n\n` +
    `Return ONLY JSON: {"claims":[{"claim":"<short statement>","statedValue":<number, or short string for a factual value>,"citedTool":<the tool the brief attributes it to, or null>}]}. One figure per claim.`
  );
}

export interface ProducerOutput {
  prose: string;
  claims: Claim[];
  toolCalls: ToolCallRecord[];
  raw: string;
  parseError?: string;
}

function normalizeClaims(raw: unknown): Claim[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((c) => {
      if (!c || typeof c !== "object") return null;
      const o = c as Record<string, unknown>;
      let sv = o.statedValue as number | string;
      if (typeof sv === "string" && sv.trim() !== "" && Number.isFinite(Number(sv))) sv = Number(sv);
      const claim = typeof o.claim === "string" ? o.claim : String(o.claim ?? "");
      const citedTool = typeof o.citedTool === "string" ? o.citedTool : null;
      if (sv === undefined || sv === null || claim === "") return null;
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

async function extractClaims(prose: string, model?: string): Promise<{ claims: Claim[]; parseError?: string }> {
  const once = async (): Promise<Claim[]> => {
    const obj = await withRetry(() => reason<{ claims?: unknown }>(extractInstruction(prose), { role: "prep", model, temperature: 0 }));
    return normalizeClaims(obj.claims);
  };
  try {
    let claims = await once();
    // Re-ask once if the formatter clearly under-extracted (a real brief states many figures).
    if (claims.length < 4) {
      try {
        const retry = await once();
        if (retry.length > claims.length) claims = retry;
      } catch {
        /* keep first attempt */
      }
    }
    return { claims };
  } catch (e) {
    return { claims: [], parseError: (e as Error).message };
  }
}

/**
 * Producer = phase-1 tool-agent (writes the brief, grounds numbers via tools) + phase-2 formatter
 * (structures the prose into claims). Returns the prose, the structured claims, and the tool
 * results captured this run (what the claims are checked against).
 */
async function runProducer(input: string, model?: string): Promise<ProducerOutput> {
  const res = await withRetry(() =>
    runToolAgent({
      name: "Prep",
      role: "prep",
      instructions: PROSE_INSTRUCTIONS,
      input,
      tools: PRODUCER_TOOLS,
      model,
      maxSteps: 6,
      temperature: 0.1,
    }),
  );
  const { claims, parseError } = await extractClaims(res.text, model);
  return { prose: res.text, claims, toolCalls: res.toolCalls, raw: res.text, parseError };
}

// ─── The mechanical Critic feedback (drives ONE rewrite) ─────────────────────────────────

function buildCriticFeedback(blocked: ClaimCheck[]): string {
  const lines = blocked.map(
    (c) => `  • "${c.claim}" — stated ${JSON.stringify(c.statedValue)} (cited ${c.citedTool ?? "none"}): not found in any tool result.`,
  );
  return (
    `${blocked.length} figure(s) in your brief are NOT backed by any tool result captured this run:\n` +
    lines.join("\n") +
    `\n\nRewrite the brief with HARD RULES:\n` +
    `• Every number you state must be a number that appears in a tool result. Call demand_baseline / demand_by_condition / get_weather to get real numbers.\n` +
    `• Do NOT state a % change or a total-covers figure unless that exact number is in a tool result. Instead state the tool-backed QUANTITY (e.g. "cold soba: prep 3, down from 9.5"), or OMIT the figure.\n` +
    `• Do not restate any flagged number above. A grounded brief with fewer numbers beats a confident brief with invented ones.`
  );
}

// ─── Solo vs Team scenario ───────────────────────────────────────────────────────────────

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

export interface GroundingComparison {
  solo: GroundingRun;
  team: GroundingRun;
  /** the mechanical Critic feedback that drove the rewrite (empty if nothing was blocked) */
  criticFeedback: string;
  /** true if the rewrite ran (i.e. the solo had ungrounded claims to block) */
  rewrote: boolean;
}

const PRODUCER_TASK = `Write the dinner prep brief for ${TARGET_DATE}. Be specific and confident.`;

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

/**
 * Run the grounding comparison. Producer v1 is SHARED (identical starting point); the solo is v1,
 * the team adds the mechanical Critic + one rewrite. Each producer call and each grounding check is
 * a traced Weave op.
 */
export async function runGroundingScenario(opts: { model?: string } = {}): Promise<GroundingComparison> {
  const produce = traced("agent.prep.produce", (task: string) => runProducer(task, opts.model));
  const rewrite = traced("agent.prep.rewrite", (task: string) => runProducer(task, opts.model));
  const checkSolo = traced("grounding.check.solo", (claims: Claim[], calls: ToolCallRecord[]) => checkGrounding(claims, calls));
  const checkTeam = traced("grounding.check.team", (claims: Claim[], calls: ToolCallRecord[]) => checkGrounding(claims, calls));

  // v1 — the shared producer draft.
  const v1 = await produce(PRODUCER_TASK);
  const soloScore = await checkSolo(v1.claims, v1.toolCalls);
  const blocked = soloScore.checks.filter((c) => !c.grounded);

  // SOLO = v1 as-is.
  const solo = toRun(v1, soloScore);

  // TEAM = v1 → Critic blocks ungrounded → one rewrite using only tool-backed numbers.
  if (blocked.length === 0) {
    return { solo, team: solo, criticFeedback: "", rewrote: false };
  }
  const criticFeedback = buildCriticFeedback(blocked);
  const v2Input = `${PRODUCER_TASK}\n\nYOUR PREVIOUS DRAFT:\n${v1.raw}\n\nMECHANICAL GROUNDING CRITIC:\n${criticFeedback}`;
  const v2 = await rewrite(v2Input);
  // The team had access to every tool result it pulled across v1 and the rewrite.
  const teamCalls = [...v1.toolCalls, ...v2.toolCalls];
  const teamScore = await checkTeam(v2.claims, teamCalls);

  return { solo, team: toRun(v2, teamScore), criticFeedback, rewrote: true };
}
