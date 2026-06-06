import type { WeatherDay } from "./types";

/**
 * Weather slice — historical Fridays/Saturdays + the demo target Friday (2026-06-12).
 * ⚠️ Curated demo data. Replace with a real pull; keep the shape.
 *
 * The target Friday is RAIN — that's half of why it diverges from the historical average
 * (cold soba collapses in rain, hot ramen rises). The Scout agent reads this for "today".
 */
export const WEATHER: WeatherDay[] = [
  // historical Fridays
  { date: "2026-05-01", condition: "clear", tempC: 19 },
  { date: "2026-05-08", condition: "rain", tempC: 13 }, // rainy Friday in the history → soba drops
  { date: "2026-05-15", condition: "clear", tempC: 21 },
  { date: "2026-05-22", condition: "cloud", tempC: 18 },
  { date: "2026-05-29", condition: "clear", tempC: 23 },
  { date: "2026-06-05", condition: "clear", tempC: 22 },
  // historical Saturdays
  { date: "2026-05-16", condition: "clear", tempC: 22 },
  { date: "2026-05-23", condition: "rain", tempC: 15 },
  // the demo target
  { date: "2026-06-12", condition: "rain", tempC: 14 }, // ← target Friday: rain
  { date: "2026-06-13", condition: "cloud", tempC: 17 },
];
