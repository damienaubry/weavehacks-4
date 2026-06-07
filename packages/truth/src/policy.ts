/**
 * POLICY CANON — Le Kyoto's recovery / gesture rules, required disclosures, and forbidden claims.
 *
 * This is CANON (like the menu): the single source of truth the Adversarial Verifier's policy
 * checks and WS-C's `policyOk` resolve toward. A recovery reply is "policy-safe" only if it respects
 * these rules; a gesture is only "grounded" if it traces to `POLICY.gesture` here.
 *
 * Consumed MECHANICALLY by two workstreams, so the headline GRPR stays free of an LLM judge:
 *   • WS-B's `policy_lookup` tool surfaces these rules to the agents (reads `gesture`, `disclosures`,
 *     `forbiddenClaims`, `hitl`).
 *   • WS-C's `policyOk` decides DETERMINISTICALLY whether a reply carries each `requiredDisclosure`
 *     and avoids every `forbiddenClaim`, using the detection registries + helpers below. (A NARROW
 *     LLM judge is tolerated ONLY for the separate "over-promise" axis — never here.)
 *
 * The recovery dataset's gold labels (`requiredDisclosures` / `forbiddenClaims` / `requiredEvidenceTags`)
 * draw their tag names from the vocabularies here; `validate-cases` asserts every label resolves to a
 * rule/tag in this file, so the whole proof shares ONE vocabulary.
 *
 * Shape note: this is a strict SUPERSET of the minimal placeholder WS-B seeded — every field the
 * `policy_lookup` tool reads (`gesture`, `gesture.forbiddenGestures`, `disclosures`, `forbiddenClaims`,
 * `hitl`, `hoursNote`) is preserved with the same type; the rest is additive (detection patterns,
 * bilingual wording, evidence-tag vocab, service facts). Keep the SHAPE, swap the VALUES.
 *
 * ⚠️ PLACEHOLDER VALUES — the gesture limits / disclaimer wording are demo-plausible defaults for a
 * small Paris Japanese takeout, NOT yet confirmed by the operator. Damien validates them (the same way
 * he validates the menu). Never pass a guess off as Le Kyoto's truth.
 */

/** A recovery gesture, roughly ordered by cost/risk. The higher-cost ones require human escalation. */
export type GestureKind =
  | "apology_only"
  | "replace_item"
  | "discount_next_order"
  | "partial_refund"
  | "full_refund"
  | "free_meal";

export interface RecoveryPolicy {
  gesture: {
    /** the standard pre-approved gesture the Writer may offer unprompted */
    defaultGesture: GestureKind;
    /** the most we offer as goodwill, expressed as a PERCENT store credit on the NEXT order (15 = 15%) */
    maxCreditPct: number;
    /** absolute euro ceiling on any single auto-approved gesture (defense-in-depth alongside the %) */
    maxGestureEuros: number;
    /** gestures that may NEVER appear in a reply without a manager's approval (over-promises / HITL) */
    forbiddenGestures: string[];
    /** incident situations under which a LARGER gesture may be escalated to a human for approval */
    escalationTriggers: string[];
    /** one-line summary an agent can cite verbatim */
    summary: string;
  };
  /** required disclosure wording — what each tag MEANS, keyed by the tag the gold labels use */
  disclosures: Record<string, string>;
  /** claims that must never appear — what each tag MEANS, keyed by the tag the gold labels use */
  forbiddenClaims: Record<string, string>;
  /** how a published reply + gesture must be handled */
  hitl: string;
  /** customer-facing hours summary (consistent with TRUTH.hours) */
  hoursNote: string;

