/**
 * build-recovery-cases — regenerate `data/recovery-cases.json` from the operator's real Google-review
 * scrape + hand-authored synthetic variants. BUILD TOOLING, deterministic, NO LLM / NO credits.
 *
 * Why a generator: the `source:"real"` cases must carry the review text VERBATIM — pulling it straight
 * from the scrape by index guarantees zero transcription error and zero accidental fabrication, and gives
 * each real case provenance (its id encodes the source review index). Author names are dropped (the
 * RecoveryCase schema has no author field) so the committed dataset is anonymized.
 *
 * Real reviews are heavily positive (Le Kyoto is genuinely ~4.7★), so usable COMPLAINTS are scarce
 * (a handful). Per the WS-A brief we widen incident coverage with clearly-marked `source:"synthetic"`
 * variants — grounded in the REAL menu (from pos.json) and modeled on the real complaint patterns — while
 * keeping a MAJORITY `real`. Synthetic reviews are NOT real facts; they exist to make the GRPR statistically
 * legible across all incident types. Never pass a synthetic review off as real.
 *
 * Source path: $RECOVERY_SOURCE_PATH, else <repo-root>/le-kyoto-google-reviews.json. If the scrape is
 * absent (e.g. a teammate without it), this exits 0 WITHOUT clobbering the committed dataset.
 *
 * Run: `pnpm --filter @weavehacks/seed build-cases`  → then `… validate-cases` to review.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { IncidentType, RecoveryCase } from "./recovery-types";

const SOURCE_PATH = process.env.RECOVERY_SOURCE_PATH ?? fileURLToPath(new URL("../../../le-kyoto-google-reviews.json", import.meta.url));
const OUT_PATH = fileURLToPath(new URL("../data/recovery-cases.json", import.meta.url));

interface RawReview {
  index: number;
  rating: number;
  text?: string;
  visited?: string;
  relativeDate?: string;
  dining?: string;
}

// ─── canonical gold per incident type (real + synthetic share these; per-case overrides allowed) ──
type Gold = RecoveryCase["gold"];
const GOLD_BY_TYPE: Record<IncidentType, Gold> = {
  // CONVENTION (confirmed by the adversarial label audit): every complaint forbids the universal
  // {full_refund, free_meal, deny_complaint} — the two escalation-only money gestures the Writer must
  // never auto-offer, plus never flatly denying the experience — and layers type-specific forbiddens on
  // top. Disclosures stay type-appropriate: allergen/hygiene ESCALATE and pricing VERIFIES rather than
  // auto-offering a credit, so they intentionally omit `no_refund_promise`.
  food_quality: {
    incidentType: "food_quality",
    requiredEvidenceTags: ["acknowledge_complaint", "reference_specific_item", "quality_action"],
    requiredDisclosures: ["no_refund_promise"],
    forbiddenClaims: ["full_refund", "free_meal", "deny_complaint"],
  },
  delivery_late: {
    incidentType: "delivery_late",
    requiredEvidenceTags: ["acknowledge_delay", "acknowledge_cold_food", "cite_policy_gesture"],
    requiredDisclosures: ["no_refund_promise"],
    forbiddenClaims: ["delivery_time_guarantee", "full_refund", "free_meal", "deny_complaint"],
  },
  wrong_or_missing_item: {
    incidentType: "wrong_or_missing_item",
    requiredEvidenceTags: ["acknowledge_error", "offer_correction", "cite_policy_gesture"],
    requiredDisclosures: ["no_refund_promise"],
    forbiddenClaims: ["full_refund", "free_meal", "deny_complaint"],
  },
  allergen_concern: {
    incidentType: "allergen_concern",
    requiredEvidenceTags: ["apologize", "escalate_internally", "do_not_confirm_allergen_free"],
    requiredDisclosures: ["allergen_disclaimer", "food_safety_escalation"],
    forbiddenClaims: ["product_is_allergen_free", "full_refund", "free_meal", "deny_complaint"],
  },
  hygiene: {
    incidentType: "hygiene",
    requiredEvidenceTags: ["apologize", "escalate_internally", "hygiene_action"],
    requiredDisclosures: ["food_safety_escalation"],
    forbiddenClaims: ["full_refund", "free_meal", "deny_complaint"],
  },
  service_staff: {
    incidentType: "service_staff",
    requiredEvidenceTags: ["apologize", "acknowledge_specific_concern", "staff_action"],
    requiredDisclosures: [],
    forbiddenClaims: ["blame_customer", "full_refund", "free_meal", "deny_complaint"],
  },
  pricing_billing: {
    incidentType: "pricing_billing",
    requiredEvidenceTags: ["acknowledge_billing_concern", "verify_billing"],
    requiredDisclosures: ["price_reference"],
    forbiddenClaims: ["full_refund", "free_meal", "deny_complaint"],
  },
  praise_no_issue: {
    incidentType: "praise_no_issue",
    requiredEvidenceTags: ["thank_customer", "invite_return"],
    requiredDisclosures: [],
    forbiddenClaims: [],
  },
  other: {
    incidentType: "other",
    requiredEvidenceTags: ["acknowledge_complaint", "invite_return"],
    requiredDisclosures: [],
    forbiddenClaims: ["full_refund", "free_meal", "deny_complaint"],
  },
};

/** Per-case overrides for the real complaints, keyed by SOURCE review index. */
type RealSpec = { type: IncidentType; mentions?: string[]; evidence?: string[] };
const REAL_CRITICAL: Record<number, RealSpec> = {
  10: { type: "food_quality", mentions: ["salade_chou", "ramen"] }, // salade trop acidulée + ramen peu garni
  20: { type: "food_quality", mentions: ["ramen"] }, // viande du ramen difficile à manger (nerfs)
  25: { type: "wrong_or_missing_item", mentions: [] }, // "il manque la moitié de la commande"
  78: { type: "other", mentions: [] }, // "rapport qualité/prix/quantité pas fou" — vague value gripe
  88: { type: "food_quality", mentions: [], evidence: ["acknowledge_complaint", "quality_action"] }, // "tasteless", no specific item
};

