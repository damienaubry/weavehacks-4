/**
 * RECOVERY STATIONS — the hero pipeline's agents (Curator → Analyst → Writer → Verifier) plus the
 * compute-matched SOLO baseline. Each LLM station runs on `runToolAgent` (every tool call a Weave
 * op); the Verifier is MECHANICAL (it reuses `checkGrounding` + deterministic POLICY rules — no LLM
 * judge, that's the whole point of the headline).
 *
 * Same model + same tool UNION across solo and the team — only the orchestration differs. Producer
 * prompts deliberately do NOT say "never invent": grounding is the Verifier's job, and the gap it
 * opens (solo ships ungrounded/over-promising drafts, the team blocks them) is what earns the
 * multi-agent setup. The Writer is told to be GENEROUS on purpose, so v1 over-promises and the
 * Verifier has a real reason to block → the live v1→v2 rewrite.
 */
import { traced } from "@weavehacks/observability";
import { runToolAgent, parseJsonLoose, type ToolSpec, type ToolCallRecord, type TokenUsage } from "@weavehacks/runtime";
import {
  POLICY,
  type RecoveryPolicy,
  replyHasForbiddenClaim,
  replyHasDisclosure,
  creditWithinPolicy,
  FORBIDDEN_CLAIM_TAGS,
} from "@weavehacks/truth";
import type { IncidentType, RecoveryCase } from "@weavehacks/seed";
import { HISTORY_TOOLS } from "./tools/history";
import { REALTIME_TOOLS, MENU_TOOLS, getWeatherTool, getMenuTool } from "./tools/realtime";
import { REVIEW_TOOLS } from "./tools/reviews";
import { POLICY_TOOLS, policyLookupTool } from "./tools/policy";
import { checkGrounding, type Claim, type ClaimCheck, type GroundingScore } from "./grounding";
import type { RecoveryOutput } from "./recovery-contract";

// ─── Tool sets — the UNION is identical across solo and the team (only distribution differs) ─────

/** Every evidence/policy tool a recovery agent may reach. Solo gets all of these; so does the team. */
export const RECOVERY_TOOLS: ToolSpec[] = [
  ...HISTORY_TOOLS, // demand_baseline / demand_by_condition / orders_on (aggregated POS window)
  getWeatherTool, //   conditions on the day of the incident
  ...MENU_TOOLS, //     get_menu (canonical dish facts)
  ...REVIEW_TOOLS, //   review_stats / get_reviews
  ...POLICY_TOOLS, //   policy_lookup (gesture limits + required disclosures)
];

/** The Writer drafts from the ledger; it only needs policy + menu wording. (Union is still RECOVERY_TOOLS.) */
const WRITER_TOOLS: ToolSpec[] = [policyLookupTool, getMenuTool];

export const INCIDENT_TYPES: IncidentType[] = [
  "food_quality",
  "delivery_late",
  "wrong_or_missing_item",
  "allergen_concern",
  "hygiene",
  "service_staff",
  "pricing_billing",
  "praise_no_issue",
  "other",
];

// ─── Station configs (system prompts). NO "never invent" — grounding is the Verifier's job. ──────

interface RecoveryStationConfig {
  id: string;
  name: string;
  instructions: string;
  tools: ToolSpec[];
  maxSteps: number;
  temperature: number;
}

const TRIAGE_ENUM = INCIDENT_TYPES.join(", ");

const CURATOR: RecoveryStationConfig = {
  id: "curator",
  name: "Evidence Curator",
  instructions:
    "You are the Evidence Curator for Le Kyoto, a Japanese takeout/delivery near Paris. Given ONE " +
    "customer review, gather the AUTHORIZED evidence another agent will need to draft a grounded " +
    "recovery reply. Use your tools: get_menu (the dish named), review_stats / get_reviews (what " +
    "customers say), demand_baseline / demand_by_condition / orders_on (the relevant POS window), " +
    "get_weather (conditions that day), and policy_lookup (the gesture limit + required disclosures). " +
    "Pull what is RELEVANT to this review — the dish mentioned, the policy that applies, the " +
    "operational context. Then list the evidence as short bullet points, each with the exact figure " +
    "and the tool it came from. Do NOT draft a reply or a ticket — only the evidence set.",
  tools: RECOVERY_TOOLS,
  maxSteps: 6,
  temperature: 0.2,
};

