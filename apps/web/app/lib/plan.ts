/**
 * Owner-facing prep plan — the STRUCTURED shape the restaurant owner's screen renders.
 *
 * The agent discussion (`DiscussionResult`) is raw LLM text; the owner doesn't want that. This
 * is the clean, structured outcome: tonight's heads-up + a prep sheet of quantities + the one
 * decision to approve. When the backend exposes `GET /prep`, it should return this structured
 * plan too (or the frontend derives it). Until then, `fetchPlan` serves a local mock.
 *
 * NOT real data — staging the demo (date 2026-06-12) uses the seed.
 */

export type Direction = "up" | "down" | "mixed";

/** Kitchen station — drives the chip + which items batch together. */
export type Station = "sushi" | "bowl" | "hot" | "grill" | "drink" | "dessert";

/**
 * WHEN/HOW an item is prepped — the constraint the owner cares about:
 *  - "ahead"      → cold/sushi that holds: batch the top sellers ~1h before service.
 *  - "components" → prep the components ahead (rice, broth, sauces, blanched sides), assemble live.
 *  - "to-order"   → hot/grill, cooked à la minute during service (never batched ahead).
 *  - "stock"      → no prep (drinks, packaged).
 * These are CANON menu properties; ultimately they live in packages/truth and the Prep agent
 * reasons with them. Mocked here to prototype the timed prep plan.
 */
export type PrepStrategy = "ahead" | "components" | "to-order" | "stock";

/** One thing that's unusual about tonight, in plain owner language. */
export interface PrepFactor {
  label: string;
  detail: string;
  direction: Direction;
  /** optional emoji shown as an inline context chip on the week calendar (☔ ⚽ 🎒 …) */
  icon?: string;
}

/** One line of the prep sheet: how much to prep, vs a normal night, why, and when/how. */
export interface PrepItem {
  /** stable id (matches the menu) */
  id: string;
  /** human label shown to the owner */
  label: string;
  baseline: number;
  adjusted: number;
  reason: string;
  /** big swing → needs the owner's OK before it's committed */
  flagged?: boolean;
  /** kitchen station (optional until the menu carries it) */
  station?: Station;
  /** when/how to prep it (optional until the menu carries it; defaults to "to-order") */
  strategy?: PrepStrategy;
}

export interface PrepPlan {
  date: string;
  weekday: string;
  /** one-line operational summary */
  headline: string;
  factors: PrepFactor[];
  items: PrepItem[];
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const MOCK_PLAN: PrepPlan = {
  date: "2026-06-12",
  weekday: "Friday",
  headline: "Front-load prep for the 18:00–20:30 rush before the 21:00 derby.",
  factors: [
    { label: "Rain · 14°C", detail: "cold dishes down, hot broth up", direction: "mixed", icon: "☔" },
    { label: "PSG home derby · 21:00", detail: "takeout surge before kickoff, quiet during the match", direction: "up", icon: "⚽" },
    { label: "School holiday", detail: "families order a bit earlier and a bit more", direction: "up", icon: "🎒" },
    { label: "RER B strike", detail: "fewer walk-ins, more delivery", direction: "mixed", icon: "🚇" },
  ],
  items: [
    // 🍣 cold/sushi — batch the top sellers ~1h before service (they hold).
    { id: "maki_saumon", label: "Maki Saumon (6)", baseline: 30, adjusted: 40, reason: "Top seller — batch ahead at 17:30, holds through the rush.", station: "sushi", strategy: "ahead" },
    { id: "california", label: "California Saumon Avocat (6)", baseline: 16, adjusted: 18, reason: "Steady mover — worth batching ahead.", station: "sushi", strategy: "ahead" },
    {
      id: "cold_soba",
      label: "Cold Soba",
      baseline: 11,
      adjusted: 4,
      reason: "Rain collapses cold soba (−64%). Big cut on a signature item — confirm before dropping prep.",
      flagged: true,
      station: "bowl",
      strategy: "ahead",
    },
    // 🔥 hot — cooked à la minute, never batched ahead.
    { id: "tonkotsu_ramen", label: "Tonkotsu Ramen", baseline: 23, adjusted: 32, reason: "Rain + match night both push hot broth up — broth ready, assemble to order.", station: "hot", strategy: "to-order" },
    { id: "gyoza", label: "Gyoza (6)", baseline: 31, adjusted: 36, reason: "Pre-kickoff sharing food — pan to order, stays crisp.", station: "hot", strategy: "to-order" },
    { id: "shoyu_ramen", label: "Shoyu Ramen", baseline: 15, adjusted: 16, reason: "Roughly stable.", station: "hot", strategy: "to-order" },
    // 🥗 components prepped ahead, assembled live.
    { id: "edamame", label: "Edamame", baseline: 9, adjusted: 11, reason: "Match-night snacking — blanch ahead, hold warm.", station: "hot", strategy: "components" },
  ],
};

export interface PlanFetch {
  plan: PrepPlan;
  /** true when served from the local mock (backend not wired yet) */
  mocked: boolean;
}

/** Try a structured plan from the backend; fall back to the mock so the owner UI works standalone. */
export async function fetchPlan(date?: string): Promise<PlanFetch> {
  try {
    const res = await fetch(`${API}/prep${date ? `?date=${encodeURIComponent(date)}` : ""}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = (await res.json()) as Partial<PrepPlan>;
    // Only accept it if it's already the structured plan shape; otherwise fall back.
    if (Array.isArray(data.items) && Array.isArray(data.factors)) {
      return { plan: data as PrepPlan, mocked: false };
    }
    throw new Error("unstructured");
  } catch {
    return { plan: MOCK_PLAN, mocked: true };
  }
}
