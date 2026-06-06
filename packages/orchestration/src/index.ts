export { runSolo, runTeam, type RunOptions } from "./orchestrator";
export { detectConflicts, resolveConflict } from "./conflict";
export { createMemoryState, createSharedState, type SharedStateOptions } from "./state";
export type {
  Agent,
  AgentRole,
  Claim,
  Conflict,
  Resolution,
  SharedState,
  SoloResult,
  TeamResult,
} from "./types";
