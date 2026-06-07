/**
 * Front-end DTO + fetcher for the Grounded Recovery Copilot (WS-E).
 *
 * The web app owns NOTHING in the backend — it MIRRORS the `RecoveryReport` shape that
 * `apps/api` serves at `GET /recovery` (itself re-exported from @weavehacks/agents'
 * `recovery-contract.ts`). We keep our OWN copy of the type here so the front-end never imports
 * a server package; if the API shape drifts, this file is the single place to reconcile.
 *
 * `fetchRecovery()` mirrors the existing `fetchWeek` pattern: try the real endpoint, validate the
 * shape, and fall back to a rich local mock so the whole demo surface is buildable + presentable
 * with the API down. The headline GRPR numbers ALWAYS come from the API when it's up — the mock is
 * a stand-in, clearly flagged (`mocked: true`).
 *
 * NOTE on enrichment: the API's `sampleCase` carries the reply + pass/fail only. The HITL gate and
 * the agent-theater need a ticket, an evidence ledger and a station timeline. Those are FRONT-END
 * demo enrichment (the front keeps its own DTO) — synthesized locally from the case when the API
 * doesn't provide them, never passed off as the judged number.
 */

// ── Mirror of the API contract (@weavehacks/agents RecoveryReport) ─────────────────────────────

/** Triage label — mirrors @weavehacks/seed IncidentType (kept local; no server import). */
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

export type RecoveryVariant = "solo" | "team" | "team+memory";

export interface LeaderboardRow {
  variant: RecoveryVariant;
  /** Grounded Recovery Pass Rate in [0,1] */
  grpr: number;
  budgetTokens: number;
  budgetCalls: number;
}

export interface SampleCaseSolo {
  reply: string;
  pass: boolean;
  /** human-readable reasons the solo draft failed — the front highlights + classifies these */
  failReasons: string[];
}
export interface SampleCaseTeam {
  reply: string;
  pass: boolean;
}

export interface RecoverySampleCase {
  id: string;
  review: string;
  incidentTypeGold: IncidentType;
  solo: SampleCaseSolo;
  team: SampleCaseTeam;
  /** present on the `team+memory` win — a past failure-card the team reused to avoid the same miss */
  memoryReuse?: { failureCardId: string; tag: string };
}

/** The exact shape the API serves at GET /recovery. */
export interface RecoveryReport {
  dataset: { n: number; realCount: number; syntheticCount: number };
  rows: LeaderboardRow[];
  sampleCase: RecoverySampleCase;
  /** true while the API harness is a stub returning placeholder numbers */
  placeholder?: boolean;
}

// ── Front-end-only enrichment (synthesized; not part of the judged number) ─────────────────────

/** The internal action ticket the Writer drafts — gated by HITL alongside the public reply. */
export interface RecoveryTicket {
  severity: "low" | "med" | "high";
  owner: string;
  action: string;
  dueHint?: string;
}

/** One atomic fact the reply rests on + the tool that grounds it (the cited evidence ledger). */
export interface LedgerClaim {
  fact: string;
  statedValue: string;
  citedTool?: string | null;
}

export type FailKind = "triage" | "ungrounded" | "policy" | "over_promise" | "ticket" | "other";

/** The four pipeline stations of the hero loop, in order. */
export const STATIONS = [
  { id: "curator", name: "Evidence Curator", authority: 55, note: "pulls ONLY authorized sources" },
  { id: "analyst", name: "Operational Analyst", authority: 58, note: "infers triage + cites the ledger" },
  { id: "writer", name: "Writer", authority: 30, note: "drafts reply + ticket — wants to ship" },
  { id: "verifier", name: "Adversarial Verifier", authority: 90, note: "blocks until grounded + policy-safe" },
] as const;

export type StationId = (typeof STATIONS)[number]["id"];

// ── Fail-reason classification (drives the highlight chips in the drill-down) ───────────────────