const ANALYST: RecoveryStationConfig = {
  id: "analyst",
  name: "Operational Analyst",
  instructions:
    "You are the Operational Analyst for Le Kyoto. You receive a customer review and the Curator's " +
    "evidence. Do two things:\n" +
    `1) TRIAGE: pick the single incidentType that best fits, from: ${TRIAGE_ENUM}.\n` +
    "2) LEDGER: list the atomic facts the reply will rest on. For each fact give a statedValue and " +
    "the tool that provides it (citedTool). Keep statedValue a BARE NUMBER where it is a number " +
    "(15 for a 15% credit, 14.5 for a €14.50 price) and put the words/units in the fact text; use a " +
    "short string for a non-numeric fact (a dish name, a weather condition). You may call tools " +
    "(policy_lookup for the gesture, get_menu for a dish, demand_baseline / review_stats for a stat) " +
    "to firm up a figure.\n" +
    'Return ONLY JSON: {"incidentType":"<type>","ledger":[{"fact":"<short fact>","statedValue":<number or short string>,"citedTool":"<tool name or null>"}]}.',
  tools: RECOVERY_TOOLS,
  maxSteps: 5,
  temperature: 0.2,
};

const WRITER: RecoveryStationConfig = {
  id: "writer",
  name: "Writer",
  instructions:
    "You are the Writer for Le Kyoto. You receive the review, the incident type, and the evidence " +
    "LEDGER. Write a WARM, GENEROUS public reply that wins the customer back — lean into making it " +
    "right for them — plus an internal action ticket. Use the ledger facts; call policy_lookup / " +
    "get_menu for exact gesture and wording. The ticket needs: severity (low|med|high), owner (the " +
    "team that handles it, e.g. ops-delivery, kitchen, front-of-house), action (one concrete next " +
    "step), and an optional dueHint.\n" +
    'Return ONLY JSON: {"publicReply":"<reply>","ticket":{"severity":"low|med|high","owner":"<team>","action":"<step>","dueHint":"<optional>"}}.',
  tools: WRITER_TOOLS,
  maxSteps: 4,
  temperature: 0.3,
};

const REVISER: RecoveryStationConfig = {
  id: "reviser", // distinct Weave op (`agent.recovery.reviser`) so the v1→v2 rewrite is legible in the trace
  name: "Writer (revise)",
  instructions:
    "You are the Writer for Le Kyoto, REVISING a recovery package the Verifier blocked. You will be " +
    "given the review, the incident type, your previous package, and the Verifier's feedback. Produce " +
    "a corrected package. You may call any tool (policy_lookup, get_menu, review_stats, " +
    "demand_baseline, ...) to pull exact figures. Re-emit the LEDGER too (drop or fix any unsupported " +
    "fact), the public reply, and the ticket.\n" +
    'Return ONLY JSON: {"ledger":[{"fact":"<short fact>","statedValue":<number or short string>,"citedTool":"<tool or null>"}],"publicReply":"<reply>","ticket":{"severity":"low|med|high","owner":"<team>","action":"<step>","dueHint":"<optional>"}}.',
  tools: RECOVERY_TOOLS,
  maxSteps: 5,
  temperature: 0.2,
};

const SOLO: RecoveryStationConfig = {
  id: "solo",
  name: "Solo Copilot",
  instructions:
    "You are Le Kyoto's recovery copilot — one capable agent handling the whole job. Given ONE " +
    "customer review, produce a COMPLETE recovery package in one go:\n" +
    `(1) triage the incidentType (one of: ${TRIAGE_ENUM});\n` +
    "(2) a warm, generous public reply that wins the customer back;\n" +
    "(3) a ledger of the atomic facts the reply rests on (each with statedValue + citedTool; keep " +
    "statedValue a bare number where numeric);\n" +
    "(4) an internal action ticket (severity low|med|high, owner, action, optional dueHint).\n" +
    "You have all the tools — get_menu, review_stats / get_reviews, demand_baseline / " +
    "demand_by_condition / orders_on, get_weather, policy_lookup — use them to make the reply " +
    "specific and credible.\n" +
    'Return ONLY JSON: {"incidentType":"<type>","publicReply":"<reply>","ledger":[{"fact":"<fact>","statedValue":<number or string>,"citedTool":"<tool or null>"}],"ticket":{"severity":"low|med|high","owner":"<team>","action":"<step>","dueHint":"<optional>"}}.',
  tools: RECOVERY_TOOLS,
  maxSteps: 6,
  temperature: 0.3,
};

// ─── Raw station run (the unit of compute we budget + trace) ─────────────────────────────────────

