/**
 * Frontend contract for the Brigade demo + the data fetchers.
 *
 * These types MIRROR what the backend already exports from @weavehacks/agents
 * (`DiscussionResult` / `DiscussionTurn`) and @weavehacks/api (`/compare`). The web app owns
 * NOTHING in the backend — it only consumes these shapes over HTTP.
 *
 * `GET /prep?date=` does not exist yet (backend owner adds it). Until it does, `fetchDiscussion`
 * transparently falls back to a local mock so the whole UI is buildable in isolation.
 */
import { MOCK_DISCUSSION } from "./mock-discussion";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ── Discussion (Friday-prep turn) — mirrors @weavehacks/agents ───────────────────────────────
export interface ToolCall {
  name: string;
  args: unknown;
}
export interface DiscussionTurn {
  speaker: string;
  /** who the turn is addressed to / its purpose */
  note: string;
  text: string;
  toolCalls: ToolCall[];
}
export interface DiscussionResult {
  date: string;
  weekday: string;
  turns: DiscussionTurn[];
  prepSheet: string;
  presentation: string;
}

// ── Scoreboard — mirrors @weavehacks/api /compare ────────────────────────────────────────────
export interface Resolution {
  key: string;
  status: "resolved" | "escalated";
  value?: string;
  winner?: string;
  reason?: string;
}
export interface RunDetail {
  score: number;
  correct: number;
  total: number;
  breakdown: Record<string, string>;
  conflicts?: number;
  resolutions?: Resolution[];
}
export interface Scoreboard {
  name: string;
  solo: number;
  team: number;
  delta: number;
  soloDetail?: RunDetail;
  teamDetail?: RunDetail;
}

export interface DiscussionFetch {
  result: DiscussionResult;
  /** true when served from the local mock (backend /prep not wired yet) */
  mocked: boolean;
}

/** Try the real `/prep` endpoint; fall back to the mock so the UI works standalone. */
export async function fetchDiscussion(date?: string): Promise<DiscussionFetch> {
  try {
    const res = await fetch(`${API}/prep${date ? `?date=${encodeURIComponent(date)}` : ""}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return { result: (await res.json()) as DiscussionResult, mocked: false };
  } catch {
    return { result: MOCK_DISCUSSION, mocked: true };
  }
}

export async function fetchScoreboard(): Promise<Scoreboard> {
  const res = await fetch(`${API}/compare`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return (await res.json()) as Scoreboard;
}
