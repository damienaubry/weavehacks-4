/**
 * validate-cases — the strict gate + operator-review report for the recovery dataset.
 *
 * Reads `data/recovery-cases.json` DIRECTLY (so a malformed row can't crash the report), then checks:
 *   1. STRUCTURE  — every entry matches `RecoveryCase` (shared `checkCaseShape`).
 *   2. VOCABULARY — every gold `requiredDisclosures` / `forbiddenClaims` / `requiredEvidenceTags` tag
 *      resolves to a rule/tag in @weavehacks/truth POLICY (one shared vocabulary across all workstreams).
 *   3. UNIQUENESS — case ids are unique.
 * Prints the real/synthetic split (+ the majority-real milestone), the per-incidentType distribution,
 * tag usage, and a compact per-case table Damien can scan to approve the gold labels.
 *
 * Exit code: non-zero on any INTEGRITY error (structure / vocab / duplicate id). Milestones that are
 * "not yet done" but not corruption (majority-real, full incident-type coverage, mentions not yet in
 * the canon menu) are reported as WARNINGS and do NOT fail — so the gate is usable throughout the build.
 *
 * No LLM, no credits — deterministic. Run: `pnpm --filter @weavehacks/seed validate-cases`.
 */
import { readFileSync } from "node:fs";
import { DISCLOSURE_TAGS, EVIDENCE_TAGS, FORBIDDEN_CLAIM_TAGS, TRUTH } from "@weavehacks/truth";
import type { IncidentType, RecoveryCase } from "./recovery-types";
import { checkCaseShape, extractRawCases, INCIDENT_TYPES, RECOVERY_CASES_PATH } from "./recovery-cases";

const errors: string[] = [];
const warnings: string[] = [];

// ── read raw, structurally validate ──────────────────────────────────────────────────────────
const entries = extractRawCases(JSON.parse(readFileSync(RECOVERY_CASES_PATH, "utf8")));
const valid: RecoveryCase[] = [];
entries.forEach((e, i) => {
  const id = e && typeof e === "object" && typeof (e as { id?: unknown }).id === "string" ? (e as { id: string }).id : `#${i}`;
  const { value, errors: errs } = checkCaseShape(e, `case ${id}`);
  if (value) valid.push(value);
  else errors.push(...errs);
});

// ── uniqueness ──────────────────────────────────────────────────────────────────────────────
const seen = new Map<string, number>();
for (const c of valid) seen.set(c.id, (seen.get(c.id) ?? 0) + 1);
for (const [id, n] of seen) if (n > 1) errors.push(`duplicate id "${id}" appears ${n} times`);

// ── vocabulary (resolves every tag against POLICY) ────────────────────────────────────────────
const DISCLOSURE = new Set(DISCLOSURE_TAGS);
const FORBIDDEN = new Set(FORBIDDEN_CLAIM_TAGS);
const EVIDENCE = new Set(EVIDENCE_TAGS);
for (const c of valid) {
  for (const t of c.gold.requiredDisclosures) {
    if (!DISCLOSURE.has(t)) errors.push(`case ${c.id}: unknown requiredDisclosure "${t}" (not in POLICY.disclosures: ${DISCLOSURE_TAGS.join(", ")})`);
  }
  for (const t of c.gold.forbiddenClaims ?? []) {
    if (!FORBIDDEN.has(t)) errors.push(`case ${c.id}: unknown forbiddenClaim "${t}" (not in POLICY.forbiddenClaims: ${FORBIDDEN_CLAIM_TAGS.join(", ")})`);
  }
  for (const t of c.gold.requiredEvidenceTags) {
    if (!EVIDENCE.has(t)) errors.push(`case ${c.id}: unknown requiredEvidenceTag "${t}" (not in POLICY.evidenceTags)`);
  }
}

// ── distributions ─────────────────────────────────────────────────────────────────────────────
const realCount = valid.filter((c) => c.source === "real").length;
const synthCount = valid.length - realCount;
const byIncident = new Map<IncidentType, number>(INCIDENT_TYPES.map((t) => [t, 0]));
for (const c of valid) byIncident.set(c.gold.incidentType, (byIncident.get(c.gold.incidentType) ?? 0) + 1);

const tagHist = (pick: (c: RecoveryCase) => string[]): Map<string, number> => {
  const m = new Map<string, number>();
  for (const c of valid) for (const t of pick(c)) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
};
const discHist = tagHist((c) => c.gold.requiredDisclosures);
const forbHist = tagHist((c) => c.gold.forbiddenClaims ?? []);
const evidHist = tagHist((c) => c.gold.requiredEvidenceTags);

