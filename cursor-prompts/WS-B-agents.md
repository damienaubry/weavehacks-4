# WS-B — Agents & Tools (the Curator→Analyst→Writer→Verifier pipeline)

One of six parallel workstreams for the **Grounded Recovery Copilot**. Read `CLAUDE.md` and
`cursor-prompts/00-launch-order.md` first. Phase 0 contracts are frozen.

## Your job

Implement the 4-role hero pipeline that turns ONE `RecoveryCase` into a `RecoveryOutput`, in three
variants (`solo`, `team`, `team+memory`) — same model + tools, only orchestration differs.

## Files you OWN (touch only these)

- `packages/agents/src/recovery-stations.ts`  ← the 4 producers on `runToolAgent` (new)
- `packages/agents/src/recovery-pipeline.ts`  ← `runRecoveryCase(case, variant, models)` (new)
- `packages/agents/src/tools/policy.ts`        ← `policy_lookup` tool reading `@weavehacks/truth` POLICY (new)
- `packages/agents/src/tools/index.ts`         ← export the new tool
- `packages/agents/src/index.ts`               ← export the new pipeline entry
- `packages/agents/src/roles.ts`               ← only if a conflict line needs tightening (keep guard green)

Do NOT touch `grounding.ts`'s `checkGrounding` internals (that's the headline checker, WS-C extends
it), the dataset (WS-A), the eval harness (WS-C), or the spine.

## What to build

1. **Four stations** (table in CLAUDE.md → ROSTER), each a `runToolAgent` config:
   - `curator` — pulls ONLY authorized sources (review text, aggregated POS window via `history.ts`
     tools, `get_menu`, `policy_lookup`). Emits the authorized evidence set.
   - `analyst` — infers `incidentType` (triage) + builds the cited atomic-fact **ledger**.
   - `writer` — drafts `publicReply` + `ticket` FROM THE LEDGER ONLY → a `RecoveryOutput`.
   - `verifier` — challenges: unsupported claim? policy breach? over-promise? Reuse the
     "produce → mechanical critic feedback → ONE rewrite" loop and the `Budget`/parity helpers from
     `grounding.ts` (import, don't duplicate).
2. **`runRecoveryCase(case, variant, models)`**:
   - `solo` — ONE agent (same model + tools) that curates+analyses+writes+**self-revises** N times,
     NO independent Verifier. The strong, compute-matched baseline (reuse `selfRetry`).
   - `team` — the 4 stations; Verifier blocks ≤1 rewrite; parity-matched to solo.
   - `team+memory` — `team` + memory hooks: before writing, `retrieveFailureCards({text, tags})`;
     after a Verifier block, `writeFailureCard(...)`. (Both already exported from `@weavehacks/agents`.)
   - Returns a `RecoveryOutput` + the captured `toolCalls` + a `Budget` (WS-C scores from these).
3. **`policy_lookup` tool** — Weave-traced (`traced(...)`), reads `truth`'s `POLICY`.

## Constraints

- Same base model + tools across all three variants; only orchestration differs.
- Every tool call is a Weave op (use `traced`). Producer prompts must NOT say "never invent" —
  grounding is the Verifier's job, that's the whole point.
- `assertEveryRoleHasConflict()` stays green; max 4 LLM roles.
- `pnpm typecheck` green.

## Done when

- [ ] `runRecoveryCase` produces a valid `RecoveryOutput` for each variant on `RECOVERY_CASES`.
- [ ] Verifier genuinely blocks ungrounded / over-promising drafts and drives one rewrite.
- [ ] Budgets captured; solo path can be made ≥ team budget (parity).
- [ ] WS-C can import your pipeline and score it without touching agents internals.
