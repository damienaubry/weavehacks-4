/**
 * Mock Friday-prep discussion — used until the backend exposes `GET /prep`.
 *
 * Shaped EXACTLY like @weavehacks/agents `DiscussionResult`, so swapping to the real endpoint
 * is a no-op for the UI. Content mirrors the staged demo date (2026-06-12): a Friday that is
 * rain + a PSG derby + a school holiday + an RER strike — i.e. NOT an average Friday, which is
 * what makes the Historian's baseline and the Scout's read of today disagree.
 *
 * NOT real data — purely to build/preview the UI. The owner stages the real demo via the seed.
 */
import type { DiscussionResult } from "./brigade";

export const MOCK_DISCUSSION: DiscussionResult = {
  date: "2026-06-12",
  weekday: "Friday",
  turns: [
    {
      speaker: "Chef",
      note: "delegates to Historian + Scout, then Prep",
      text: "Friday dinner prep for June 12. Historian: give me the per-item baseline for a normal Friday. Scout: tell me what's atypical about tonight. Prep will reconcile both into one sheet, and I'll flag anything that swings hard before we commit stock.",
      toolCalls: [],
    },
    {
      speaker: "Historian",
      note: "baseline for a typical Friday",
      text: "Typical Friday dinner baseline (avg of last 8 Fridays): gyoza 31, tonkotsu_ramen 23, shoyu_ramen 15, cold_soba 11, edamame 9. This is a naive average — it does not condition on weather, matches, or holidays.",
      toolCalls: [{ name: "demand_baseline", args: { dow: 5, lastN: 8 } }],
    },
    {
      speaker: "Scout",
      note: "today's real-world conditions",
      text: "June 12 is ATYPICAL on four fronts: rain, 14°C (→ cold dishes down, hot broth up); PSG home derby kickoff 21:00 (→ pre-kickoff takeout surge ~18–20:30, then dead during the match); school holiday (→ families order earlier, slightly more volume); RER B strike (→ fewer walk-ins, more delivery). I'm not giving numbers — that's the Historian's call.",
      toolCalls: [
        { name: "get_weather", args: { date: "2026-06-12" } },
        { name: "get_games", args: { date: "2026-06-12" } },
        { name: "get_holidays", args: { date: "2026-06-12" } },
        { name: "get_events", args: { date: "2026-06-12" } },
      ],
    },
    {
      speaker: "Historian",
      note: "refines baseline using Scout's conditions",
      text: "Pulling matching history: on rainy Fridays cold_soba collapses (~11 → ~4, −64%) and tonkotsu_ramen climbs (~23 → ~30). On past PSG match nights total volume is front-loaded before kickoff and overall units run ~15% higher. Refined vs naive baseline: tonkotsu ↑, cold_soba ↓ hard, gyoza ↑ slightly (sharing food before the game).",
      toolCalls: [
        { name: "demand_by_condition", args: { dow: 5, condition: "rain" } },
        { name: "demand_by_condition", args: { dow: 5, gameDay: true } },
      ],
    },
    {
      speaker: "Prep",
      note: "reconciles into the prep sheet",
      text: "Reconciled prep sheet for Friday 2026-06-12 (baseline → adjusted):\n• tonkotsu_ramen 23 → 32  (rain + match night, both push hot broth up)\n• gyoza 31 → 36  (pre-kickoff sharing food)\n• shoyu_ramen 15 → 16  (stable)\n• edamame 9 → 11  (match-night snacking)\n• cold_soba 11 → 4  (rain collapses it — cut prep to avoid waste)\nFront-load everything for an 18:00–20:30 surge before the 21:00 kickoff.",
      toolCalls: [
        { name: "get_menu", args: {} },
        { name: "demand_by_condition", args: { dow: 5, condition: "rain", gameDay: true } },
      ],
    },
    {
      speaker: "Chef",
      note: "presents plan, flags big swings for approval",
      text: "Plan for Friday June 12 — front-loaded for the pre-derby rush:\n• Tonkotsu 32 · Gyoza 36 · Shoyu 16 · Edamame 11\n• ⚠ NEEDS OWNER OK — Cold soba 11 → 4 (−64%): big cut. Right call if the rain holds, but it's a hard swing on a signature item. Approve before we drop the prep.",
      toolCalls: [],
    },
  ],
  prepSheet:
    "tonkotsu_ramen: 32 · gyoza: 36 · shoyu_ramen: 16 · edamame: 11 · cold_soba: 4 — front-loaded for the 18:00–20:30 pre-kickoff surge.",
  presentation:
    "Friday June 12 is rain + a PSG derby + a school holiday + an RER strike. The team front-loaded prep for the pre-kickoff rush, pushed hot broth up, and cut cold soba hard. One item (cold soba −64%) is flagged for your approval.",
};

/** Items the Chef flagged as a big swing → HITL approve/reject in the UI. */
export interface SwingItem {
  item: string;
  baseline: number;
  adjusted: number;
  reason: string;
}
export const MOCK_SWINGS: SwingItem[] = [
  {
    item: "cold_soba",
    baseline: 11,
    adjusted: 4,
    reason: "Rain collapses cold soba (−64%). Big cut on a signature item — confirm before dropping prep.",
  },
];