// mentions not in the canon menu (surfaces the real-menu-canon gap — a warning, not an error)
const menuIds = new Set(TRUTH.menu.map((m) => m.id));
const unknownMentions = new Set<string>();
for (const c of valid) for (const m of c.review.mentions ?? []) if (!menuIds.has(m)) unknownMentions.add(m);

// milestones (warnings)
const majorityReal = valid.length > 0 && realCount > valid.length / 2;
if (!majorityReal) warnings.push(`NOT YET MAJORITY-REAL: ${realCount}/${valid.length} real — the GRPR proof needs a real-review majority. Add rc-real-NNN cases.`);
const missingTypes = INCIDENT_TYPES.filter((t) => (byIncident.get(t) ?? 0) === 0);
if (missingTypes.length) warnings.push(`incident types with 0 cases: ${missingTypes.join(", ")}`);
if (valid.length < 40) warnings.push(`only ${valid.length} cases — target is ~50 for a statistically legible GRPR.`);
if (unknownMentions.size) {
  warnings.push(
    `${unknownMentions.size} review.mentions reference dishes not in TRUTH.menu (canon menu is still the placeholder ramen set): ${[...unknownMentions].join(", ")}`,
  );
}

// ── report ────────────────────────────────────────────────────────────────────────────────────
const pad = (s: string | number, n: number) => String(s).padEnd(n);
const padL = (s: string | number, n: number) => String(s).padStart(n);
const bar = (n: number, max: number, width = 24) => "█".repeat(max ? Math.round((n / max) * width) : 0);

console.log(`\n━━━ Le Kyoto recovery dataset — validation ━━━`);
console.log(`file: ${RECOVERY_CASES_PATH}`);
console.log(`raw entries: ${entries.length}  ·  structurally valid: ${valid.length}\n`);

console.log(`SOURCE SPLIT   real ${realCount}  ·  synthetic ${synthCount}  ·  majority-real ${majorityReal ? "✓" : "✗"}`);

console.log(`\nINCIDENT TYPE DISTRIBUTION`);
const maxInc = Math.max(1, ...[...byIncident.values()]);
for (const t of INCIDENT_TYPES) {
  const n = byIncident.get(t) ?? 0;
  console.log(`  ${pad(t, 22)} ${padL(n, 3)}  ${bar(n, maxInc)}`);
}

const printHist = (title: string, hist: Map<string, number>, known: string[]) => {
  console.log(`\n${title}`);
  const keys = [...new Set([...known, ...hist.keys()])];
  for (const k of keys) {
    const n = hist.get(k) ?? 0;
    const unknown = !known.includes(k) ? "  ⟵ UNKNOWN TAG" : "";
    console.log(`  ${pad(k, 26)} ${padL(n, 3)}${unknown}`);
  }
};
printHist("requiredDisclosures usage", discHist, DISCLOSURE_TAGS);
printHist("forbiddenClaims usage", forbHist, FORBIDDEN_CLAIM_TAGS);
printHist("requiredEvidenceTags usage", evidHist, EVIDENCE_TAGS);

console.log(`\nPER-CASE (operator review)`);
console.log(`  ${pad("id", 12)} ${pad("src", 4)} ${pad("★", 2)} ${pad("incidentType", 22)} ${pad("disclosures", 28)} forbidden`);
for (const c of valid) {
  console.log(
    `  ${pad(c.id, 12)} ${pad(c.source === "real" ? "real" : "syn", 4)} ${pad(c.review.stars, 2)} ` +
      `${pad(c.gold.incidentType, 22)} ${pad(c.gold.requiredDisclosures.join(",") || "—", 28)} ${(c.gold.forbiddenClaims ?? []).join(",") || "—"}`,
  );
}

if (warnings.length) {
  console.log(`\n⚠️  WARNINGS (${warnings.length}) — milestones / non-blocking`);
  for (const w of warnings) console.log(`  • ${w}`);
}
if (errors.length) {
  console.log(`\n❌ ERRORS (${errors.length}) — integrity, MUST fix`);
  for (const e of errors) console.log(`  • ${e}`);
}

console.log(
  `\n${errors.length ? "❌ FAIL" : "✅ PASS"} — ${valid.length} valid case(s), ${errors.length} error(s), ${warnings.length} warning(s).` +
    `${errors.length ? "" : majorityReal ? "" : "  (passes integrity; not yet demo-ready until majority-real.)"}\n`,
);

process.exit(errors.length ? 1 : 0);