  // ── additive: the mechanical detection layer WS-C's policyOk reads ──
  /**
   * For each disclosure tag, the (ASCII, lowercased, diacritic-free) patterns whose presence in a
   * folded reply means the disclosure is CARRIED. Bilingual FR/EN — Le Kyoto replies in the review's
   * language. See `replyHasDisclosure`.
   */
  disclosurePatterns: Record<string, string[]>;
  /**
   * For each forbidden-claim tag, the patterns whose presence means a VIOLATION. Patterns are written
   * AFFIRMATIVELY so a negated / policy-safe phrasing ("we cannot guarantee it is gluten-free") does
   * NOT trip the check. See `replyHasForbiddenClaim`.
   */
  forbiddenClaimPatterns: Record<string, string[]>;
  /**
   * For a forbidden-claim tag, cues that — if present ANYWHERE in the reply — mean the matched pattern
   * is being NEGATED/disclaimed, not asserted (so it's NOT a violation). The canonical case: an allergen
   * DISCLAIMER ("we cannot guarantee it is gluten-free") contains the affirmative substring "is gluten
   * free" but is policy-SAFE. Only `product_is_allergen_free` carries guards — refund/free-meal patterns
   * are kept strict on purpose (we bias toward DETECTING over-promises; the narrow over-promise judge is
   * the backstop for subtler phrasings).
   */
  negationGuards: Record<string, string[]>;
  /** the exact FR + EN wording the Writer should reach for per disclosure (the Verifier can suggest it) */
  canonicalDisclosureText: Record<string, { fr: string; en: string }>;
  /**
   * The recognized `requiredEvidenceTags` vocabulary — what an evidence ledger may need to cover. NOT
   * part of the mechanical pass/fail (GRPR = triage ∧ grounded ∧ policy ∧ ticket); these guide the
   * Analyst's ledger and let `validate-cases` catch a mistyped tag. One shared vocabulary.
   */
  evidenceTags: string[];
  /** stable service facts a reply may lean on (hours live in TRUTH.hours; this adds service shape) */
  service: {
    offersDelivery: boolean;
    /** delivery is fulfilled via third-party platforms — the Writer must not promise a delivery SLA */
    deliveryViaThirdParty: boolean;
    inviteReturn: { fr: string; en: string };
    foodSafetyStance: { fr: string; en: string };
  };
}

// ─── THE CANON ────────────────────────────────────────────────────────────────────────────────

