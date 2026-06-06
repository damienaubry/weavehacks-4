import type { LocalEvent } from "./types";

/**
 * Neighborhood events that spike or suppress orders (concerts, transport strikes, markets).
 * ⚠️ Curated demo data; replace with a real local feed, keep the shape.
 *
 * The target Friday (2026-06-12) has an RER transport strike — a wildcard the Scout flags:
 * fewer walk-ins, more delivery. Another small force pulling the night away from "average".
 */
export const EVENTS: LocalEvent[] = [
  { date: "2026-05-22", name: "Marché nocturne (night market)", kind: "market", effect: "boost" },
  { date: "2026-06-12", name: "Grève RER B (transport strike)", kind: "strike", effect: "suppress" }, // ← target Friday
];
