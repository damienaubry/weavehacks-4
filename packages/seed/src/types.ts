import type { MenuItem } from "@weavehacks/truth";

/** A single POS order line (flattened for the demo). */
export interface Order {
  /** ISO date (YYYY-MM-DD) */
  date: string;
  /** 0=Sun … 6=Sat (denormalized for fast "last 8 Fridays" queries) */
  dow: number;
  /** local hour 0–23 */
  hour: number;
  /** menu item id (see @weavehacks/truth) */
  itemId: MenuItem["id"];
  qty: number;
}

export interface Review {
  id: string;
  /** 1–5 stars */
  stars: number;
  text: string;
  /** menu item ids this review mentions — agents cite these */
  mentions: MenuItem["id"][];
}

export interface WeatherDay {
  /** ISO date */
  date: string;
  condition: "clear" | "cloud" | "rain";
  /** temperature in °C */
  tempC: number;
}

/** A sports fixture relevant to demand near the restaurant. */
export interface Fixture {
  /** ISO date */
  date: string;
  competition: string; // e.g. "Ligue 1", "Champions League", "Six Nations"
  match: string; // e.g. "PSG vs Marseille"
  /** local kickoff "HH:MM" */
  kickoff: string;
  /** 1 (minor) … 5 (huge — derby/final/Les Bleus) */
  importance: number;
}

export interface Holiday {
  /** ISO date */
  date: string;
  name: string;
  kind: "public" | "school";
}

export interface LocalEvent {
  /** ISO date */
  date: string;
  name: string;
  kind: "concert" | "strike" | "market" | "sport" | "other";
  /** rough expected effect on demand */
  effect: "boost" | "suppress";
}
