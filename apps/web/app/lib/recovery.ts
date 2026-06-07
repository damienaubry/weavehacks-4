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
  if (s.includes("sur-promesse") || s.includes("over-promise") || s.includes("overpromise") || s.includes("promesse"))
    return "over_promise";
  if (s.includes("triage")) return "triage";
  if (s.includes("ticket")) return "ticket";
  if (s.includes("politique") || s.includes("policy") || s.includes("disclos") || s.includes("divulgation"))
    return "policy";
  if (
    s.includes("non soutenue") ||
    s.includes("unsupported") ||
    s.includes("ungrounded") ||
    s.includes("not grounded") ||
    s.includes("claim") ||
    s.includes("invérifiable")
  )
    return "ungrounded";
  return "other";
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
  if (c.incidentTypeGold === "delivery_late") {
    return [
      { fact: "Order was delivered late", statedValue: "≈ 50 min vs 30 min target", citedTool: "get_reviews" },
      { fact: "Goodwill gesture allowed by policy", statedValue: "15% credit, next order", citedTool: "policy_lookup" },
      { fact: "No full refund / free meal promised", statedValue: "within policy ceiling", citedTool: "policy_lookup" },
    ];
  }
  return [
    { fact: "Issue acknowledged from the review", statedValue: c.review.slice(0, 40) + "…", citedTool: "get_reviews" },
    { fact: "Gesture bounded by policy", statedValue: "per refund/gesture rules", citedTool: "policy_lookup" },
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
    if (isReport(data)) return { report: data, mocked: false };
    throw new Error("unstructured");
  } catch {
    return { report: MOCK_RECOVERY, mocked: true };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const pct = (n: number) => `${Math.round(n * 100)}%`;

// ── Mock fallback — shaped exactly like the API, staged for the demo ────────────────────────────

export const MOCK_RECOVERY: RecoveryReport = {
  placeholder: true,
  dataset: { n: 52, realCount: 41, syntheticCount: 11 },
  rows: [
    { variant: "solo", grpr: 0.38, budgetTokens: 18400, budgetCalls: 11 },
    { variant: "team", grpr: 0.71, budgetTokens: 17900, budgetCalls: 10 },
    { variant: "team+memory", grpr: 0.83, budgetTokens: 18050, budgetCalls: 10 },
  ],
  sampleCase: {
    id: "rc-demo-1",
    review:
      "Commande livrée 50 min en retard et le ramen tonkotsu était froid à l'arrivée. Dommage, d'habitude c'est très bon.",
    incidentTypeGold: "delivery_late",
    solo: {
      reply:
        "Navrés ! Nos livreurs sont chez vous en moins de 20 min en moyenne. Pour nous faire pardonner : remboursement intégral + un repas offert.",
      pass: false,
      failReasons: [
        "triage : 'other' (≠ delivery_late)",
        "claim non soutenue : « livraison < 20 min en moyenne »",
        "politique : sur-promesse 'repas offert'",
        "ticket interne : absent",
      ],
    },
    team: {
      reply:
        "Désolés pour ce retard de livraison et le ramen tiède — ce n'est pas notre standard. On vous applique un avoir de 15% sur votre prochaine commande, conforme à notre politique. Merci pour votre fidélité.",
      pass: true,
    },
    memoryReuse: { failureCardId: "FC-07", tag: "over_promise_refund" },
  },
};