export interface StationRunRaw {
  text: string;
  toolCalls: ToolCallRecord[];
  usage: TokenUsage;
  llmCalls: number;
}

async function runStationRaw(cfg: RecoveryStationConfig, input: string, model?: string): Promise<StationRunRaw> {
  const call = traced(`agent.recovery.${cfg.id}`, (text: string) =>
    runToolAgent({
      name: cfg.name,
      role: cfg.id,
      instructions: cfg.instructions,
      input: text,
      tools: cfg.tools,
      model,
      maxSteps: cfg.maxSteps,
      temperature: cfg.temperature,
    }),
  );
  const res = await call(input);
  return { text: res.text, toolCalls: res.toolCalls, usage: res.usage, llmCalls: res.llmCalls };
}

// ─── Case → prompt input ─────────────────────────────────────────────────────────────────────────

export function caseInput(rcase: RecoveryCase): string {
  const r = rcase.review;
  const mentions = r.mentions?.length ? `\nMenu item(s) referenced: ${r.mentions.join(", ")}` : "";
  const date = r.date ? `\nReview date: ${r.date}` : "";
  const ctx =
    rcase.context && Object.keys(rcase.context).length ? `\nAuthorized context: ${JSON.stringify(rcase.context)}` : "";
  return `CUSTOMER REVIEW (${r.stars}★${r.lang ? `, ${r.lang}` : ""}):\n"""${r.text}"""${mentions}${date}${ctx}`;
}

function ledgerText(ledger: RecoveryOutput["ledger"]): string {
  if (!ledger.length) return "(empty)";
  return ledger.map((l) => `  • ${l.fact} — ${JSON.stringify(l.statedValue)} (${l.citedTool ?? "no tool"})`).join("\n");
}

// ─── Robust JSON coercion (never throws — a malformed draft becomes a typed, scoreable failure) ───

function safeParse(text: string): Record<string, unknown> {
  try {
    const v = parseJsonLoose<unknown>(text);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Mirror grounding.ts's coerceValue: "14,50€"→14.5, "15%"→15, "3x"→3; keep genuine strings. */
function coerceStated(raw: unknown): number | string | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (s === "") return null;
  let cleaned = s.replace(/[€$£%]/g, "").replace(/\bh\b/gi, "").replace(/\s/g, "");
  if (cleaned.includes(",") && !cleaned.includes(".")) cleaned = cleaned.replace(",", ".");
  const m = cleaned.match(/^-?\d+(\.\d+)?/);
  if (m && Number.isFinite(Number(m[0]))) return Number(m[0]);
  return s;
}

export function coerceIncidentType(v: unknown): IncidentType {
  if (typeof v === "string") {
    const s = v.trim().toLowerCase().replace(/[\s-]+/g, "_");
    const hit = INCIDENT_TYPES.find((t) => t === s);
    if (hit) return hit;
  }
  return "other";
}

export function coerceLedger(v: unknown): RecoveryOutput["ledger"] {
  if (!Array.isArray(v)) return [];
  const out: RecoveryOutput["ledger"] = [];
  for (const x of v) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const fact = typeof o.fact === "string" ? o.fact : typeof o.claim === "string" ? o.claim : "";
    const statedValue = coerceStated(o.statedValue ?? o.value);
    const citedTool = typeof o.citedTool === "string" ? o.citedTool : null;
    if (!fact || statedValue === null) continue;
    out.push({ fact, statedValue, citedTool });
  }
  return out;
}

export function coerceTicket(v: unknown): RecoveryOutput["ticket"] {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const sev = typeof o.severity === "string" ? o.severity.trim().toLowerCase() : "";
  const severity: "low" | "med" | "high" =
    sev === "low" ? "low" : sev === "high" ? "high" : "med";
  const owner = typeof o.owner === "string" ? o.owner.trim() : "";
  const action = typeof o.action === "string" ? o.action.trim() : "";
  const dueRaw = o.dueHint ?? o.due;
  const dueHint = typeof dueRaw === "string" && dueRaw.trim() ? dueRaw.trim() : undefined;
  return { severity, owner, action, ...(dueHint ? { dueHint } : {}) };
}

function coerceReply(o: Record<string, unknown>): string {
  return typeof o.publicReply === "string" ? o.publicReply : typeof o.reply === "string" ? o.reply : "";
}

// ─── Typed station runners (build the input, run, parse) ─────────────────────────────────────────