/** TODO(le-kyoto, operator): confirm the gesture limits, disclaimer wording, and hours. Keep the shape. */
export const POLICY: RecoveryPolicy = {
  gesture: {
    defaultGesture: "discount_next_order",
    maxCreditPct: 15, // ≤15% credit on the NEXT order is the standard, pre-approved gesture (PERCENT)
    maxGestureEuros: 10, // ~ a side + drink; anything larger goes to a human
    forbiddenGestures: ["free_meal", "full_refund", "cash_refund", "unlimited_free_delivery"],
    escalationTriggers: [
      "allergen_reaction",
      "foodborne_illness",
      "foreign_object",
      "hygiene_complaint",
      "repeat_incident",
    ],
    summary:
      "Goodwill is at most a 15% credit on the customer's NEXT order. Never a free meal, a full or " +
      "cash refund, or an open-ended promise — those require a manager's approval (HITL).",
  },

  disclosures: {
    // a "disclosure" here = something the reply MUST positively contain (detected by patterns below)
    no_refund_promise:
      "Do not promise a refund. Frame any goodwill as the standard, bounded gesture: a credit on a future order.",
    allergen_disclaimer:
      "Our dishes are prepared in a shared kitchen, so we cannot guarantee any item is free from a given " +
      "allergen; customers with allergies should tell our staff before ordering.",
    food_safety_escalation:
      "Make clear an allergen / hygiene report is taken seriously and escalated to the team immediately.",
    price_reference:
      "For a billing complaint, reference the actual menu price / the receipt rather than conceding blindly.",
  },

  forbiddenClaims: {
    free_meal: "offering a free meal / a free dish (escalation-only gesture)",
    full_refund: "promising a full, total or cash refund (escalation-only gesture)",
    delivery_time_guarantee: "guaranteeing a delivery time (delivery is via third parties)",
    product_is_allergen_free: "stating a dish is free of an allergen (e.g. 'gluten free', 'sans gluten')",
    deny_complaint: "flatly denying the customer's experience / calling them wrong",
    blame_customer: "shifting blame onto the customer instead of owning the issue",
  },

  hitl:
    "A public reply and any gesture touch reputation and money — never auto-publish; a human approves " +
    "the reply and the internal ticket first.",
  hoursNote: "Open Monday–Saturday for dinner (to 22:00, Fri/Sat to 22:30); closed Sunday.",

  // ── detection layer ──
  disclosurePatterns: {
    no_refund_promise: [
      // EN — the reply frames goodwill as a bounded future-order gesture (NOT a refund promise)
      "next order",
      "on your next",
      "store credit",
      "a credit on",
      "voucher",
      "as a gesture",
      "in line with our policy",
      "per our policy",
      // FR
      "prochaine commande",
      "sur votre prochaine",
      "un avoir",
      "avoir sur",
      "bon d'achat",
      "geste commercial",
      "conformement a notre politique",
      "selon notre politique",
    ],
    allergen_disclaimer: [
      // EN
      "cannot guarantee",
      "can't guarantee",
      "may contain traces",
      "traces of allergen",
      "free from traces",
      "prepared in a kitchen",
      "shared kitchen",
      "handles allergen",
      "tell our staff",
      // FR
      "ne pouvons pas garantir",
      "ne peut pas garantir",
      "peut contenir des traces",
      "traces d'allergen",
      "absence de traces",
      "preparees dans une cuisine",
      "cuisine qui manipule",
      "signaler votre allergie",
    ],
    food_safety_escalation: [
      // EN
      "take this report",
      "taking this seriously",
      "take it seriously",
      "very seriously",
      "escalat",
      "our kitchen team",
      "our team",
      "flag this to",
      "looking into this",
      "investigat",
      "food safety",
      // FR
      "tres au serieux",
      "au serieux",
      "transmettons",
      "remontons",
      "signalement",
      "notre equipe",
      "en cuisine",
      "enquet",
      "securite alimentaire",
    ],
    price_reference: [
      // EN
      "our menu",
      "the menu price",
      "matches our menu",
      "on the receipt",
      "your receipt",
      "the listed price",
      "check your receipt",
      // FR
      "notre carte",
      "le prix au menu",
      "prix indique",
      "correspond a notre carte",
      "votre ticket",
      "sur le ticket",
      "le tarif affiche",
      "verifions votre ticket",
    ],
  },

  forbiddenClaimPatterns: {
    full_refund: [
      // EN — affirmative full-refund promises only; bare "refund" is intentionally NOT matched
      "full refund",
      "refund you in full",
      "refund in full",
      "complete refund",
      "refund the entire",
      "refund your entire",
      "fully refund",
      "money back in full",
      // FR
      "remboursement integral",
      "remboursement complet",
      "rembourser integralement",
      "rembourser la totalite",
      "integralement rembours",
      "rembourser l'integralite",
    ],
    free_meal: [
      // EN
      "free meal",
      "meal is on us",
      "on the house",
      "next meal free",
      "free order",
      "order is on us",
      "complimentary meal",
      "your next meal free",
      // FR
      "repas gratuit",
      "repas offert",
      "offert par la maison",
      "c'est offert",
      "commande offerte",
      "commande gratuite",
      "repas est pour nous",
      "on vous offre le repas",
    ],
    delivery_time_guarantee: [
      // EN
      "guarantee delivery",
      "guaranteed delivery",
      "delivery is guaranteed",
      "always deliver within",
      "will never be late",
      "guarantee it arrives",
      "guaranteed to arrive",
      // FR
      "garantissons la livraison",
      "livraison garantie",
      "livrerons toujours",
      "jamais en retard",
      "garantie de livraison",
      "garantissons que",
    ],
    product_is_allergen_free: [
      // EN — AFFIRMATIVE guarantees only; "cannot guarantee gluten-free" must NOT trip this
      "is gluten free",
      "are gluten free",
      "it's gluten free",
      "is allergen free",
      "are allergen free",
      "completely safe",
      "totally safe",
      "perfectly safe for your allergy",
      "safe for your allergy",
      "contains no allergen",
      "guaranteed allergen free",
      "guaranteed safe",
      // FR
      "est sans gluten",
      "sont sans gluten",
      "est sans allergen",
      "sont sans allergen",
      "totalement sur",
      "parfaitement sur pour votre allergie",
      "sans risque pour votre allergie",
      "aucun allergen",
      "garanti sans allergen",
    ],
    deny_complaint: [
      // EN
      "did not happen",
      "didn't happen",
      "that's not true",
      "you are wrong",
      "you're wrong",
      "we never make mistakes",
      "we don't make mistakes",
      "impossible that",
      "never happened",
      // FR
      "ce n'est pas vrai",
      "vous avez tort",
      "ne s'est jamais produit",
      "n'est jamais arrive",
      "nous ne faisons jamais d'erreur",
      "c'est impossible que",
      "cela n'a pas pu",
    ],
    blame_customer: [
      // EN
      "your fault",
      "you should have",
      "you ordered the wrong",
      "that's on you",
      "you misread",
      // FR
      "de votre faute",
      "c'est votre faute",
      "vous auriez du",
      "vous vous etes trompe",
      "vous avez mal lu",
      "vous avez mal commande",
    ],
  },

  negationGuards: {
    // an allergen disclaimer necessarily contains "gluten free" / "sans gluten"; the guarantee-negation
    // cue is what distinguishes a safe disclaimer from a forbidden guarantee.
    product_is_allergen_free: [
      "cannot guarantee",
      "can't guarantee",
      "cannot promise",
      "no guarantee",
      "without guarantee",
      "we don't guarantee",
      "ne pouvons pas garantir",
      "ne peut pas garantir",
      "ne garantissons pas",
      "ne pas garantir",
      "sans pouvoir garantir",
      "sans garantie",
    ],
  },

  canonicalDisclosureText: {
    no_refund_promise: {
      fr: "En geste commercial, nous vous offrons un avoir sur votre prochaine commande, conformément à notre politique.",
      en: "As a gesture, we'd like to offer you a credit on your next order, in line with our policy.",
    },
    allergen_disclaimer: {
      fr: "Nos plats sont préparés dans une cuisine qui manipule poisson, soja, gluten, fruits à coque et sésame ; nous ne pouvons pas garantir l'absence de traces d'allergènes.",
      en: "Our dishes are prepared in a kitchen that handles fish, soy, gluten, nuts and sesame; we cannot guarantee a dish is free from traces of allergens.",
    },
    food_safety_escalation: {
      fr: "Nous prenons ce signalement très au sérieux et le transmettons immédiatement à notre équipe en cuisine.",
      en: "We take this report very seriously and are escalating it to our kitchen team right away.",
    },
    price_reference: {
      fr: "Le prix indiqué correspond à notre carte ; nous vérifions volontiers votre ticket pour lever tout doute.",
      en: "The price shown matches our menu; we're happy to check your receipt to clear up any doubt.",
    },
  },

  evidenceTags: [
    // acknowledgement of the specific incident
    "acknowledge_complaint",
    "acknowledge_delay",
    "acknowledge_cold_food",
    "acknowledge_error",
    "acknowledge_billing_concern",
    "acknowledge_specific_concern",
    "reference_specific_item",
    // empathy / tone
    "apologize",
    "thank_customer",
    "invite_return",
    // concrete actions / next steps
    "offer_correction",
    "quality_action",
    "hygiene_action",
    "staff_action",
    "escalate_internally",
    "verify_billing",
    "cite_policy_gesture",
    // safety guardrails the ledger must reflect
    "do_not_confirm_allergen_free",
  ],

  service: {
    offersDelivery: true,
    deliveryViaThirdParty: true,
    inviteReturn: {
      fr: "Nous espérons avoir le plaisir de vous accueillir à nouveau.",
      en: "We hope to have the chance to serve you again.",
    },
    foodSafetyStance: {
      fr: "Toute alerte allergène ou hygiène est remontée immédiatement à l'équipe et traitée en priorité.",
      en: "Any allergen or hygiene alert is escalated to the team immediately and handled as a priority.",
    },
  },
};

