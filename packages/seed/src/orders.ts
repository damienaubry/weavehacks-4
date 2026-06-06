import type { Order } from "./types";

/**
 * Curated POS slice (~46 lines). ⚠️ Demo data, not Le Kyoto's real export — keep the SHAPE,
 * swap the VALUES (target ~50 real lines from Hiboutik).
 *
 * It's built so the patterns are LEARNABLE and the target Friday (2026-06-12) genuinely
 * diverges from the historical average — that divergence is the Historian-vs-Scout conflict:
 *   • normal clear Fridays (05-15, 05-29) ≈ the baseline
 *   • rainy Friday (05-08) → cold soba collapses, ramen rises
 *   • match Friday (06-05, PSG) → big pre-kickoff surge, dead during the game (21h)
 *   • holiday Friday (05-01, Labour Day) → atypically quiet
 *   • cloudy Friday w/ night market (05-22) → mild boost
 * dow: 5=Fri, 6=Sat, 3=Wed.
 */
export const ORDERS: Order[] = [
  // ── Fri 2026-05-01 · Labour Day (public holiday), clear → atypically quiet ──
  { date: "2026-05-01", dow: 5, hour: 19, itemId: "gyoza", qty: 22 },
  { date: "2026-05-01", dow: 5, hour: 20, itemId: "tonkotsu_ramen", qty: 16 },
  { date: "2026-05-01", dow: 5, hour: 20, itemId: "shoyu_ramen", qty: 11 },
  { date: "2026-05-01", dow: 5, hour: 20, itemId: "cold_soba", qty: 9 },
  { date: "2026-05-01", dow: 5, hour: 19, itemId: "edamame", qty: 12 },

  // ── Fri 2026-05-08 · rain → soba collapses, ramen up ──
  { date: "2026-05-08", dow: 5, hour: 19, itemId: "gyoza", qty: 30 },
  { date: "2026-05-08", dow: 5, hour: 20, itemId: "tonkotsu_ramen", qty: 27 },
  { date: "2026-05-08", dow: 5, hour: 20, itemId: "shoyu_ramen", qty: 17 },
  { date: "2026-05-08", dow: 5, hour: 20, itemId: "cold_soba", qty: 4 },
  { date: "2026-05-08", dow: 5, hour: 19, itemId: "edamame", qty: 17 },

  // ── Fri 2026-05-15 · clear → baseline Friday ──
  { date: "2026-05-15", dow: 5, hour: 19, itemId: "gyoza", qty: 31 },
  { date: "2026-05-15", dow: 5, hour: 20, itemId: "tonkotsu_ramen", qty: 23 },
  { date: "2026-05-15", dow: 5, hour: 20, itemId: "shoyu_ramen", qty: 15 },
  { date: "2026-05-15", dow: 5, hour: 20, itemId: "cold_soba", qty: 12 },
  { date: "2026-05-15", dow: 5, hour: 19, itemId: "edamame", qty: 18 },

  // ── Fri 2026-05-22 · cloudy + night market → mild boost ──
  { date: "2026-05-22", dow: 5, hour: 19, itemId: "gyoza", qty: 34 },
  { date: "2026-05-22", dow: 5, hour: 20, itemId: "tonkotsu_ramen", qty: 24 },
  { date: "2026-05-22", dow: 5, hour: 20, itemId: "shoyu_ramen", qty: 16 },
  { date: "2026-05-22", dow: 5, hour: 20, itemId: "cold_soba", qty: 9 },
  { date: "2026-05-22", dow: 5, hour: 19, itemId: "edamame", qty: 20 },

  // ── Fri 2026-05-29 · clear → baseline Friday ──
  { date: "2026-05-29", dow: 5, hour: 19, itemId: "gyoza", qty: 30 },
  { date: "2026-05-29", dow: 5, hour: 20, itemId: "tonkotsu_ramen", qty: 22 },
  { date: "2026-05-29", dow: 5, hour: 20, itemId: "shoyu_ramen", qty: 14 },
  { date: "2026-05-29", dow: 5, hour: 20, itemId: "cold_soba", qty: 13 },
  { date: "2026-05-29", dow: 5, hour: 19, itemId: "edamame", qty: 17 },

  // ── Fri 2026-06-05 · clear + PSG vs Lyon (21:00) → pre-kickoff surge, dead at 21h ──
  { date: "2026-06-05", dow: 5, hour: 19, itemId: "gyoza", qty: 38 },
  { date: "2026-06-05", dow: 5, hour: 20, itemId: "tonkotsu_ramen", qty: 28 },
  { date: "2026-06-05", dow: 5, hour: 20, itemId: "shoyu_ramen", qty: 18 },
  { date: "2026-06-05", dow: 5, hour: 20, itemId: "cold_soba", qty: 10 },
  { date: "2026-06-05", dow: 5, hour: 19, itemId: "edamame", qty: 22 },
  { date: "2026-06-05", dow: 5, hour: 21, itemId: "gyoza", qty: 6 }, // game on → room dies

  // ── Sat 2026-05-16 · clear → busier weekend ──
  { date: "2026-05-16", dow: 6, hour: 20, itemId: "gyoza", qty: 36 },
  { date: "2026-05-16", dow: 6, hour: 20, itemId: "tonkotsu_ramen", qty: 26 },
  { date: "2026-05-16", dow: 6, hour: 20, itemId: "shoyu_ramen", qty: 17 },
  { date: "2026-05-16", dow: 6, hour: 20, itemId: "cold_soba", qty: 14 },
  { date: "2026-05-16", dow: 6, hour: 19, itemId: "edamame", qty: 20 },

  // ── Sat 2026-05-23 · rain + France vs England rugby (17:45) → early surge, soba dead ──
  { date: "2026-05-23", dow: 6, hour: 18, itemId: "gyoza", qty: 33 },
  { date: "2026-05-23", dow: 6, hour: 19, itemId: "tonkotsu_ramen", qty: 29 },
  { date: "2026-05-23", dow: 6, hour: 19, itemId: "shoyu_ramen", qty: 19 },
  { date: "2026-05-23", dow: 6, hour: 20, itemId: "cold_soba", qty: 3 },
  { date: "2026-05-23", dow: 6, hour: 18, itemId: "edamame", qty: 19 },

  // ── Wed 2026-05-20 · clear → quiet weekday baseline ──
  { date: "2026-05-20", dow: 3, hour: 20, itemId: "gyoza", qty: 14 },
  { date: "2026-05-20", dow: 3, hour: 20, itemId: "tonkotsu_ramen", qty: 12 },
  { date: "2026-05-20", dow: 3, hour: 20, itemId: "shoyu_ramen", qty: 8 },
  { date: "2026-05-20", dow: 3, hour: 20, itemId: "cold_soba", qty: 5 },
  { date: "2026-05-20", dow: 3, hour: 19, itemId: "edamame", qty: 9 },
];
