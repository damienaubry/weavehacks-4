/**
 * Domain-agnostic multi-agent primitives.
 *
 * The whole point of this package: agents with DISTINCT ROLES coordinate, and
 * when their outputs CONFLICT, a resolution mechanism decides. Nothing here knows
 * about restaurants, menus, or surfaces — keep it that way. Brigade domain code
 * lives in packages/agents|truth|seed.
 */

/** A role an agent plays. Higher `authority` = closer to the source of truth. */
export interface AgentRole {
  id: string;
  name: string;
  /** authority/trust ranking; the agent closest to the source of truth wins conflicts */
  authority: number;
  description?: string;
}

/**
 * A claim an agent makes about some key in the shared state.
 * `sensitive` marks money/reputation/irreversible changes — these never auto-apply.
 */
export interface Claim {
  key: string;
  value: string;
  /** id of the role that made this claim */
  role: string;
  /** authority of the claiming role (denormalized so the resolver is pure) */
  authority: number;
  sensitive?: boolean;
}

/** A set of competing claims for the same key. */
export interface Conflict {
  key: string;
  claims: Claim[];
}

/** Outcome of resolving one conflict. */
export type Resolution =
  | { key: string; status: "resolved"; value: string; winner: string; reason: string }
  | { key: string; status: "escalated"; candidates: Claim[]; reason: string };

/** Minimal shared-state contract. Backed by Redis in real runs, memory offline. */
export interface SharedState {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  all(): Promise<Record<string, string>>;
  /** fire-and-forget pub/sub used to broadcast agent activity */
  publish(channel: string, message: string): Promise<void>;
  /** wipe this state's namespace (used to isolate runs) */
  clear(): Promise<void>;
  /** release any underlying connection */
  close(): Promise<void>;
}

/** An agent: a role plus a function that produces claims for an input. */
export interface Agent {
  role: AgentRole;
  act(input: unknown, state: SharedState): Promise<Claim[]> | Claim[];
}

export interface SoloResult {
  final: Record<string, string>;
  claims: Claim[];
}

export interface TeamResult {
  final: Record<string, string>;
  conflicts: Conflict[];
  resolutions: Resolution[];
  /** the subset of resolutions that were escalated to a human */
  escalations: Array<Extract<Resolution, { status: "escalated" }>>;
}