/** Bucket a free-text failReason into a kind, so the UI can colour + icon it consistently. */
export function classifyFailReason(reason: string): FailKind {
  const s = reason.toLowerCase();

  // 1) The real harness appends an authoritative machine tag in brackets, e.g.
  //    "politique : gesture 20% exceeds the 15% credit limit [over_promise]". Trust it first — it's
  //    the reliable signal and survives the FR/EN wording mix (the headline over-promise lives here).
  const tag = s.match(/\[([a-z_]+)\]\s*$/)?.[1];
  if (tag) {
    if (tag.includes("over_promise") || tag.includes("free") || tag.includes("refund") || tag.includes("meal"))
      return "over_promise";
    if (tag.includes("triage")) return "triage";
    if (tag.includes("ticket")) return "ticket";
    if (tag.includes("allergen") || tag.includes("disclos") || tag.includes("disclaimer")) return "policy";
    if (tag.includes("ungrounded") || tag.includes("unsupported") || tag.includes("claim")) return "ungrounded";
  }

  // 2) Fall back to wording — over-promise BEFORE policy so "gesture … exceeds the … credit limit"
  //    (the canonical over-promise message) is classified as the money risk, not a generic policy note.
  if (
    s.includes("sur-promesse") ||
    s.includes("over-promise") ||
    s.includes("over_promise") ||
    s.includes("over promise") ||
    s.includes("overpromise") ||
    s.includes("promesse") ||
    s.includes("exceeds") ||
    s.includes("credit limit")
  )
    return "over_promise";
  if (s.includes("triage")) return "triage";
  if (s.includes("ticket")) return "ticket";
  if (s.includes("politique") || s.includes("policy") || s.includes("disclos") || s.includes("divulgation"))
    return "policy";
  if (
    s.includes("non soutenue") ||
    s.includes("non sourcée") ||
    s.includes("unsupported") ||
    s.includes("ungrounded") ||
    s.includes("not grounded") ||
    s.includes("claim") ||
    s.includes("grounding") ||
    s.includes("invérifiable")
  )
    return "ungrounded";
  return "other";
}

// ── Incident labels + gesture parsing (shared by the drill-down and the agent theater) ──────────

/** Human label for a triage incident type. */
export const INCIDENT_LABEL: Record<IncidentType, string> = {
  food_quality: "Food quality",
  delivery_late: "Late delivery",
  wrong_or_missing_item: "Wrong / missing item",
  allergen_concern: "Allergen concern",
  hygiene: "Hygiene",
  service_staff: "Service / staff",
  pricing_billing: "Pricing / billing",
  praise_no_issue: "Praise",
  other: "Other",
};

/** A case id like `rc-real-025` is a real Google review; `rc-syn-*` is a synthetic variant. */
export function caseSource(id: string): "real" | "synthetic" {
  return /syn/i.test(id) ? "synthetic" : "real";
}

/**
 * Pull the goodwill gesture out of a reply — e.g. "20% discount", "15% credit" — so the theater +
 * ledger describe the ACTUAL offer rather than a hardcoded one. Returns null if no `NN%` is found.
 */
export function extractGesture(text: string): string | null {
  const m = text.match(/(\d{1,3})\s*%\s*(credit|discount|off|avoir|cr[ée]dit|r[ée]duction|remise)?/i);
  if (!m) return null;
  const k = (m[2] ?? "").toLowerCase();
  const kind = /credit|cr[ée]dit|avoir/.test(k)
    ? "credit"
    : /discount|off|r[ée]duction|remise/.test(k)
      ? "discount"
      : "gesture";
  return `${m[1]}% ${kind}`;
}

/** Honest leaderboard deltas — used so the hero/leaderboard copy never overclaims the memory row. */
export interface MemorySummary {
  soloToTeam: number | null;
  teamToMemory: number | null;
  memoryHelps: "up" | "flat" | "down" | "n/a";
}
export function memorySummary(rows: LeaderboardRow[]): MemorySummary {
  const g = (v: RecoveryVariant) => rows.find((r) => r.variant === v)?.grpr;
  const s = g("solo"),
    t = g("team"),
    m = g("team+memory");
  const soloToTeam = s != null && t != null ? Math.round((t - s) * 100) : null;
  const teamToMemory = t != null && m != null ? Math.round((m - t) * 100) : null;
  const memoryHelps =
    teamToMemory == null ? "n/a" : teamToMemory > 0 ? "up" : teamToMemory < 0 ? "down" : "flat";
  return { soloToTeam, teamToMemory, memoryHelps };
}

export const FAIL_META: Record<FailKind, { label: string; glyph: string; color: string }> = {
  triage: { label: "Triage", glyph: "🏷", color: "var(--warn)" },
  ungrounded: { label: "Ungrounded claim", glyph: "🔌", color: "var(--danger)" },
  policy: { label: "Policy / disclosure", glyph: "📋", color: "var(--warn)" },
  over_promise: { label: "Over-promise", glyph: "💸", color: "var(--danger)" },
  ticket: { label: "Ticket", glyph: "🎫", color: "var(--muted)" },
  other: { label: "Issue", glyph: "•", color: "var(--muted)" },
};

// ── Ticket + ledger synthesis (when the API omits them) ────────────────────────────────────────

