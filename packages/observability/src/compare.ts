import type { RunResult, Scoreboard } from "@weavehacks/shared";
import { initWeave, traced } from "./weave";

export interface CompareConfig {
  /** scenario name (shows up in Weave) */
  name: string;
  /** run the SOLO baseline; returns a RunResult with a `score` in [0,1] */
  solo: () => Promise<RunResult> | RunResult;
  /** run the AGENT TEAM; returns a RunResult with a `score` in [0,1] */
  team: () => Promise<RunResult> | RunResult;
}

/**
 * The scoreboard. Runs the SAME scenario through a solo-agent baseline and an
 * agent team, traces both in Weave, and reports the numeric difference. This is
 * the harness that has to stay runnable at all times — it's the proof the whole
 * project is judged on ("solo scores X, team scores Y").
 */
export async function compareSoloVsTeam(cfg: CompareConfig): Promise<Scoreboard> {
  await initWeave();

  const runSolo = traced(`${cfg.name}.solo`, async () => cfg.solo());
  const runTeam = traced(`${cfg.name}.team`, async () => cfg.team());

  const soloRes = await runSolo();
  const teamRes = await runTeam();

  const board: Scoreboard = {
    name: cfg.name,
    solo: soloRes.score,
    team: teamRes.score,
    delta: teamRes.score - soloRes.score,
    soloDetail: soloRes,
    teamDetail: teamRes,
  };

  // Log the scoreboard itself as a traced op so the comparison is visible in Weave.
  await traced(`${cfg.name}.scoreboard`, async (b: Scoreboard) => b)(board);
  return board;
}
