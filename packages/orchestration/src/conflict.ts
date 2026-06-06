import type { Claim, Conflict, Resolution } from "./types";

/**
 * Detect conflicts: keys for which agents asserted MORE THAN ONE distinct value.
 * A verifier-type role should ultimately validate SEMANTICALLY (does the value make
 * sense?), not merely structurally — this is the structural baseline both modes share.
 */
export function detectConflicts(claims: Claim[]): Conflict[] {
  const byKey = new Map<string, Claim[]>();
  for (const c of claims) {
    const list = byKey.get(c.key) ?? [];
    list.push(c);
    byKey.set(c.key, list);
  }
  const conflicts: Conflict[] = [];
  for (const [key, list] of byKey) {
    const distinct = new Set(list.map((c) => c.value));
    if (distinct.size > 1) conflicts.push({ key, claims: list });
  }
  return conflicts;
}

/**
 * Resolution rule (domain-agnostic):
 *   1. The claim from the agent CLOSEST TO THE SOURCE OF TRUTH (highest authority) wins.
 *   2. If the winning change is SENSITIVE (money/reputation/irreversible), it does NOT
 *      auto-apply — it ESCALATES to a human.
 */
export function resolveConflict(conflict: Conflict): Resolution {
  const sorted = [...conflict.claims].sort((a, b) => b.authority - a.authority);
  const winner = sorted[0];
  if (winner.sensitive) {
    return {
      key: conflict.key,
      status: "escalated",
      candidates: sorted,
      reason: "sensitive/irreversible change — requires human approval, not auto-applied",
    };
  }
  return {
    key: conflict.key,
    status: "resolved",
    value: winner.value,
    winner: winner.role,
    reason: `agent closest to source of truth wins (authority ${winner.authority})`,
  };
}