const TICKET_BY_INCIDENT: Partial<Record<IncidentType, RecoveryTicket>> = {
  delivery_late: { severity: "med", owner: "ops-delivery", action: "Apply 15% credit · audit the courier window for this slot", dueHint: "today" },
  food_quality: { severity: "med", owner: "kitchen", action: "Log the dish complaint · check the broth-hold time at peak", dueHint: "next service" },
  wrong_or_missing_item: { severity: "high", owner: "ops-packing", action: "Re-send the missing item · review the pack checklist", dueHint: "now" },
  allergen_concern: { severity: "high", owner: "head-chef", action: "Escalate allergen handling · re-confirm menu disclaimers", dueHint: "now" },
  hygiene: { severity: "high", owner: "head-chef", action: "Open a hygiene incident · inspect the flagged station", dueHint: "now" },
  service_staff: { severity: "low", owner: "floor-lead", action: "Note the service feedback · brief the team at line-up", dueHint: "next shift" },
  pricing_billing: { severity: "low", owner: "ops", action: "Reconcile the order total · refund any overcharge", dueHint: "today" },
};

/** A sensible internal ticket for a case — used by the HITL gate when the API doesn't carry one. */
export function ticketFor(incident: IncidentType): RecoveryTicket {
  return (
    TICKET_BY_INCIDENT[incident] ?? {
      severity: "low",
      owner: "ops",
      action: "Review the case and follow up with the customer",
      dueHint: "today",
    }
  );
}

/** A short evidence ledger for the drill-down — the team's grounded claims, cited to a tool. */
export function ledgerFor(c: RecoverySampleCase): LedgerClaim[] {
  // Describe the gesture the team ACTUALLY made (e.g. "15% credit"), not a hardcoded one.
  const gesture = extractGesture(c.team.reply) ?? "within the policy ceiling";
  if (c.incidentTypeGold === "delivery_late") {
    return [
      { fact: "Order was delivered late", statedValue: "≈ 50 min vs 30 min target", citedTool: "get_reviews" },
      { fact: "Goodwill gesture allowed by policy", statedValue: `${gesture}, next order`, citedTool: "policy_lookup" },
      { fact: "No full refund / free meal promised", statedValue: "within policy ceiling", citedTool: "policy_lookup" },
    ];
  }
  if (c.incidentTypeGold === "food_quality") {
    return [
      { fact: "Dissatisfaction acknowledged from the review", statedValue: "taste / quality", citedTool: "get_reviews" },
      { fact: "Goodwill gesture allowed by policy", statedValue: `${gesture}, next order`, citedTool: "policy_lookup" },
      { fact: "No over-generous claim (free meal / full refund)", statedValue: "within policy ceiling", citedTool: "policy_lookup" },
    ];
  }
  return [
    { fact: "Issue acknowledged from the review", statedValue: c.review.slice(0, 40) + "…", citedTool: "get_reviews" },
    { fact: "Gesture bounded by policy", statedValue: gesture, citedTool: "policy_lookup" },
  ];
}

// ── Fetch ──────────────────────────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface RecoveryFetch {
  report: RecoveryReport;
  /** true when served from the local mock (API down / unstructured) */
  mocked: boolean;
}

/**
 * Structural guard — validates not just the top-level keys but the NESTED fields the UI actually
 * dereferences (rows[*].grpr/budget*, sampleCase.solo.reply/failReasons, team.reply, …). This is
 * the front's only safety net against API drift: a partial-but-200 response must route to
 * MOCK_RECOVERY via fetchRecovery's catch rather than crash the demo page at render.
 */
function isReport(d: unknown): d is RecoveryReport {
  const r = d as { rows?: unknown; dataset?: unknown; sampleCase?: unknown };
  if (!r || !Array.isArray(r.rows) || r.rows.length === 0 || !r.dataset || !r.sampleCase) return false;
  const rowsOk = (r.rows as unknown[]).every((x) => {
    const row = x as Record<string, unknown>;
    return (
      typeof row?.variant === "string" &&
      typeof row?.grpr === "number" &&
      typeof row?.budgetTokens === "number" &&
      typeof row?.budgetCalls === "number"
    );
  });
  const sc = r.sampleCase as {
    review?: unknown;
    incidentTypeGold?: unknown;
    solo?: { reply?: unknown; failReasons?: unknown };
    team?: { reply?: unknown };
  };
  const scOk =
    typeof sc.review === "string" &&
    typeof sc.incidentTypeGold === "string" &&
    !!sc.solo &&
    typeof sc.solo.reply === "string" &&
    Array.isArray(sc.solo.failReasons) &&
    !!sc.team &&
    typeof sc.team.reply === "string";
  return rowsOk && scOk;
}