// ─── Mechanical helpers (deterministic — what WS-C's policyOk and WS-B's tool may call into) ────

/** Fold text for matching: NFD-decompose, strip diacritics, lowercase, collapse whitespace. */
export function foldForMatch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Known tag vocabularies — the dataset's gold labels must draw from exactly these. */
export const DISCLOSURE_TAGS: string[] = Object.keys(POLICY.disclosures);
export const FORBIDDEN_CLAIM_TAGS: string[] = Object.keys(POLICY.forbiddenClaims);
export const EVIDENCE_TAGS: string[] = POLICY.evidenceTags;

/**
 * Does `replyText` carry the disclosure `tag`? Mechanical substring match over folded patterns.
 * Unknown tag (or one with no patterns) ⇒ false — validate tags against DISCLOSURE_TAGS first.
 */
export function replyHasDisclosure(tag: string, replyText: string): boolean {
  const patterns = POLICY.disclosurePatterns[tag];
  if (!patterns || patterns.length === 0) return false;
  const hay = foldForMatch(replyText);
  return patterns.some((p) => hay.includes(foldForMatch(p)));
}

/**
 * Does `replyText` make the forbidden claim `tag`? Mechanical substring match over folded patterns.
 * Patterns are affirmative, so a negated / policy-safe phrasing does not trip the check. Unknown tag ⇒ false.
 */
export function replyHasForbiddenClaim(tag: string, replyText: string): boolean {
  const patterns = POLICY.forbiddenClaimPatterns[tag];
  if (!patterns || patterns.length === 0) return false;
  const hay = foldForMatch(replyText);
  // If a negation/disclaimer guard for this tag is present, the affirmative pattern is being
  // disclaimed, not asserted — not a violation (e.g. "we cannot guarantee it is gluten-free").
  const guards = POLICY.negationGuards[tag];
  if (guards && guards.some((g) => hay.includes(foldForMatch(g)))) return false;
  return patterns.some((p) => hay.includes(foldForMatch(p)));
}

/** Is a proposed credit (a PERCENT in [0,100], e.g. 15 for 15%) within the auto-approved limit? */
export function creditWithinPolicy(creditPct: number): boolean {
  return creditPct >= 0 && creditPct <= POLICY.gesture.maxCreditPct;
}

/** Is this gesture one the Writer may offer WITHOUT escalating to a human? */
export function gestureAutoApprovable(kind: GestureKind): boolean {
  return !POLICY.gesture.forbiddenGestures.includes(kind);
}
