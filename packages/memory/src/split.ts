/**
 * CHRONOLOGICAL EVAL SPLIT + the anti-leakage / honesty guards for Layer 2.
 *
 * The `team+memory` story is only legitimate if memory is built from PAST cases and tested on
 * FUTURE ones. `chronologicalSplit` orders cases by time, WARMs memory on the earliest K and holds
 * out the rest as TEST. The harness writes failure-cards ONLY during the warm phase (and those
 * cards carry failure patterns, never gold labels) — `auditLeakage` proves no test case leaked in,
 * and `assessMemoryLift` reports — without inflation — whether memory actually helped.
 */

export interface ChronoSplit<T> {
  /** earliest cases — used to populate memory (write failure-cards on their failures) */
  warm: T[];
  /** later cases — held out; memory is READ-ONLY here */
  test: T[];
  warmCount: number;
  testCount: number;
  /** how order was derived: a real date field, or input order assumed chronological */
  orderedBy: "date" | "index";
}

export interface SplitOptions<T> {
  /** fraction of cases used to warm memory (default 0.4) — ignored if `warmCount` is set */
  warmFraction?: number;
  /** explicit number of warm cases (overrides `warmFraction`) */
  warmCount?: number;
  /** pull a sortable date/sequence off a case; if omitted or unusable, input order is kept */
  dateOf?: (c: T) => string | number | undefined | null;
}

/**
 * Coerce a date/sequence value to a single comparable NUMBER, or null if it can't be ordered as a
 * date. Returning null (not the raw string) for unparseable values is deliberate: it keeps every
 * usable key numeric, so we never sort number-vs-string (which JS evaluates to NaN comparisons and
 * silently collapses to input order while still claiming `orderedBy:"date"`).
 */
function comparable(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const t = Date.parse(String(v));
  return Number.isNaN(t) ? null : t;
}

/**
 * Split `cases` into a chronological (warm, test) pair. Only when EVERY case exposes a parseable
 * date/sequence do we sort ascending (stable on ties) and report `orderedBy:"date"`; if any key is
 * missing or unparseable we trust the input order and flag `orderedBy:"index"` — never a mislabeled
 * non-chronological order, which would undermine the warm-before-test anti-leakage guarantee.
 */
export function chronologicalSplit<T>(cases: T[], opts: SplitOptions<T> = {}): ChronoSplit<T> {
  const n = cases.length;
  const keyed = cases.map((c, i) => ({ c, i, key: opts.dateOf ? comparable(opts.dateOf(c)) : null }));
  // Every key is now `number | null`; requiring all non-null guarantees a homogeneous numeric sort.
  const everyKeyed = keyed.length > 0 && keyed.every((k) => k.key !== null);

  let ordered: T[];
  let orderedBy: "date" | "index";
  if (everyKeyed) {
    ordered = [...keyed]
      .sort((a, b) => {
        if (a.key! < b.key!) return -1;
        if (a.key! > b.key!) return 1;
        return a.i - b.i; // stable
      })
      .map((k) => k.c);
    orderedBy = "date";
  } else {
    ordered = cases.slice();
    orderedBy = "index";
  }

  let warmCount =
    opts.warmCount ?? Math.round((opts.warmFraction ?? 0.4) * n);
  warmCount = Math.max(0, Math.min(warmCount, n));
  // With >1 case, always hold out at least one test case (otherwise there's nothing to prove).
  if (n > 1 && warmCount >= n) warmCount = n - 1;

  const warm = ordered.slice(0, warmCount);
  const test = ordered.slice(warmCount);
  return { warm, test, warmCount: warm.length, testCount: test.length, orderedBy };
}

/** Non-throwing leakage audit: which card.caseId values fall inside the held-out test set. */
export function auditLeakage(
  cards: { caseId: string }[],
  testCaseIds: Iterable<string>,
): { ok: boolean; leaked: string[] } {
  const test = new Set(testCaseIds);
  const leaked = [...new Set(cards.map((c) => c.caseId).filter((id) => test.has(id)))];
  return { ok: leaked.length === 0, leaked };
}

/** Throwing variant for the harness/tests — fails loudly if any test case seeped into memory. */
export function assertNoLeakage(cards: { caseId: string }[], testCaseIds: Iterable<string>): void {
  const { ok, leaked } = auditLeakage(cards, testCaseIds);
  if (!ok) {
    throw new Error(
      `[memory] LEAKAGE: ${leaked.length} held-out case(s) found in memory: ${leaked.join(", ")}`,
    );
  }
}

export interface MemoryLift {
  teamGrpr: number;
  teamMemoryGrpr: number;
  /** teamMemoryGrpr − teamGrpr (the third-row delta) */
  delta: number;
  /** STRICTLY positive delta beyond `epsilon` — never rounded up */
  helped: boolean;
  recommendation: "report_memory_lift" | "fallback_to_within_session";
  /** honest, human-readable verdict the harness/front-end prints */
  note: string;
}

/**
 * The HONEST guard. Reports whether `team+memory` beat `team` on the held-out split. If it didn't
 * beat it cleanly, recommends falling back to the within-session v1→v2 story instead of inflating
 * the third leaderboard row. `delta` is surfaced raw so WS-C can apply its own bar.
 */
export function assessMemoryLift(args: {
  teamGrpr: number;
  teamMemoryGrpr: number;
  epsilon?: number;
  nTest?: number;
}): MemoryLift {
  const eps = args.epsilon ?? 1e-9;
  const delta = args.teamMemoryGrpr - args.teamGrpr;
  const helped = delta > eps;
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const small = typeof args.nTest === "number" && args.nTest < 10;
  const note = helped
    ? `team+memory ${pct(args.teamMemoryGrpr)} > team ${pct(args.teamGrpr)} (+${pct(delta)} on ${args.nTest ?? "?"} held-out cases)${small ? " — small test set, treat as directional" : ""}.`
    : `team+memory ${pct(args.teamMemoryGrpr)} did NOT beat team ${pct(args.teamGrpr)} (Δ ${(delta * 100).toFixed(1)}pt) — report the within-session v1→v2 beat instead; do not inflate the third row.`;
  return {
    teamGrpr: args.teamGrpr,
    teamMemoryGrpr: args.teamMemoryGrpr,
    delta,
    helped,
    recommendation: helped ? "report_memory_lift" : "fallback_to_within_session",
    note,
  };
}
