/**
 * RECOVERY CASES — the GRPR evaluation dataset, loaded from `data/recovery-cases.json`.
 *
 * `source:"real"` = derived from a real public Google review of Le Kyoto; `source:"synthetic"` = a
 * clearly-marked generated variant to widen coverage. The proof needs a MAJORITY of `real`; the
 * synthetic seeds let the harness + front-end run end-to-end before the operator's real reviews are
 * loaded. ⚠️ Never pass a fabricated review off as `real`.
 *
 * Loading mirrors `pos.ts`: read ONE local JSON file at runtime (no fetcher, no scraper). Point it
 * elsewhere with `RECOVERY_CASES_PATH`. The file may be a bare array or a `{ "cases": [...] }`
 * envelope (extra keys like `_README` are ignored). Per-case structural errors are DROPPED with a
 * warning so a single bad row can't take down the demo; `pnpm --filter @weavehacks/seed
 * validate-cases` is the strict gate (it reports every problem and the gold-label vocabulary).
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { IncidentType, RecoveryCase } from "./recovery-types";

/** Override with RECOVERY_CASES_PATH to stage a different dataset file. */
export const RECOVERY_CASES_PATH =
  process.env.RECOVERY_CASES_PATH ?? fileURLToPath(new URL("../data/recovery-cases.json", import.meta.url));

/** Runtime table of the IncidentType union (the Record type forces it to stay exhaustive). */
const INCIDENT_TYPE_TABLE: Record<IncidentType, true> = {
  food_quality: true,
  delivery_late: true,
  wrong_or_missing_item: true,
  allergen_concern: true,
  hygiene: true,
  service_staff: true,
  pricing_billing: true,
  praise_no_issue: true,
  other: true,
};
/** All valid incident types, as a runtime array (for validation + distribution reports). */
export const INCIDENT_TYPES = Object.keys(INCIDENT_TYPE_TABLE) as IncidentType[];

const isStr = (x: unknown): x is string => typeof x === "string";
const isStrArr = (x: unknown): x is string[] => Array.isArray(x) && x.every(isStr);

/** Pull the cases array out of the file JSON — a bare array or a `{ cases: [...] }` envelope. */
export function extractRawCases(json: unknown): unknown[] {
  if (Array.isArray(json)) return json;
  if (json && typeof json === "object" && Array.isArray((json as { cases?: unknown }).cases)) {
    return (json as { cases: unknown[] }).cases;
  }
  throw new Error(`[seed/recovery-cases] expected a JSON array or { "cases": [...] } in ${RECOVERY_CASES_PATH}`);
}

/**
 * Structurally validate ONE raw entry into a RecoveryCase. Returns the typed case (when valid) and a
 * list of human-readable errors. Does NOT check the gold-label VOCABULARY (that's `validate-cases`,
 * which resolves every tag against @weavehacks/truth POLICY) — this is shape-only, shared by both.
 */
export function checkCaseShape(raw: unknown, where: string): { value?: RecoveryCase; errors: string[] } {
  const errors: string[] = [];
  const push = (m: string) => errors.push(`${where}: ${m}`);
  if (!raw || typeof raw !== "object") {
    push("not an object");
    return { errors };
  }
  const o = raw as Record<string, unknown>;
  if (!isStr(o.id) || !o.id.trim()) push("missing/empty 'id'");
  if (o.source !== "real" && o.source !== "synthetic") {
    push(`'source' must be "real" | "synthetic" (got ${JSON.stringify(o.source)})`);
  }

  const r = o.review as Record<string, unknown> | undefined;
  if (!r || typeof r !== "object") {
    push("missing 'review'");
  } else {
    if (typeof r.stars !== "number" || !Number.isInteger(r.stars) || r.stars < 1 || r.stars > 5) {
      push(`review.stars must be an integer 1..5 (got ${JSON.stringify(r.stars)})`);
    }
    if (!isStr(r.text) || !r.text.trim()) push("review.text missing/empty");
    if (r.lang !== undefined && !isStr(r.lang)) push("review.lang must be a string");
    if (r.date !== undefined && !isStr(r.date)) push("review.date must be a string");
    if (r.mentions !== undefined && !isStrArr(r.mentions)) push("review.mentions must be string[]");
  }

  const g = o.gold as Record<string, unknown> | undefined;
  if (!g || typeof g !== "object") {
    push("missing 'gold'");
  } else {
    if (!isStr(g.incidentType) || !(g.incidentType in INCIDENT_TYPE_TABLE)) {
      push(`gold.incidentType invalid (got ${JSON.stringify(g.incidentType)})`);
    }
    if (!isStrArr(g.requiredEvidenceTags)) push("gold.requiredEvidenceTags must be string[]");
    if (!isStrArr(g.requiredDisclosures)) push("gold.requiredDisclosures must be string[]");
    if (g.forbiddenClaims !== undefined && !isStrArr(g.forbiddenClaims)) push("gold.forbiddenClaims must be string[]");
  }

  return errors.length ? { errors } : { value: raw as RecoveryCase, errors };
}

function load(): RecoveryCase[] {
  if (!existsSync(RECOVERY_CASES_PATH)) {
    throw new Error(
      `[seed/recovery-cases] dataset not found at ${RECOVERY_CASES_PATH} — add data/recovery-cases.json or set RECOVERY_CASES_PATH`,
    );
  }
  const entries = extractRawCases(JSON.parse(readFileSync(RECOVERY_CASES_PATH, "utf8")));
  const out: RecoveryCase[] = [];
  const errors: string[] = [];
  entries.forEach((e, i) => {
    const id = e && typeof e === "object" && isStr((e as { id?: unknown }).id) ? (e as { id: string }).id : `#${i}`;
    const { value, errors: errs } = checkCaseShape(e, `case ${id}`);
    if (value) out.push(value);
    else errors.push(...errs);
  });
  if (errors.length) {
    // Tolerate (drop) malformed cases so the harness/demo stays up; validate-cases is the strict gate.
    console.warn(
      `[seed/recovery-cases] dropped ${entries.length - out.length} malformed case(s):\n  ${errors.join("\n  ")}\n` +
        `  → run \`pnpm --filter @weavehacks/seed validate-cases\` for the full report.`,
    );
  }
  return out;
}

export const RECOVERY_CASES: RecoveryCase[] = load();