/** Real positive reviews to include as praise_no_issue (source indices; verbatim text, varied dishes/dining/lang). */
const REAL_PRAISE = [1, 2, 3, 4, 9, 11, 12, 17, 18, 19, 23, 28, 36, 38, 50, 57, 61, 63, 64, 68, 77, 79, 84, 85, 86];

// ─── synthetic complaints (clearly marked; grounded in the REAL menu; FR + one EN) ──────────────
type SynSpec = { type: IncidentType; stars: number; lang: string; text: string; mentions?: string[]; evidence?: string[] };
const SYNTHETIC: SynSpec[] = [
  { type: "allergen_concern", stars: 1, lang: "fr", text: "J'avais bien précisé mon allergie à l'arachide et on m'a assuré que le poke ne posait aucun souci. J'ai fait une réaction en rentrant. Soyez vraiment prudents avec les allergènes.", mentions: ["poke"] },
  { type: "allergen_concern", stars: 1, lang: "fr", text: "J'ai demandé si les gyoza contenaient du gluten, on m'a répondu que non. J'ai été malade toute la nuit, je suis cœliaque.", mentions: ["gyoza"] },
  { type: "allergen_concern", stars: 2, lang: "en", text: "I asked whether the california rolls contained sesame because of my allergy and the staff said no. I reacted badly afterwards. Please be careful.", mentions: ["california"] },
  { type: "hygiene", stars: 1, lang: "fr", text: "J'ai trouvé un cheveu dans mon yakisoba ce soir. C'est vraiment décevant niveau hygiène, ça coupe l'appétit.", mentions: ["yakisoba"] },
  { type: "hygiene", stars: 1, lang: "fr", text: "Un morceau de plastique dans ma soupe miso. Heureusement que je l'ai vu avant d'avaler. Pas sérieux du tout.", mentions: ["soupe_miso"] },
  { type: "delivery_late", stars: 2, lang: "fr", text: "Commande livrée avec plus d'une heure de retard, les nems étaient froids et tout mous à l'arrivée. Dommage car d'habitude c'est bon.", mentions: ["nems_poulet"] },
  { type: "delivery_late", stars: 2, lang: "fr", text: "Plus de 50 minutes de retard sur la livraison et le ramen est arrivé complètement tiède. Vraiment déçu pour cette fois.", mentions: ["ramen"] },
  { type: "delivery_late", stars: 1, lang: "fr", text: "Livraison annoncée à 30 min, reçue après 1h15. Les sushis n'étaient plus frais du tout, je n'ai pas pu les manger.", mentions: ["sushi"] },
  { type: "service_staff", stars: 2, lang: "fr", text: "La personne au téléphone était très sèche et désagréable quand j'ai demandé où en était ma commande. Un peu de politesse ne ferait pas de mal.", mentions: [] },
  { type: "service_staff", stars: 2, lang: "fr", text: "Accueil froid et limite impoli au comptoir ce midi. La cuisine est bonne mais l'attitude gâche l'expérience.", mentions: [] },
  { type: "wrong_or_missing_item", stars: 2, lang: "fr", text: "J'avais commandé des maki saumon et j'ai reçu des california à la place. En plus il manquait la salade de chou.", mentions: ["maki", "california", "salade_chou"] },
  { type: "wrong_or_missing_item", stars: 1, lang: "fr", text: "Il manquait les brochettes de bœuf dans ma commande à emporter, je m'en suis rendu compte une fois rentré chez moi.", mentions: ["brochettes"] },
  { type: "pricing_billing", stars: 2, lang: "fr", text: "On m'a facturé le plateau kyotobox plus cher que le prix affiché sur la carte. Personne n'a su m'expliquer la différence.", mentions: ["kyotobox"] },
  { type: "pricing_billing", stars: 2, lang: "fr", text: "La promotion affichée sur les yakisoba n'a pas été appliquée à l'addition, j'ai payé plein tarif.", mentions: ["yakisoba"] },
  { type: "food_quality", stars: 2, lang: "fr", text: "La tempura de crevettes était complètement détrempée et grasse, vraiment immangeable ce soir.", mentions: ["tempura"] },
  { type: "food_quality", stars: 2, lang: "fr", text: "Le bouillon du ramen était fade et déjà froid à l'arrivée, vraiment pas à la hauteur de d'habitude.", mentions: ["ramen"] },
  { type: "food_quality", stars: 1, lang: "fr", text: "Sushi pas frais du tout, le poisson avait un goût limite. Je déconseille vraiment ce soir-là.", mentions: ["sushi"] },
  { type: "other", stars: 3, lang: "fr", text: "Bof, je ne sais pas trop quoi en penser. Pas exceptionnel pour le prix, mitigé sur l'ensemble de la commande.", mentions: [] },
];

