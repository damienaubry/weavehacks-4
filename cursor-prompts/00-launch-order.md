# Cursor — launch order for the parallel pivot

Phase 0 (the socle) is **already done and committed**: contracts, types, role manifest, the
`memory.ts` stub, the `recovery.ts` placeholder + `/recovery` route + `pnpm recovery`, the rewritten
`CLAUDE.md`, and the docs. `pnpm typecheck` is green. So every chat below codes against **frozen
contracts** — they won't collide.

**Before launching:** `git pull` so each chat starts from the committed socle. Each workstream owns
a disjoint set of files (listed in its prompt). Give each its own branch / git worktree.

## Order

```
Launch IN PARALLEL (one Claude chat each):
   WS-A  Data & Truth          (cursor-prompts/WS-A-data.md)
   WS-B  Agents & Tools        (cursor-prompts/WS-B-agents.md)
   WS-C  Eval & GRPR harness   (cursor-prompts/WS-C-eval.md)
   WS-D  Memory (Layer 2)      (cursor-prompts/WS-D-memory.md)
   WS-E  Front-end (CopilotKit)(cursor-prompts/WS-E-frontend.md)
   WS-F  Docs & narrative      (cursor-prompts/WS-F-docs.md)

Merge order:  A → B → D → C → E → F
Then run Phase 2 (integration + adversarial check) — see WS-C's final section.
```

## Hard rules every chat must obey (full list in CLAUDE.md → RULES)

1. Spine stays domain-agnostic & intact: do NOT change `packages/orchestration`,
   `packages/observability`, `packages/runtime` except additively. No restaurant/review nouns there.
2. Mechanical, not LLM judge, for the headline: grounding via `checkGrounding`; triage/ticket
   deterministic; policy = rules + a narrow over-promise judge only.
3. Compute parity: solo budget ≥ team budget; reuse the `Budget` + guards in `grounding.ts`.
4. Keep the guards honest (BUILD / HONESTY / PARITY). Report the real result.
5. No fabricated data as truth. Dataset majority `source:"real"`; mark synthetic clearly.
6. HITL on the public reply + ticket. Nothing auto-publishes.
7. `pnpm typecheck` must stay green after your workstream. Legacy `pnpm prep` / `pnpm grounding`
   must keep running. Add, don't break.
8. Max 4 LLM roles in the hero pipeline; `assertEveryRoleHasConflict()` stays green.

## The frozen Phase-0 contracts (import these, don't redefine)

- `@weavehacks/seed` → `RecoveryCase`, `IncidentType`, `RECOVERY_CASES`
- `@weavehacks/agents` → `RecoveryOutput`, `CaseScore`, `RecoveryRunResult`, `RecoveryReport`,
  `RecoveryVariant`, `checkGrounding`, `Claim`, `ClaimCheck`, `Budget`,
  `writeFailureCard`, `retrieveFailureCards`, `FailureCard`, `AGENT_ROLES`
- API: `apps/api/src/recovery.ts` exports `runRecovery(): Promise<RecoveryReport>` (placeholder),
  served at `GET /recovery`, run by `pnpm recovery`.

Master reference with full rationale: `cowork-pivot-brief.md`. Read `CLAUDE.md` first.