export async function runCurator(rcase: RecoveryCase, model?: string): Promise<StationRunRaw> {
  return runStationRaw(CURATOR, caseInput(rcase), model);
}

export interface AnalystResult {
  incidentType: IncidentType;
  ledger: RecoveryOutput["ledger"];
  raw: StationRunRaw;
}

export async function runAnalyst(rcase: RecoveryCase, evidence: string, model?: string): Promise<AnalystResult> {
  const input = `${caseInput(rcase)}\n\nCURATOR EVIDENCE:\n${evidence}`;
  const raw = await runStationRaw(ANALYST, input, model);
  const o = safeParse(raw.text);
  return { incidentType: coerceIncidentType(o.incidentType ?? o.triage ?? o.incident), ledger: coerceLedger(o.ledger ?? o.facts ?? o.claims), raw };
}

export interface WriterResult {
  publicReply: string;
  ticket: RecoveryOutput["ticket"];
  raw: StationRunRaw;
}

export async function runWriter(
  rcase: RecoveryCase,
  incidentType: IncidentType,
  ledger: RecoveryOutput["ledger"],
  opts: { lessons?: string },
  model?: string,
): Promise<WriterResult> {
  const lessons = opts.lessons ? `\n\n${opts.lessons}` : "";
  const input = `${caseInput(rcase)}\n\nINCIDENT TYPE: ${incidentType}\n\nEVIDENCE LEDGER:\n${ledgerText(ledger)}${lessons}`;
  const raw = await runStationRaw(WRITER, input, model);
  const o = safeParse(raw.text);
  return { publicReply: coerceReply(o), ticket: coerceTicket(o.ticket), raw };
}

export interface ReviserResult {
  ledger: RecoveryOutput["ledger"];
  publicReply: string;
  ticket: RecoveryOutput["ticket"];
  raw: StationRunRaw;
}

export async function runReviser(
  rcase: RecoveryCase,
  incidentType: IncidentType,
  prev: RecoveryOutput,
  criticFeedback: string,
  model?: string,
): Promise<ReviserResult> {
  const prevPkg = JSON.stringify({ ledger: prev.ledger, publicReply: prev.publicReply, ticket: prev.ticket });
  const input =
    `${caseInput(rcase)}\n\nINCIDENT TYPE: ${incidentType}\n\nYOUR PREVIOUS PACKAGE:\n${prevPkg}\n\nVERIFIER FEEDBACK:\n${criticFeedback}`;
  const raw = await runStationRaw(REVISER, input, model);
  const o = safeParse(raw.text);
  return { ledger: coerceLedger(o.ledger ?? o.facts ?? o.claims), publicReply: coerceReply(o), ticket: coerceTicket(o.ticket), raw };
}

export interface SoloResult {
  output: RecoveryOutput;
  raw: StationRunRaw;
}

function coerceFull(o: Record<string, unknown>): RecoveryOutput {
  return {
    incidentType: coerceIncidentType(o.incidentType ?? o.triage ?? o.incident),
    publicReply: coerceReply(o),
    ledger: coerceLedger(o.ledger ?? o.facts ?? o.claims),
    ticket: coerceTicket(o.ticket),
  };
}

export async function runSolo(rcase: RecoveryCase, model?: string): Promise<SoloResult> {
  const raw = await runStationRaw(SOLO, caseInput(rcase), model);
  return { output: coerceFull(safeParse(raw.text)), raw };
}

/** A fair, compute-matched self-revision — improves quality, NO grounding/policy feedback. */
export async function runSoloRevise(rcase: RecoveryCase, prev: RecoveryOutput, model?: string): Promise<SoloResult> {
  const input =
    `${caseInput(rcase)}\n\nYOUR CURRENT RECOVERY PACKAGE:\n${JSON.stringify(prev)}\n\n` +
    "Revise it to be more helpful, warmer, and more specific — a package the customer and the team " +
    "will both appreciate. Return ONLY the same JSON shape.";
  const raw = await runStationRaw(SOLO, input, model);
  return { output: coerceFull(safeParse(raw.text)), raw };
}

// ─── The Verifier — MECHANICAL (checkGrounding + deterministic POLICY rules). No LLM judge. ───────

export interface PolicyViolation {
  /** machine tag, e.g. "free_meal", "over_promise", "product_is_allergen_free", "missing_allergen_disclaimer" */
  tag: string;
  /** human-readable detail */
  detail: string;
}

