import { createSharedState, runSolo, runTeam } from "@weavehacks/orchestration";
import type { RunResult } from "@weavehacks/shared";
import { scenarioAgents, score } from "./scenario";

/**
 * SOLO baseline run. One agent, no roles, no verifier — last-write-wins. Ends up
 * with contradictions (the promoter's stale claims clobber the source's correct ones).
 */
export async function soloRun(): Promise<RunResult> {
  const state = await createSharedState({ namespace: "wh:solo" });
  await state.clear();
  try {
    const res = await runSolo(scenarioAgents(), {}, { state });
    const s = score(res.final);
    return { ...s, mode: "solo", final: res.final };
  } finally {
    await state.close();
  }
}

/**
 * TEAM run. Distinct roles → verifier detects conflicts → orchestrator resolves by
 * authority and escalates the sensitive record. Ends consistent with the source of truth.
 */
export async function teamRun(): Promise<RunResult> {
  const state = await createSharedState({ namespace: "wh:team" });
  await state.clear();
  try {
    const res = await runTeam(scenarioAgents(), {}, { state });
    const escalatedKeys = res.escalations.map((e) => e.key);
    const s = score(res.final, escalatedKeys);
    return {
      ...s,
      mode: "team",
      final: res.final,
      conflicts: res.conflicts.length,
      resolutions: res.resolutions,
      escalations: res.escalations,
    };
  } finally {
    await state.close();
  }
}
