/**
 * Pure analytics over the seed POS slice — no LLM, no clock. The history tools wrap these.
 * Kept separate so the aggregation is testable and the tool layer stays thin.
 */
import { ORDERS, WEATHER, FIXTURES, HOLIDAYS } from "@weavehacks/seed";
import type { Order } from "@weavehacks/seed";

/** date → (itemId → total qty that night) */
function nightlyTotals(orders: Order[]): Map<string, Map<string, number>> {
  const byDate = new Map<string, Map<string, number>>();
  for (const o of orders) {
    const items = byDate.get(o.date) ?? new Map<string, number>();
    items.set(o.itemId, (items.get(o.itemId) ?? 0) + o.qty);
    byDate.set(o.date, items);
  }
  return byDate;
}

/** Average nightly qty per item across a set of dates. */
function averagePerItem(dates: string[], totals: Map<string, Map<string, number>>) {
  const sum = new Map<string, number>();
  for (const d of dates) {
    const items = totals.get(d);
    if (!items) continue;
    for (const [item, qty] of items) sum.set(item, (sum.get(item) ?? 0) + qty);
  }
  const n = dates.length || 1;
  const perItem: Record<string, number> = {};
  for (const [item, total] of sum) perItem[item] = Math.round((total / n) * 10) / 10;
  return perItem;
}

const RAIN = new Set(WEATHER.filter((w) => w.condition === "rain").map((w) => w.date));
const CLEAR = new Set(WEATHER.filter((w) => w.condition === "clear").map((w) => w.date));
const CLOUD = new Set(WEATHER.filter((w) => w.condition === "cloud").map((w) => w.date));
const GAME_DAYS = new Set(FIXTURES.map((f) => f.date));
const HOLIDAY_DAYS = new Set(HOLIDAYS.map((h) => h.date));

export interface BaselineResult {
  dow: number;
  daysUsed: string[];
  perItemAvg: Record<string, number>;
  note: string;
}

/** Naive "typical day" — average per item over the most recent `lastN` days of a weekday. */
export function demandBaseline(dow: number, lastN = 8): BaselineResult {
  const totals = nightlyTotals(ORDERS);
  const dates = [...new Set(ORDERS.filter((o) => o.dow === dow).map((o) => o.date))].sort().reverse().slice(0, lastN);
  return {
    dow,
    daysUsed: dates,
    perItemAvg: averagePerItem(dates, totals),
    note: "Naive average across recent days of this weekday — does NOT condition on weather/games/holidays.",
  };
}

export interface ConditionFilter {
  dow?: number;
  condition?: "clear" | "cloud" | "rain";
  gameDay?: boolean;
  holiday?: boolean;
}

export interface ConditionResult {
  filter: ConditionFilter;
  daysMatched: string[];
  perItemAvg: Record<string, number>;
}

/** Conditional history — average per item over days matching weather/game/holiday filters. */
export function demandByCondition(f: ConditionFilter): ConditionResult {
  const totals = nightlyTotals(ORDERS);
  const allDates = [...new Set(ORDERS.map((o) => o.date))];
  const dates = allDates.filter((d) => {
    const dowOk = f.dow === undefined || ORDERS.some((o) => o.date === d && o.dow === f.dow);
    const condOk =
      !f.condition ||
      (f.condition === "rain" && RAIN.has(d)) ||
      (f.condition === "clear" && CLEAR.has(d)) ||
      (f.condition === "cloud" && CLOUD.has(d));
    const gameOk = f.gameDay === undefined || GAME_DAYS.has(d) === f.gameDay;
    const holOk = f.holiday === undefined || HOLIDAY_DAYS.has(d) === f.holiday;
    return dowOk && condOk && gameOk && holOk;
  });
  return { filter: f, daysMatched: dates.sort(), perItemAvg: averagePerItem(dates, totals) };
}

/** Raw order lines for one date. */
export function ordersOn(date: string): Order[] {
  return ORDERS.filter((o) => o.date === date);
}