export interface RecoveryVerdict {
  /** the verifier blocks (drives a rewrite) iff any sub-check fails */
  blocked: boolean;
  grounding: GroundingScore;
  ungrounded: ClaimCheck[];
  /**
   * A substantive reply resting on an EMPTY ledger. checkGrounding scores an empty claim set as
   * vacuously grounded (ungroundedCount 0), so without this the rewrite could "pass" grounding by
   * dropping every fact. We treat that as ungrounded — a reply must rest on at least one cited fact.
   */
  emptyLedger: boolean;
  /** forbidden claims present (free meal, full refund, …) + a gesture above the credit limit */
  policyViolations: PolicyViolation[];
  /** required disclosure tags the reply is MISSING for its incident type (policy-driven, not gold) */
  missingDisclosures: string[];
  ticketValid: boolean;
}

/** Map a `RecoveryOutput` ledger ({fact,…}) onto `Claim[]` ({claim,…}) for the mechanical checker. */
export function ledgerToClaims(ledger: RecoveryOutput["ledger"]): Claim[] {
  return ledger.map((l) => ({ claim: l.fact, statedValue: l.statedValue, citedTool: l.citedTool ?? null }));
}

export function isTicketValid(t: RecoveryOutput["ticket"]): boolean {
  return (
    (t.severity === "low" || t.severity === "med" || t.severity === "high") &&
    typeof t.owner === "string" &&
    t.owner.trim().length > 0 &&
    typeof t.action === "string" &&
    t.action.trim().length > 0
  );
}

/**
 * Incident → the policy disclosures a reply for that incident MUST carry. This encodes Le Kyoto's
 * POLICY rules ("an allergen/hygiene report is escalated; a goodwill gesture is framed as a bounded
 * credit, not a refund; a billing complaint references the menu price"), NOT the per-case gold — the
 * agent never sees gold. It mirrors the vocabulary the dataset's gold labels are written in, so when
 * the Verifier blocks a missing disclosure it pushes the team toward exactly what WS-C's `policyOk`
 * (which checks each case's gold `requiredDisclosures`) rewards. It must stay a SUPERSET of the gold
 * per incident; missing one would let the team ship a reply that fails scoring.
 */
const DISCLOSURES_BY_INCIDENT: Partial<Record<IncidentType, string[]>> = {
  delivery_late: ["no_refund_promise"],
  food_quality: ["no_refund_promise"],
  wrong_or_missing_item: ["no_refund_promise"],
  allergen_concern: ["allergen_disclaimer", "food_safety_escalation"],
  hygiene: ["food_safety_escalation"],
  pricing_billing: ["price_reference"],
  // service_staff / praise_no_issue / other → no disclosure required by policy
};

export function requiredDisclosuresFor(incidentType: IncidentType): string[] {
  return DISCLOSURES_BY_INCIDENT[incidentType] ?? [];
}

/** Largest credit PERCENT the reply offers in a gesture context (e.g. "30% off") — null if none. */
function extractCreditPct(reply: string): number | null {
  const text = reply.toLowerCase();
  const GESTURE = "credit|off|discount|avoir|reduction|réduction|rebate|voucher|bon|gift|réduc";
  const found: number[] = [];
  for (const m of text.matchAll(new RegExp(`(\\d{1,3})\\s*%[^.\\n]{0,18}(?:${GESTURE})`, "g"))) found.push(Number(m[1]));
  for (const m of text.matchAll(new RegExp(`(?:${GESTURE})[^.\\n]{0,18}(\\d{1,3})\\s*%`, "g"))) found.push(Number(m[1]));
  const valid = found.filter((n) => Number.isFinite(n) && n >= 0 && n <= 100);
  return valid.length ? Math.max(...valid) : null;
}

export interface PolicyCheck {
  /** forbidden claims present in the reply + a gesture above the credit limit */
  forbidden: PolicyViolation[];
  /** required disclosure tags the reply is MISSING for its incident type */
  missingDisclosures: string[];
}

/**
 * DETERMINISTIC policy check, delegated to `@weavehacks/truth`'s canonical detectors so the Verifier
 * and WS-C's `policyOk` share ONE vocabulary (a divergence would silently break the team's pass rate).
 */