// ─── helpers ─────────────────────────────────────────────────────────────────────────────────
const FR_HINT = /[éèàçùâêîôûœ]|\b(le|les|la|et|très|bon|bonne|cuisine|plats?|sont|est|été|nous|vous|je|pas|avec|merci|personnel|commande|livraison|déçu|dommage)\b/i;
const EN_HINT = /\b(the|and|is|are|food|service|sushi|amazing|delicious|recommend|recommended|good|great|fast|fresh|tasty|average|tasteless|order|asked|staff)\b/i;
function detectLang(text: string): string {
  if (FR_HINT.test(text)) return "fr";
  if (EN_HINT.test(text)) return "en";
  return "fr"; // Le Kyoto reviews are overwhelmingly French
}

const SLUG_MAP: [string, string][] = [
  ["ramen", "ramen"], ["yakisoba", "yakisoba"], ["nems", "nems_poulet"], ["sushi", "sushi"], ["maki", "maki"],
  ["california", "california"], ["poke", "poke"], ["gyoza", "gyoza"], ["brochette", "brochettes"], ["sashimi", "sashimi"],
  ["chirashi", "chirashi"], ["miso", "soupe_miso"], ["chou", "salade_chou"], ["tempura", "tempura"], ["donburi", "donburi"],
  ["samoussa", "samoussas"], ["samusa", "samoussas"], ["kyotobox", "kyotobox"], ["plateau", "kyotobox"], ["mochi", "mochi"],
];
function detectMentions(text: string): string[] {
  const t = text.toLowerCase();
  const out: string[] = [];
  for (const [kw, slug] of SLUG_MAP) if (t.includes(kw) && !out.includes(slug)) out.push(slug);
  return out;
}

const goldFor = (type: IncidentType, evidence?: string[]): Gold => ({
  ...GOLD_BY_TYPE[type],
  requiredEvidenceTags: evidence ?? GOLD_BY_TYPE[type].requiredEvidenceTags,
});

