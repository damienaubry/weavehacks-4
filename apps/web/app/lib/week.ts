/**
 * Week-ahead plan — a WEEK wrapper around the existing per-service PrepPlan (lib/plan.ts is
 * unchanged). A "service" = one lunch or dinner (a full PrepPlan). A "day" = up to 2 services,
 * or closed (Le Kyoto is closed Sunday + Monday). The home screen forecasts the whole week.
 *
 * Mock-driven for now; `fetchWeek` mirrors `fetchPlan` and falls back to MOCK_WEEK. When the
 * backend exposes GET /prep/week (10 PrepPlans), the frontend derives covers/intensity/flags.
 *
 * NOT real data — sample week staged for the demo (Fri dinner = the rain + PSG-derby spotlight).
 */
import type { PrepFactor, PrepItem, PrepPlan, PrepStrategy, Station } from "./plan";
import { MOCK_PLAN } from "./plan";

export type ServiceSlot = "lunch" | "dinner";

/** Service start times (Le Kyoto). Drives the "prep at HH:MM" math in the timed prep plan. */
export const SERVICE_START: Record<ServiceSlot, string> = { lunch: "11:30", dinner: "18:30" };

/** "18:30" minus N minutes → "17:30". */
export function minusMinutes(hhmm: string, n: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  let t = h * 60 + m - n;
  if (t < 0) t += 24 * 60;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}
/** quiet | steady | busy | peak — precomputed (ranked across the 10 open services). */
export type Intensity = 0 | 1 | 2 | 3;

export interface ServiceForecast {
  slot: ServiceSlot;
  plan: PrepPlan;
  /** predicted guests — the hero number in the grid cell */
  covers: number;
  intensity: Intensity;
  /** predicted revenue for the service (€) */
  revenue: number;
  /** > 0 → amber ⚠ dot; derived from plan.items flagged count */
  flaggedCount: number;
}

export interface DayForecast {
  date: string;
  weekday: string;
  /** false for Sun/Mon → greyed CLOSED rail (data-driven, never keyed off the weekday name) */
  open: boolean;
  /** [] when closed; else exactly [lunch, dinner] in that order */
  services: ServiceForecast[];
}

export interface WeekSummary {
  totalCovers: number;
  busiest: { date: string; slot: ServiceSlot; covers: number };
  toApprove: number;
  biggestSwing: { itemLabel: string; pct: number; date: string; slot: ServiceSlot };
}

export interface WeekPlan {
  weekStart: string;
  rangeLabel: string;
  headline: string;
  /** always length 7, Mon→Sun, so the grid renders a full week */
  days: DayForecast[];
  summary: WeekSummary;
  /** the ONE busiest service → "PEAK" badge (separate field so ties still yield exactly one) */
  peak: { date: string; slot: ServiceSlot };
}

// ── mock builders ────────────────────────────────────────────────────────────────────────────
const f = (label: string, detail: string, direction: PrepFactor["direction"], icon?: string): PrepFactor => ({
  label,
  detail,
  direction,
  icon,
});
const it = (
  id: string,
  label: string,
  baseline: number,
  adjusted: number,
  reason: string,
  station: Station,
  strategy: PrepStrategy,
): PrepItem => ({ id, label, baseline, adjusted, reason, station, strategy });
const plan = (date: string, weekday: string, headline: string, factors: PrepFactor[], items: PrepItem[]): PrepPlan => ({
  date,
  weekday,
  headline,
  factors,
  items,
});
const svc = (slot: ServiceSlot, covers: number, intensity: Intensity, p: PrepPlan): ServiceForecast => ({
  slot,
  plan: p,
  covers,
  intensity,
  revenue: Math.round((covers * (slot === "dinner" ? 14 : 12)) / 5) * 5, // ~basket €, rounded to €5
  flaggedCount: p.items.filter((i) => i.flagged).length,
});
const openDay = (date: string, weekday: string, lunch: ServiceForecast, dinner: ServiceForecast): DayForecast => ({
  date,
  weekday,
  open: true,
  services: [lunch, dinner],
});
const closedDay = (date: string, weekday: string): DayForecast => ({ date, weekday, open: false, services: [] });

// A couple of reusable light item sets (modest moves, no flags) for the non-spotlight services.
const lunchItems = (mult: number): PrepItem[] => [
  it("california", "California Roll (6)", 16, Math.round(16 * mult), "Reliable midday seller — batch ahead.", "sushi", "ahead"),
  it("gyoza", "Gyoza (6)", 18, Math.round(18 * mult), "Steady lunch staple — pan to order.", "hot", "to-order"),
  it("karaage", "Chicken Karaage", 14, Math.round(14 * mult), "Popular bento add-on — fry to order.", "hot", "to-order"),
  it("edamame", "Edamame", 9, Math.round(9 * mult), "Light starter — blanch ahead.", "hot", "components"),
];
const dinnerItems = (mult: number): PrepItem[] => [
  it("chirashi", "Chirashi Bowl", 12, Math.round(12 * mult), "Evening favorite — components ahead.", "bowl", "ahead"),
  it("tonkotsu_ramen", "Tonkotsu Ramen", 24, Math.round(24 * mult), "The signature broth — broth ready, assemble to order.", "hot", "to-order"),
  it("gyoza", "Gyoza (6)", 30, Math.round(30 * mult), "Sharing food — pan to order.", "hot", "to-order"),
  it("shoyu_ramen", "Shoyu Ramen", 15, Math.round(15 * mult), "Stable second ramen.", "hot", "to-order"),
  it("edamame", "Edamame", 10, Math.round(10 * mult), "Snacking starter — blanch ahead.", "hot", "components"),
];

