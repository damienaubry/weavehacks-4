import type { Holiday } from "./types";

/**
 * French public + school holidays that shift baseline demand and dayparts. ⚠️ Curated demo
 * data; replace with the real calendar (region: Île-de-France), keep the shape.
 *
 * The target Friday (2026-06-12) falls in a school-holiday week — families order earlier and
 * a bit more. The Scout agent surfaces this; the historical Friday average mostly doesn't.
 */
export const HOLIDAYS: Holiday[] = [
  { date: "2026-05-01", name: "Fête du Travail", kind: "public" }, // Labour Day — atypical Friday
  { date: "2026-06-12", name: "Vacances scolaires (zone C)", kind: "school" }, // ← target Friday: school holiday
  { date: "2026-06-13", name: "Vacances scolaires (zone C)", kind: "school" },
];
