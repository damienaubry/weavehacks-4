/**
 * Shared, domain-agnostic types. NOTHING restaurant-specific (menu/dish/surface)
 * belongs here — domain types live in packages/agents|truth|seed.
 */

/** A numeric scoreboard from a solo-vs-team comparison run. */
export interface Scoreboard {
  /** scenario name */
  name: string;
  /** solo-agent score in [0,1] */
  solo: number;
  /** agent-team score in [0,1] */
  team: number;
  /** team − solo (the number the demo is built around) */
  delta: number;
  soloDetail?: unknown;
  teamDetail?: unknown;
}

/** Result of running a single mode (solo or team) of a scenario. */
export interface RunResult {
  /** normalized score in [0,1] */
  score: number;
  [key: string]: unknown;
}

export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