export const MOCK_WEEK: WeekPlan = {
  weekStart: "2026-06-08",
  rangeLabel: "Tue Jun 9 – Sat Jun 13",
  headline: "Busy week — Fri dinner is your peak (PSG derby). 1 service needs your OK.",
  days: [
    closedDay("2026-06-08", "Monday"),
    openDay(
      "2026-06-09",
      "Tuesday",
      svc("lunch", 38, 1, plan("2026-06-09", "Tuesday", "Quiet, steady Tuesday lunch.", [f("Mild · 18°C", "ordinary midweek weather", "mixed"), f("Office crowd", "nearby offices order in", "up", "💼")], lunchItems(1.0))),
      svc("dinner", 64, 1, plan("2026-06-09", "Tuesday", "Calm midweek dinner.", [f("Mid-week calm", "no events, normal flow", "mixed")], dinnerItems(1.0))),
    ),
    openDay(
      "2026-06-10",
      "Wednesday",
      svc("lunch", 41, 1, plan("2026-06-10", "Wednesday", "School holiday lifts the lunch a touch.", [f("School holiday", "families order earlier and a bit more", "up", "🎒")], lunchItems(1.1))),
      svc("dinner", 59, 1, plan("2026-06-10", "Wednesday", "Steady Wednesday dinner.", [f("Clear · 19°C", "pleasant evening", "mixed"), f("No fixtures", "nothing pulling demand", "mixed")], dinnerItems(0.95))),
    ),
    openDay(
      "2026-06-11",
      "Thursday",
      svc("lunch", 35, 0, plan("2026-06-11", "Thursday", "Slower Thursday lunch.", [f("Slow lunch", "typically the week's quietest service", "down")], lunchItems(0.9))),
      svc("dinner", 62, 2, plan("2026-06-11", "Thursday", "Warm evening pulls a bigger dinner.", [f("Warm · 23°C", "terrace weather, walk-ins up", "up", "☀️"), f("Payday week", "slightly higher baskets", "up")], dinnerItems(1.1))),
    ),
    openDay(
      "2026-06-12",
      "Friday",
      svc("lunch", 52, 2, plan("2026-06-12", "Friday", "Pre-weekend buzz, sunny lunch.", [f("Sunny · 22°C", "good walk-in weather", "up", "☀️"), f("Pre-weekend", "Friday lunch always lifts", "up")], lunchItems(1.3))),
      // The spotlight: reuse the rich single-service mock (rain + PSG derby + holiday + strike, Cold Soba −64% flagged).
      svc("dinner", 98, 3, MOCK_PLAN),
    ),
    openDay(
      "2026-06-13",
      "Saturday",
      svc("lunch", 61, 2, plan("2026-06-13", "Saturday", "Weekend shoppers fill the lunch.", [f("Weekend shoppers", "high-street footfall up", "up", "🛍️")], lunchItems(1.35))),
      svc("dinner", 86, 2, plan("2026-06-13", "Saturday", "Saturday rush — walk-ins up.", [f("Saturday rush", "busiest non-event service", "up"), f("Clear night", "good walk-in weather", "up")], dinnerItems(1.4))),
    ),
    closedDay("2026-06-14", "Sunday"),
  ],
  summary: {
    totalCovers: 596,
    busiest: { date: "2026-06-12", slot: "dinner", covers: 98 },
    toApprove: 1,
    biggestSwing: { itemLabel: "Cold Soba", pct: -64, date: "2026-06-12", slot: "dinner" },
  },
  peak: { date: "2026-06-12", slot: "dinner" },
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface WeekFetch {
  week: WeekPlan;
  /** true when served from the local mock (backend /prep/week not wired yet) */
  mocked: boolean;
}

/** Try a structured week from the backend; fall back to the mock so the owner UI works standalone. */
export async function fetchWeek(weekStart?: string): Promise<WeekFetch> {
  try {
    const res = await fetch(`${API}/prep/week${weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : ""}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = (await res.json()) as Partial<WeekPlan>;
    if (Array.isArray(data.days) && data.summary && data.peak) return { week: data as WeekPlan, mocked: false };
    throw new Error("unstructured");
  } catch {
    return { week: MOCK_WEEK, mocked: true };
  }
}

/** Stable key for a per-item decision, shared by the page's lifted decision map. */
export const itemKey = (date: string, slot: ServiceSlot, itemId: string) => `${date}|${slot}|${itemId}`;