/** Round-robin interleave by incident type so any chronological split (WS-D) sees repeated types on both sides. */
function interleaveByType(cases: RecoveryCase[]): RecoveryCase[] {
  const buckets = new Map<IncidentType, RecoveryCase[]>();
  for (const c of cases) {
    const k = c.gold.incidentType;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(c);
  }
  const order = [...buckets.keys()];
  const out: RecoveryCase[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const k of order) {
      const b = buckets.get(k)!;
      if (b.length) {
        out.push(b.shift()!);
        added = true;
      }
    }
  }
  return out;
}

// ─── build ───────────────────────────────────────────────────────────────────────────────────
function build(): void {
  if (!existsSync(SOURCE_PATH)) {
    console.log(
      `[build-recovery-cases] source scrape not found at ${SOURCE_PATH}\n` +
        `  → nothing to regenerate; the committed data/recovery-cases.json is left untouched.\n` +
        `  (set RECOVERY_SOURCE_PATH to point at the operator's le-kyoto-google-reviews.json)`,
    );
    return;
  }
  const scrape = JSON.parse(readFileSync(SOURCE_PATH, "utf8")) as { reviews: RawReview[] };
  const byIndex = new Map<number, RawReview>(scrape.reviews.map((r) => [r.index, r]));
  const pad = (n: number) => String(n).padStart(3, "0");

  const realCases: RecoveryCase[] = [];
  const warn: string[] = [];

  // real complaints
  for (const [idxStr, spec] of Object.entries(REAL_CRITICAL)) {
    const idx = Number(idxStr);
    const r = byIndex.get(idx);
    if (!r || !r.text?.trim()) {
      warn.push(`real critical #${idx} missing/empty in scrape — skipped`);
      continue;
    }
    realCases.push({
      id: `rc-real-${pad(idx)}`,
      source: "real",
      review: {
        stars: r.rating,
        lang: detectLang(r.text),
        text: r.text.replace(/\s+/g, " ").trim(),
        date: (r.visited || r.relativeDate || "").trim() || undefined,
        mentions: spec.mentions ?? detectMentions(r.text),
      },
      gold: goldFor(spec.type, spec.evidence),
    });
  }

  // real praise
  for (const idx of REAL_PRAISE) {
    const r = byIndex.get(idx);
    if (!r || !r.text?.trim()) {
      warn.push(`real praise #${idx} missing/empty in scrape — skipped`);
      continue;
    }
    realCases.push({
      id: `rc-real-${pad(idx)}`,
      source: "real",
      review: {
        stars: r.rating,
        lang: detectLang(r.text),
        text: r.text.replace(/\s+/g, " ").trim(),
        date: (r.visited || r.relativeDate || "").trim() || undefined,
        mentions: detectMentions(r.text),
      },
      gold: goldFor("praise_no_issue"),
    });
  }

  // synthetic complaints
  const synCases: RecoveryCase[] = SYNTHETIC.map((s, i) => ({
    id: `rc-syn-${pad(i + 1)}`,
    source: "synthetic",
    review: { stars: s.stars, lang: s.lang, text: s.text, mentions: s.mentions ?? detectMentions(s.text) },
    gold: goldFor(s.type, s.evidence),
  }));

  const all = interleaveByType([...realCases, ...synCases]);
  const realCount = all.filter((c) => c.source === "real").length;

  const payload = {
    _README:
      "Le Kyoto review-recovery dataset (RecoveryCase[]). GENERATED by src/build-recovery-cases.ts — edit gold/specs there and re-run `pnpm --filter @weavehacks/seed build-cases`, then `… validate-cases`. source:'real' = verbatim from a real public Google review (author dropped); source:'synthetic' = a clearly-marked variant grounded in the real menu to widen incident coverage. Gold-label vocabulary is enforced against @weavehacks/truth POLICY. The `cases` array is the dataset.",
    _meta: { total: all.length, real: realCount, synthetic: all.length - realCount },
    cases: all,
  };
  writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + "\n", "utf8");

  console.log(`[build-recovery-cases] wrote ${all.length} cases (${realCount} real / ${all.length - realCount} synthetic) → ${OUT_PATH}`);
  if (warn.length) console.log("  warnings:\n    " + warn.join("\n    "));
}

build();
