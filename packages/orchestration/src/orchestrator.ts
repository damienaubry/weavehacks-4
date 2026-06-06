import { detectConflicts, resolveConflict } from "./conflict";
import { createMemoryState } from "./state";
import type { Agent, Claim, Conflict, Resolution, SharedState, SoloResult, TeamResult } from "./types";

export interface RunOptions {
  state?: SharedState;
  /**
   * Conflict detector. Defaults to the structural one; a project can pass a
   * SEMANTIC verifier (validates that values make sense, not just "did it run").
   */
  detect?: (claims: Claim[]) => Conflict[];
  onResolution?: (r: Resolution) => void;
}

async function gather(agents: Agent[], input: unknown, state: SharedState): Promise<Claim[]> {
  const all: Claim[] = [];
  for (const a of agents) {
    const claims = await a.act(input, state);
    all.push(...claims);
    await state.publish("agent:claims", JSON.stringify({ role: a.role.id, claims }));
  }
  return all;
}

/**
 * SOLO baseline: one undifferentiated agent, no roles, no verifier, no conflict
 * resolution. Applies every claim in arrival order — last write wins — and blindly
 * auto-applies sensitive changes. This is the mode that visibly FAILS on contradictions.
 */
export async function runSolo(
  agents: Agent[],
  input: unknown,
  opts: RunOptions = {},
): Promise<SoloResult> {
  const state = opts.state ?? createMemoryState();
  const claims = await gather(agents, input, state);
  for (const c of claims) await state.set(c.key, c.value); // naive last-write-wins
  return { final: await state.all(), claims };
}

/**
 * TEAM: agents with distinct roles → a verifier detects conflicts → the orchestrator
 * resolves them (closest-to-source wins; sensitive changes escalate to a human).
 * Non-conflicting claims apply directly; escalated keys are deliberately NOT written.
 */
export async function runTeam(
  agents: Agent[],
  input: unknown,
  opts: RunOptions = {},
): Promise<TeamResult> {
  const state = opts.state ?? createMemoryState();
  const detect = opts.detect ?? detectConflicts;

  const claims = await gather(agents, input, state);
  const conflicts = detect(claims);
  const conflictKeys = new Set(conflicts.map((c) => c.key));

  // 1. apply agreed (non-conflicting) claims
  for (const c of claims) {
    if (!conflictKeys.has(c.key)) await state.set(c.key, c.value);
  }

  // 2. resolve each conflict
  const resolutions: Resolution[] = [];
  const escalations: Array<Extract<Resolution, { status: "escalated" }>> = [];
  for (const conf of conflicts) {
    const r = resolveConflict(conf);
    resolutions.push(r);
    opts.onResolution?.(r);
    if (r.status === "resolved") {
      await state.set(r.key, r.value);
    } else {
      escalations.push(r);
      await state.publish("agent:escalation", JSON.stringify(r));
    }
  }

  return { final: await state.all(), conflicts, resolutions, escalations };
}
