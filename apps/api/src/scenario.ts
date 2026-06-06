import type { Agent, Claim } from "@weavehacks/orchestration";

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISTIC STAND-IN SCENARIO — domain-agnostic on purpose.
//
// It exists so the solo-vs-team SCOREBOARD is green from minute one and demonstrates
// the judged thesis without spending a credit: generic agents make conflicting claims
// about generic `record_*` keys; a solo agent applies them blindly (last-write-wins)
// and ends up WRONG, while the team detects the contradiction, resolves by authority,
// and escalates the sensitive one to a human.
//
// SWAP THIS for Brigade's real scoreboard — the Content → Critic hero loop (solo
// writes an ungrounded post ≈5/10; the team grounds it in POS/reviews ≈8.5/10). The
// harness stays identical; only this file changes. Keep restaurant nouns OUT of the
// orchestration/observability core; they belong in packages/agents|truth|seed.
// ─────────────────────────────────────────────────────────────────────────────

/** The single source of truth this scenario is scored against. */
export const TRUTH: Record<string, string> = {
  record_1: "available",
  record_2: "12",
  record_3: "open",
  record_4: "in_stock", // a SENSITIVE record (stand-in for a money/reputation/irreversible change)
  record_5: "active",
};

/** Which records are sensitive (must escalate, never auto-apply). */
const SENSITIVE = new Set(["record_4"]);

// Generic roles. Higher authority = closer to the source of truth.
const SOURCE = { id: "source", name: "source-of-truth agent", authority: 100 };
const SECONDARY = { id: "secondary", name: "secondary agent", authority: 50 };
const PROMOTER = { id: "promoter", name: "promoter agent", authority: 10 };

function claim(key: string, value: string, role: { id: string; authority: number }): Claim {
  return { key, value, role: role.id, authority: role.authority, sensitive: SENSITIVE.has(key) };
}

/** Authoritative, correct claims. */
function sourceAgent(): Agent {
  return {
    role: SOURCE,
    act: () => [
      claim("record_1", "available", SOURCE),
      claim("record_2", "12", SOURCE),
      claim("record_4", "in_stock", SOURCE),
    ],
  };
}

/** Correct, non-conflicting claims about other records. */
function secondaryAgent(): Agent {
  return {
    role: SECONDARY,
    act: () => [claim("record_3", "open", SECONDARY), claim("record_5", "active", SECONDARY)],
  };
}

/**
 * Well-meaning but WRONG/stale, and it speaks LAST — the last-write-wins trap that
 * a solo agent falls into. record_1 contradicts the source; record_4 contradicts
 * the source AND is sensitive (a solo agent would auto-apply it; the team escalates).
 */
function promoterAgent(): Agent {
  return {
    role: PROMOTER,
    act: () => [
      claim("record_1", "sold_out_promo", PROMOTER),
      claim("record_4", "discounted", PROMOTER),
    ],
  };
}

export function scenarioAgents(): Agent[] {
  return [sourceAgent(), secondaryAgent(), promoterAgent()];
}

export interface ScoreDetail {
  score: number;
  correct: number;
  total: number;
  breakdown: Record<string, string>;
}

/**
 * Score a final state against TRUTH.
 *   correct value            → +1
 *   correctly escalated key  → +1 (the sensitive change was NOT auto-applied wrong)
 *   wrong / missing value    → 0
 */
export function score(final: Record<string, string>, escalatedKeys: string[] = []): ScoreDetail {
  const keys = Object.keys(TRUTH);
  const breakdown: Record<string, string> = {};
  let correct = 0;
  for (const k of keys) {
    if (escalatedKeys.includes(k)) {
      correct++;
      breakdown[k] = "escalated → human (correct: not auto-applied)";
      continue;
    }
    if (final[k] === TRUTH[k]) {
      correct++;
      breakdown[k] = `correct (${final[k]})`;
    } else {
      breakdown[k] = `WRONG (got '${final[k] ?? "∅"}', truth '${TRUTH[k]}')`;
    }
  }
  return { score: correct / keys.length, correct, total: keys.length, breakdown };
}
