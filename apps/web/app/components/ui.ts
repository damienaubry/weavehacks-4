/** Shared dark-theme style tokens + tiny helpers, so the page and all components agree. */
import type { CSSProperties } from "react";
import type { Direction } from "../lib/plan";

export const panel: CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 16,
};

export const sectionTitle: CSSProperties = {
  fontSize: 13,
  color: "var(--muted)",
  textTransform: "uppercase",
  letterSpacing: 1,
  margin: 0,
};

export function btnStyle(loading: boolean): CSSProperties {
  return {
    background: "var(--accent)",
    color: "#06210f",
    border: 0,
    borderRadius: 8,
    padding: "9px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: loading ? "wait" : "pointer",
    whiteSpace: "nowrap",
  };
}

export function btn(bg: string, fg: string, border?: string): CSSProperties {
  return {
    background: bg,
    color: fg,
    border: border ? `1px solid ${border}` : 0,
    borderRadius: 8,
    padding: "7px 12px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-06-12" → "Jun 12, 2026" */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${d}, ${y}`;
}

/** "2026-06-12" → "Jun 12" */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${d}`;
}

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-06-12" → "Fri" (UTC-anchored so it's TZ-stable). */
export function weekdayShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return WEEKDAYS_SHORT[new Date(Date.UTC(y, (m ?? 1) - 1, d)).getUTCDay()];
}

/** "2026-06-12" → "Friday 12 June". */
export function formatLongDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = WEEKDAYS_LONG[new Date(Date.UTC(y, (m ?? 1) - 1, d)).getUTCDay()];
  return `${wd} ${d} ${MONTHS_LONG[(m ?? 1) - 1]}`;
}

/** Kitchen station → a customer-facing category name for the breakdowns. */
export function categoryName(station?: string): string {
  switch (station) {
    case "sushi": return "Sushi & Maki";
    case "bowl": return "Poke & Bowls";
    case "hot": return "Hot dishes";
    case "grill": return "Grill";
    case "drink": return "Drinks";
    case "dessert": return "Desserts";
    default: return "Other";
  }
}

export function dirGlyph(d: Direction): string {
  return d === "up" ? "📈" : d === "down" ? "📉" : "↔️";
}

const STATION_GLYPH: Record<string, string> = {
  sushi: "🍣",
  bowl: "🥗",
  hot: "🔥",
  grill: "🍢",
  drink: "🥤",
  dessert: "🍮",
};

export function stationGlyph(station?: string): string {
  return (station && STATION_GLYPH[station]) || "•";
}

/** Map a 0–3 intensity to a status badge label + color (Lovable-style busy signal). */
export function intensityStatus(i: number): { label: string; color: string } {
  if (i >= 3) return { label: "Very busy", color: "var(--danger)" };
  if (i === 2) return { label: "Busy", color: "var(--warn)" };
  if (i === 1) return { label: "Steady", color: "var(--accent)" };
  return { label: "Quiet", color: "var(--muted)" };
}

/** Format a euro amount compactly: 1274 → "€1,274". */
export function euro(n: number): string {
  return `€${n.toLocaleString("en-US")}`;
}

/** Display-only: signed % vs a typical service, derived from intensity (mock). */
export function vsTypicalFor(intensity: number, slot: string): number {
  const base = [-15, 6, 14, 34][Math.max(0, Math.min(3, intensity))];
  return base + (slot === "dinner" ? 0 : -4);
}

/** Display-only: delivery share %, derived from covers (mock). */
export function deliveryFor(covers: number): number {
  return 40 + (covers % 23);
}

/** A signed-% delta pill: arrow + color (up = warm, down = cool blue). */
export function deltaPill(n: number): { arrow: string; color: string } {
  if (n > 0) return { arrow: "↗", color: "var(--warn)" };
  if (n < 0) return { arrow: "↘", color: "#6aa9c4" };
  return { arrow: "—", color: "var(--muted)" };
}
