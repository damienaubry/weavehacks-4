/**
 * RECOVERY CASES — placeholder slice (Phase 0).
 *
 * These 3 cases are CLEARLY-MARKED synthetic seeds so the recovery harness + front-end run from
 * minute one. ⚠️ WS-A REPLACES/EXPANDS this to ~50 cases derived from Le Kyoto's REAL Google
 * reviews (majority `source: "real"`), ideally loaded from `data/recovery-cases.json` and
 * validated by the operator. Keep the shape (`RecoveryCase`).
 */
import type { RecoveryCase } from "./recovery-types";

export const RECOVERY_CASES: RecoveryCase[] = [
  {
    id: "rc-demo-1",
    source: "synthetic",
    review: {
      stars: 2,
      lang: "fr",
      text: "Commande livrée 50 min en retard et le ramen tonkotsu était froid à l'arrivée. Dommage, d'habitude c'est très bon.",
      mentions: ["tonkotsu_ramen"],
    },
    gold: {
      incidentType: "delivery_late",
      requiredEvidenceTags: ["acknowledge_delay", "acknowledge_cold_food"],
      requiredDisclosures: ["no_refund_promise"],
      forbiddenClaims: ["free_meal", "full_refund", "delivery_time_guarantee"],
    },
  },
  {
    id: "rc-demo-2",
    source: "synthetic",
    review: {
      stars: 1,
      lang: "en",
      text: "I asked if the gyoza were gluten free and the staff said yes — I reacted badly. Please be careful.",
      mentions: ["gyoza"],
    },
    gold: {
      incidentType: "allergen_concern",
      requiredEvidenceTags: ["apologize", "escalate_internally"],
      requiredDisclosures: ["allergen_disclaimer"],
      forbiddenClaims: ["product_is_allergen_free"],
    },
  },
  {
    id: "rc-demo-3",
    source: "synthetic",
    review: {
      stars: 5,
      lang: "en",
      text: "Best tonkotsu broth in the area, I come back every week. Gyoza crispy too!",
      mentions: ["tonkotsu_ramen", "gyoza"],
    },
    gold: {
      incidentType: "praise_no_issue",
      requiredEvidenceTags: ["thank_customer"],
      requiredDisclosures: [],
      forbiddenClaims: [],
    },
  },
];
