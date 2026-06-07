/**
 * sim-recovery.mjs — DETERMINISTIC simulation of the GRPR dynamic over Le Kyoto's REAL reviews.
 *
 *   node scripts/sim-recovery.mjs [path-to-reviews.json] [epochs]
 *
 * ⚠️ THIS IS NOT THE REAL EVAL. No LLM, no credits, no Weave. It triages the real reviews with
 * keyword rules and applies an EXPLICIT, transparent failure model (printed below) to illustrate the
 * shape `pnpm recovery` will produce with real agents: solo < team < team+memory, rising across runs.
 * The numbers are MODELLED, not measured. Use it to preview the dynamic and to seed WS-A's dataset.
 *
 * The model (stated so it's honest, not a black box):
 *   Each real review is triaged + tagged with hazards a grounded reply must survive:
 *     overPromise  — a refund/missing/price/delivery complaint tempts a free-meal/full-refund offer
 *     disclosure   — an allergen mention needs the allergen disclaimer
 *     ticket        — an operational complaint needs an internal action ticket
 *     ungrounded    — the text has a number/quantity the writer may echo as an unbacked stat
 *   A case is "hard" if it carries >=2 hazards or triages to "other" (ambiguous).
 *   SOLO        passes a case iff it carries NO hazard (praise / trivial). No independent check ⇒ it
 *               ships the over-promise / invents the stat / forgets the ticket on every hazardous case.
 *   TEAM        passes every single-hazard case (the Verifier mechanically catches one issue in one
 *               rewrite) but FAILS a "hard" case the FIRST time it sees that hazard pattern.
 *   TEAM+MEMORY = TEAM, plus: once a hazard pattern has failed once, a failure-card exists, so the
 *               NEXT case with that pattern passes. Memory persists across runs (epochs) ⇒ GRPR rises
 *               over time toward the ceiling. (Chronological: a card is only written from a past case.)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const REVIEWS_PATH = process.argv[2] ?? join(__dir, "../packages/seed/data/le-kyoto-google-reviews.json");
const EPOCHS = Number(process.argv[3] ?? 5);

const raw = JSON.parse(readFileSync(REVIEWS_PATH, "utf8"));
const reviews = raw.reviews ?? raw;

// ─── deterministic triage + hazard tagging (FR + EN keywords) ────────────────────────────────────
const has = (t, ...ks) => ks.some((k) => t.includes(k));

function classify(review) {
  const t = (review.text || "").toLowerCase();
  const stars = review.rating;
  const empty = t.trim().length < 8;

  const missing = has(t, "manque", "manquant", "oubli", "missing", "forgot", "il manque");
  const allergen = has(t, "allergi", "allergy", "gluten", "arachide", "noix", "nut", "intoléran");
  const hygiene = has(t, "sale", "hygiène", "hygiene", "dirty", "cheveu", "malade", "sick", "intox");
  const price = has(t, "prix", "cher", "qualité/prix", "qualité prix", "price", "expensive", "quantité", "rapport");
  const late = has(t, "retard", "late", "attente", "long", "lent", "delivery", "livraison", "trop long");
  const quality = has(t, "froid", "cold", "tasteless", "sans goût", "sans gout", "acidul", "fade", "trop", "pas bon", "average", "moyen", "déçu", "decu", "salé", "sale ", "immangeable");
  const staff = has(t, "accueil", "personnel", "service", "staff", "rude", "impoli", "désagréable");

  // A >=4★ review is praise (the topic may still carry an allergen disclosure hazard, tagged below);
  // complaint incident types are reserved for the actionable (<=3★) reviews.
  let incidentType;
  if (stars >= 4) incidentType = "praise_no_issue";
  else if (missing) incidentType = "wrong_or_missing_item";
  else if (allergen) incidentType = "allergen_concern";
  else if (hygiene) incidentType = "hygiene";
  else if (late) incidentType = "delivery_late";
  else if (quality) incidentType = "food_quality";
  else if (price) incidentType = "pricing_billing";
  else if (staff) incidentType = "service_staff";
  else incidentType = "other";

  // hazards (only meaningful when there is something to recover from)
  const actionable = stars <= 3;
  const hazards = [];
  if (actionable && (missing || price || late || incidentType === "pricing_billing")) hazards.push("overPromise");
  if (allergen) hazards.push("disclosure");
  if (actionable && (missing || late || hygiene || incidentType === "wrong_or_missing_item")) hazards.push("ticket");
  if (actionable && /\d/.test(t)) hazards.push("ungrounded");

  const patternKey = hazards.length ? hazards.slice().sort().join("+") : "none";
  const hard = hazards.length >= 2 || (actionable && incidentType === "other");

  return {
    id: `rc-real-${review.index ?? review.originalIndex}`,
    stars,
    incidentType: empty && stars >= 4 ? "praise_no_issue" : incidentType,
    text: (review.text || "").replace(/\s+/g, " ").trim(),
    actionable,
    hazards,
    patternKey,
    hard,
  };
}

const cases = reviews.map(classify);
const complaints = cases.filter((c) => c.actionable);

// ─── the deterministic scoring model ─────────────────────────────────────────────────────────────
function scoreSolo(c) {
  return c.hazards.length === 0; // ships ungrounded/over-promising on anything hazardous
}
function scoreTeam(c) {
  if (c.hazards.length === 0) return true;
  return !c.hard; // single-hazard caught by the Verifier; hard cases slip on first sight
}
function scoreTeamMemory(c, memory) {
  if (c.hazards.length === 0) return true;
  if (!c.hard) return true;
  if (memory.has(c.patternKey)) return true; // a failure-card from a past case rescues the repeat
  memory.set(c.patternKey, true); // write the card now (helps FUTURE cases, not this one)
  return false;
}

const rate = (arr, pred) => (arr.length ? arr.filter(pred).length / arr.length : 0);

// ─── single pass (one run) leaderboard ───────────────────────────────────────────────────────────
const mem0 = new Map();
const single = {
  overall: {
    solo: rate(cases, scoreSolo),
    team: rate(cases, scoreTeam),
    "team+memory": rate(cases, (c) => scoreTeamMemory(c, mem0)),
  },
};
const memC = new Map();
single.complaints = {
  solo: rate(complaints, scoreSolo),
  team: rate(complaints, scoreTeam),
  "team+memory": rate(complaints, (c) => scoreTeamMemory(c, memC)),
};

// ─── across runs (memory persists between epochs) — the "self-improve over time" curve ───────────
const memory = new Map(); // team+memory store, persists across epochs
const epochs = [];
for (let e = 1; e <= EPOCHS; e++) {
  const passMem = complaints.filter((c) => scoreTeamMemory(c, memory)).length;
  epochs.push({
    epoch: e,
    solo: rate(complaints, scoreSolo),
    team: rate(complaints, scoreTeam),
    "team+memory": passMem / (complaints.length || 1),
    cardsLearned: memory.size,
  });
}

// ─── a real sample case for the drill-down (a hazardous complaint) ───────────────────────────────
const sample = complaints.find((c) => c.hard) ?? complaints[0];

// ─── triage distribution ─────────────────────────────────────────────────────────────────────────
const dist = {};
for (const c of cases) dist[c.incidentType] = (dist[c.incidentType] || 0) + 1;

const results = {
  meta: {
    business: raw.business ?? "LE KYOTO",
    overallRating: raw.overallRating,
    nReviews: cases.length,
    nComplaints: complaints.length,
    model: "DETERMINISTIC SIMULATION — no LLM, modelled not measured",
  },
  triageDistribution: dist,
  leaderboard: single,
  acrossRuns: epochs,
  sampleCase: sample
    ? {
        id: sample.id,
        stars: sample.stars,
        incidentType: sample.incidentType,
        hazards: sample.hazards,
        text: sample.text.slice(0, 240),
      }
    : null,
};

const outPath = join(__dir, "sim-recovery-results.json");
writeFileSync(outPath, JSON.stringify(results, null, 2));

// ─── pretty print ────────────────────────────────────────────────────────────────────────────────
const pct = (n) => `${Math.round(n * 100)}%`;
console.log(`\n=== DETERMINISTIC GRPR SIMULATION · ${results.meta.business} (${results.meta.overallRating}★) ===`);
console.log(`⚠ modelled, NOT measured — no LLM/credits. Real numbers come from \`pnpm recovery\`.\n`);
console.log(`reviews: ${results.meta.nReviews}  ·  actionable complaints: ${results.meta.nComplaints}`);
console.log(`triage:  ${Object.entries(dist).map(([k, v]) => `${k}:${v}`).join("  ")}`);

console.log(`\n--- Leaderboard, ALL ${cases.length} reviews (praise-saturated — honest caveat) ---`);
for (const v of ["solo", "team", "team+memory"]) console.log(`  ${v.padEnd(13)} GRPR ${pct(single.overall[v]).padStart(4)}`);
console.log(`  ↳ a 4.7★ corpus is ~91% praise, so GRPR is saturated and the gap looks small. This is exactly`);
console.log(`    why WS-A must BALANCE the eval set (all complaints + matched praise). See the next block.`);

console.log(`\n--- Leaderboard, the ${complaints.length} COMPLAINT cases (where recovery matters) ---`);
for (const v of ["solo", "team", "team+memory"]) console.log(`  ${v.padEnd(13)} GRPR ${pct(single.complaints[v]).padStart(4)}`);

console.log(`\n--- Self-improvement ACROSS RUNS (complaint cases; memory persists) ---`);
console.log(`  run   solo   team   team+memory   cards`);
for (const e of epochs) {
  console.log(`   ${e.epoch}    ${pct(e.solo).padStart(4)}   ${pct(e.team).padStart(4)}     ${pct(e["team+memory"]).padStart(4)}        ${e.cardsLearned}`);
}

if (sample) {
  console.log(`\n--- sample real case ${sample.id} [${sample.stars}★ · ${sample.incidentType} · hazards: ${sample.hazards.join(",") || "none"}] ---`);
  console.log(`  "${sample.text.slice(0, 180)}${sample.text.length > 180 ? "…" : ""}"`);
  console.log(`  solo        → ${scoreSolo(sample) ? "PASS" : "FAIL"}  (ships the over-promise / unbacked stat / no ticket)`);
  console.log(`  team        → ${scoreTeam(sample) ? "PASS" : "FAIL (hard case, first sight)"}`);
}
console.log(`\nwrote ${outPath}`);
