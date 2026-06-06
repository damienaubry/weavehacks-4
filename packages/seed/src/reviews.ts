import type { Review } from "./types";

/**
 * Curated review slice. Not central to the starting team (no Content agent yet) but kept so
 * the grounding stat ("% of 5★ that mention the broth") and the future Content/Critic loop
 * have a source. ⚠️ Curated demo data; replace with real public reviews, keep the shape.
 */
export const REVIEWS: Review[] = [
  { id: "r1", stars: 5, text: "The tonkotsu broth is unreal, 18 hours you can taste it.", mentions: ["tonkotsu_ramen"] },
  { id: "r2", stars: 5, text: "Best broth in the area, gyoza crispy too.", mentions: ["tonkotsu_ramen", "gyoza"] },
  { id: "r3", stars: 4, text: "Solid shoyu, fast delivery.", mentions: ["shoyu_ramen"] },
  { id: "r4", stars: 5, text: "That broth keeps me coming back every week.", mentions: ["tonkotsu_ramen"] },
  { id: "r5", stars: 3, text: "Soba was fine, nothing special.", mentions: ["cold_soba"] },
];