/**
 * Try the real `GET /recovery`; fall back to MOCK_RECOVERY so the UI works standalone.
 *
 * The live endpoint now runs the real harness (real inference), so it can be slow — we bound it
 * with an AbortController timeout and degrade to the mock rather than spinning forever. Pre-warm it
 * (`pnpm recovery` / one GET before the demo) and the live numbers render; otherwise the staged
 * sample shows with a "mock" badge. Either way the page never hangs.
 */
export async function fetchRecovery(timeoutMs = 20000): Promise<RecoveryFetch> {
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  try {
    const res = await fetch(`${API}/recovery`, { cache: "no-store", signal: ctrl?.signal });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = (await res.json()) as unknown;
    // Structurally valid AND a real run — the API serves a `placeholder:true` all-zero stub until
    // `pnpm recovery` warms its cache; rendering 0%/0%/0% would be worse than the staged real run.
    if (isReport(data) && isLiveReport(data)) return { report: data, mocked: false };
    throw new Error("placeholder or unstructured");
  } catch {
    return { report: STAGED_RECOVERY, mocked: true };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** A report counts as "live" only if it isn't the placeholder stub and carries real (non-zero) budgets. */
function isLiveReport(d: RecoveryReport): boolean {
  if (d.placeholder) return false;
  return !d.rows.every((r) => r.budgetTokens === 0 && r.budgetCalls === 0);
}

export const pct = (n: number) => `${Math.round(n * 100)}%`;

// ── Staged fallback — the LAST RECORDED real run, shaped exactly like the API ────────────────────
//
// NOT fictional: these are the true numbers from the canonical held-out `pnpm recovery` run
// (the 16-case demo slice, mirrored verbatim from recovery-report.json at the repo root), staged
// here so the page renders the real leaderboard + the rc-real-025 contrast even when GET /recovery
// is offline or un-warmed (it returns a placeholder:true stub until the cache is populated). When
// the cache is warm the page shows the SAME numbers live (mocked:false). Refresh this block to
// match recovery-report.json after a new run.

export const STAGED_RECOVERY: RecoveryReport = {
  dataset: { n: 16, realCount: 9, syntheticCount: 7 },
  rows: [
    { variant: "solo", grpr: 0.6, budgetTokens: 224794, budgetCalls: 129 },
    { variant: "team", grpr: 0.9, budgetTokens: 150975, budgetCalls: 100 },
    { variant: "team+memory", grpr: 1.0, budgetTokens: 90804, budgetCalls: 61 },
  ],
  sampleCase: {
    id: "rc-real-025",
    review:
      "Inadmissible, nous venons de commander et il manque la moitié de la commandeCe n’est pas normal",
    incidentTypeGold: "wrong_or_missing_item",
    solo: {
      reply:
        "Bonjour, je suis vraiment désolé d'apprendre que votre commande était incomplète. C'est inacceptable et je comprends parfaitement votre frustration. Nous nous efforçons de fournir un service de qualité, et il est clair que nous avons échoué cette fois-ci. Pour rectifier cela, je vous propose un crédit de 15% sur votre prochaine commande, jusqu'à un maximum de 10 euros, afin de vous donner une chance de mieux nous connaître. Votre satisfaction est très importante pour nous, et nous espérons que vous nous donnerez une autre occasion de vous impressionner. Si vous avez d'autres préoccupations ou si vous souhaitez discuter de votre expérience, n'hésitez pas à nous contacter directement. Merci de votre compréhension et de votre patience !",
      pass: false,
      failReasons: ["claim non sourcée : « missing items in the order » (1)"],
    },
    team: {
      reply:
        "Bonjour, \n\nNous sommes vraiment désolés d'apprendre que votre commande était incomplète. Ce n'est pas l'expérience que nous souhaitons offrir à nos clients. Nous comprenons à quel point cela peut être frustrant et nous vous remercions de nous en avoir informés.\n\nPour compenser cette situation, nous aimerions vous offrir un crédit de 10€ sur votre prochaine commande. Nous espérons que cela vous encouragera à nous donner une autre chance de vous servir comme il se doit.\n\nMerci encore pour votre compréhension, et nous espérons vous revoir bientôt !\n\nCordialement, \nL'équipe de Le Kyoto",
      pass: true,
    },
  },
};

/** @deprecated kept as an alias — the fallback is the real recorded run, not a fiction. */
export const MOCK_RECOVERY = STAGED_RECOVERY;
