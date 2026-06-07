# WS-D — Memory (Layer 2: failure-cards + Redis vector search)

One of six parallel workstreams for the **Grounded Recovery Copilot**. Read `CLAUDE.md` and
`cursor-prompts/00-launch-order.md` first. You build the third leaderboard row, honestly.

## Your job

Promote the Phase-0 in-memory stub (`packages/agents/src/memory.ts`) to a real **Redis
vector-search** store of failure-cards, add the **chronological eval split**, and keep the function
signatures stable so WS-B's `team+memory` keeps compiling.

## Files you OWN (touch only these)

- `packages/memory/` (new package: `package.json`, `tsconfig.json`, `src/index.ts`,
  `src/failure-cards.ts`) — mirror `packages/shared`'s config; depend on `@weavehacks/shared`
  (`createRedis`) and `@weavehacks/observability` (`traced`).
- `packages/agents/src/memory.ts` — re-export from `@weavehacks/memory` (keep the SAME exported
  names: `writeFailureCard`, `retrieveFailureCards`, `FailureCard`, `RetrieveQuery`, `__resetMemory`),
  so nothing downstream changes.
- `packages/agents/package.json` — add the `@weavehacks/memory` workspace dep.
- After creating the package, run `pnpm install` so the workspace links it.

Do NOT change the agent pipeline (WS-B) or the scorer (WS-C) — just keep their imports working.

## What to build

1. **Failure-card store on Redis** (see `.agents/skills/redis-vector-search`): index each
   `FailureCard` with an embedding + tag metadata. `retrieveFailureCards({text, tags, k})` =
   embedding similarity + tag filter (hybrid). `writeFailureCard` persists + indexes. **In-memory
   fallback** when Redis is unavailable (mirror `SharedState`), so the demo never hard-fails.
2. **Chronological eval split** — a helper WS-C/the harness calls: the first K cases (by date/order)
   WARM the memory (write cards on failures), the remaining cases TEST it. The memory only ever
   writes failure-cards/validated patches — never the held-out labels. This is the anti-leakage story.
3. **Honest guard (required):** expose whether `team+memory` actually beats `team` on the held-out
   split. If it doesn't beat it cleanly, the harness (WS-C) reports that and falls back to the
   within-session v1→v2 beat. Make that easy to read — do NOT inflate.

## Constraints

- Keep the exported signatures identical to the Phase-0 stub (downstream depends on them).
- Embeddings via the configured runtime (W&B Inference / OpenAI) — budget-aware, this is runtime
  credit; keep it cheap.
- `pnpm typecheck` green after adding the package (run `pnpm install` first).

## Done when

- [ ] `packages/memory` exists, Redis-backed with in-memory fallback, typechecks.
- [ ] `team+memory` retrieves relevant cards by similarity + tag and avoids repeating a flagged
      over-promise.
- [ ] Chronological split implemented; no test case leaks into memory.
- [ ] The honest team-vs-team+memory comparison is exposed for WS-C to report.
