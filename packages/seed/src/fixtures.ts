import type { Fixture } from "./types";

/**
 * Sports fixtures near Paris that move takeout/delivery demand. A big match = a pre-kickoff
 * takeout surge, then a dead room during the game. ⚠️ Curated demo data; replace with a real
 * fixtures feed, keep the shape.
 *
 * The target Friday (2026-06-12) has a PSG derby — the second reason it diverges from a normal
 * Friday. One historical Friday (2026-06-05) also had a match, so the pattern is learnable.
 */
export const FIXTURES: Fixture[] = [
  { date: "2026-06-05", competition: "Ligue 1", match: "PSG vs Lyon", kickoff: "21:00", importance: 4 },
  { date: "2026-06-12", competition: "Ligue 1", match: "PSG vs Marseille (Le Classique)", kickoff: "21:00", importance: 5 }, // ← target Friday: huge derby
  { date: "2026-05-23", competition: "Six Nations (replay)", match: "France vs England", kickoff: "17:45", importance: 4 },
];