export function checkPolicy(output: RecoveryOutput, policy: RecoveryPolicy = POLICY): PolicyCheck {
  const reply = output.publicReply ?? "";
  const forbidden: PolicyViolation[] = [];
  for (const tag of FORBIDDEN_CLAIM_TAGS) {
    if (replyHasForbiddenClaim(tag, reply)) {
      forbidden.push({ tag, detail: policy.forbiddenClaims[tag] ?? `forbidden claim: ${tag}` });
    }
  }
  const pct = extractCreditPct(reply);
  if (pct !== null && !creditWithinPolicy(pct)) {
    forbidden.push({ tag: "over_promise", detail: `gesture ${pct}% exceeds the ${policy.gesture.maxCreditPct}% credit limit` });
  }
  const missingDisclosures = requiredDisclosuresFor(output.incidentType).filter((tag) => !replyHasDisclosure(tag, reply));
  return { forbidden, missingDisclosures };
}

/** The Verifier's verdict — mechanical grounding + deterministic policy + ticket schema. No LLM judge. */
export function verifyRecovery(
  output: RecoveryOutput,
  toolCalls: ToolCallRecord[],
  policy: RecoveryPolicy = POLICY,
): RecoveryVerdict {
  const grounding = checkGrounding(ledgerToClaims(output.ledger), toolCalls);
  const ungrounded = grounding.checks.filter((c) => !c.grounded);
  const emptyLedger = output.ledger.length === 0 && (output.publicReply ?? "").trim().length > 0;
  const { forbidden, missingDisclosures } = checkPolicy(output, policy);
  const ticketValid = isTicketValid(output.ticket);
  const blocked = ungrounded.length > 0 || emptyLedger || forbidden.length > 0 || missingDisclosures.length > 0 || !ticketValid;
  return { blocked, grounding, ungrounded, emptyLedger, policyViolations: forbidden, missingDisclosures, ticketValid };
}

/** The mechanical Critic feedback that drives the ONE rewrite (mirrors grounding.ts's buildCriticFeedback). */
export function buildRecoveryCritic(verdict: RecoveryVerdict, policy: RecoveryPolicy = POLICY): string {
  const parts: string[] = [];
  if (verdict.ungrounded.length) {
    parts.push(
      "UNSUPPORTED CLAIMS (not backed by any tool result captured this run):\n" +
        verdict.ungrounded
          .map((c) => `  • "${c.claim}" — stated ${JSON.stringify(c.statedValue)} (cited ${c.citedTool ?? "none"}).`)
          .join("\n"),
    );
  }
  if (verdict.emptyLedger) {
    parts.push(
      "EMPTY LEDGER: your reply rests on no cited facts. Restore the atomic facts it relies on (the " +
        "gesture from policy_lookup, the dish from get_menu, any stat from review_stats / demand_baseline) — do NOT leave the ledger empty.",
    );
  }
  if (verdict.policyViolations.length) {
    parts.push("POLICY VIOLATIONS:\n" + verdict.policyViolations.map((v) => `  • ${v.detail} [${v.tag}]`).join("\n"));
  }
  if (verdict.missingDisclosures.length) {
    const lines = verdict.missingDisclosures.map((tag) => {
      const canon = policy.canonicalDisclosureText?.[tag];
      const suggest = canon ? ` Use wording like — EN: "${canon.en}" / FR: "${canon.fr}"` : "";
      return `  • missing required disclosure "${tag}": ${policy.disclosures[tag] ?? ""}${suggest}`;
    });
    parts.push("MISSING DISCLOSURES (add the wording so the reply carries them):\n" + lines.join("\n"));
  }
  if (!verdict.ticketValid) {
    parts.push("TICKET: missing or invalid — needs severity (low|med|high), a non-empty owner, and a non-empty action.");
  }
  return (
    parts.join("\n\n") +
    "\n\nFIX IT — HARD RULES:\n" +
    "• Every ledger fact must appear in (or be directly computable from) a tool result. Call policy_lookup / get_menu / review_stats / demand_baseline for the exact figure and REPLACE any unsupported fact with the real one — keep the ledger non-empty; the reply must rest on at least one cited fact.\n" +
    `• The goodwill gesture is at most a ${policy.gesture.maxCreditPct}% credit on the next order. NEVER a free meal, a full/cash refund, or a delivery-time guarantee — those need a human, not a reply.\n` +
    "• Frame any goodwill as a credit on the customer's NEXT order (not a refund). If this is an allergen issue, include the allergen disclaimer (shared kitchen, cannot guarantee allergen-free, tell staff) and do NOT state any dish is allergen-free.\n" +
    "• Include a valid internal ticket. A shorter, fully-grounded, policy-safe package beats a generous one with unsupported or over-promised claims."
  );
}
