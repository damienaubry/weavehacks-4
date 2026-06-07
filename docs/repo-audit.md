# Repo audit — package map + legacy-vs-hero split

**Scope:** every source file under `packages/*` and `apps/*`. READ-ONLY map of what each file is and
whether it's on the **hero** path (the Grounded Recovery Copilot / GRPR), the **legacy** path (kept
runnable, not judged), or the **spine** (domain-agnostic, reused by both).

**Direction reference (current):** the judged headline is the **GRPR — Grounded Recovery Pass Rate**
(mechanical, conjunctive, over a dataset of review cases; `solo` < `team` < `team+memory`, same base
model + tools, only the Verifier/memory differ). See `CLAUDE.md` → **RESOLVED 2026-06-07-bis**. This
**supersedes** the earlier "grounding-rate-on-a-marketing-post" (2026-06-07) and "forecast-accuracy"
headlines — both demoted; their machinery is kept and re-pointed (the GRPR's grounding sub-score reuses
`checkGrounding`), not deleted.

**Baseline:** `pnpm typecheck` is green across the integrated tree (the standing gate). `pnpm prep`
and `pnpm grounding` (legacy) still run.

---

## TL;DR — the three layers

- **Spine** (`orchestration`, `observability`, `runtime`, `shared`): domain-agnostic, fully live. No
  restaurant/review nouns leak in. The recovery harness reuses it unchanged.
- **Domain** (`agents`, `truth`, `seed`, `memory`): Brigade-specific. Both the legacy teams and the
  **recovery hero pipeline** are live and wired end-to-end (four stations → mechanical Verifier →
  GRPR scorer → failure-card memory).
- **Apps** (`api`, `web`): `api` serves `/recovery` from the **real harness**; `web` renders the
  `/recovery` GRPR view (leaderboard + drill-down + HITL) on CopilotKit alongside the legacy pages.

> **The one remaining gap is dataset content**, not code: the recovery dataset is **12 clearly-marked
> synthetic cases (0 real)** today; the operator loads the real Google reviews to hit the
> "majority `source:"real"`" target. Menu/prices/hours and the policy limits are demo-plausible
> placeholders pending operator validation (the SHAPE is locked).

---

## Layer 1 — Spine (domain-agnostic, reusable)

### `packages/orchestration` — the proof engine

| File | Role | What |
| --- | --- | --- |
| `orchestrator.ts` | spine | `runSolo` (apply claims in order, last-write-wins — the failing baseline) + `runTeam` (gather → `detectConflicts` → resolve by authority → escalate `sensitive` to human). |
| `conflict.ts` | spine | `detectConflicts` (≥2 distinct values for a key) + `resolveConflict` (highest authority wins; sensitive → escalate). Pure. |
| `state.ts` | spine | `SharedState` — Redis-backed with automatic in-memory fallback. |
| `types.ts` | spine | `Agent` / `AgentRole` / `Claim` / `Conflict` / `Resolution`. |

> The orchestrator resolves conflicts by authority but does **not** itself model a producer↔verifier
> rewrite loop — that iteration is composed in the recovery pipeline. CLAUDE.md's "the Verifier-rewrite
> loop is modeled here generically" overstates this slightly.

### `packages/observability` — Weave wrapper + scoreboard

| File | Role | What |
| --- | --- | --- |
| `weave.ts` | spine | `initWeave` / `traced` / `isWeaveActive`. **No-op without `WANDB_API_KEY`**. |
| `compare.ts` | spine | `compareSoloVsTeam` — the **legacy** numeric scoreboard (`/compare`). The recovery harness calls `traced()` directly per case/score (`recovery.case` / `recovery.score`); GRPR ≠ the legacy `Scoreboard` shape. |

### `packages/runtime` — inference

| File | Role | What |
| --- | --- | --- |
| `providers.ts` | spine | `getProviders` / `defaultProvider` (**wandb** default, **openai** fallback) / `providerForRole`. Default models: W&B Inference `zai-org/GLM-5.1`, OpenAI `gpt-4o-mini`. |
| `tools.ts` | spine | `runToolAgent` — the tool-calling loop the agents run on; tracks token usage + llmCalls. |
| `client.ts` | spine | OpenAI-compatible chat client + `describeRuntime` + `generate`/`reason`. |
| `agents.ts` | spine | OpenAI Agents SDK path (SDK tracing disabled — we trace with Weave). |
| `json.ts` | spine | `parseJsonLoose`. |

### `packages/shared`

| File | Role | What |
| --- | --- | --- |
| `redis.ts` · `env.ts` · `types.ts` | spine | `createRedis`, `loadRootEnv`, domain-agnostic `Scoreboard` / `RunResult` / `Json`. **No review/recovery/menu types** — confirmed clean. |

---

## Layer 2 — Domain (Brigade)

### `packages/agents` — the roster, tools, grounding, recovery pipeline

| File | Role | State |
| --- | --- | --- |
| `roles.ts` | manifest | **live** — 13 roles as data. Hero recovery tier: `curator` (55), `analyst` (58), `writer` (30, sensitive→HITL), `verifier` (90). `assertEveryRoleHasConflict()` rejects decorative agents. |
| `recovery-stations.ts` | hero | **live (WS-B)** — `runCurator`/`runAnalyst`/`runWriter`/`runReviser`/`runSolo`/`runSoloRevise` on `runToolAgent` (op `agent.recovery.<id>`); `verifyRecovery` (MECHANICAL: `checkGrounding` ∧ `checkPolicy` ∧ ticket); `buildRecoveryCritic`; `ledgerToClaims`; coercers; `RECOVERY_TOOLS`; `INCIDENT_TYPES`. |
| `recovery-pipeline.ts` | hero | **live (WS-B)** — `runRecoveryCase(case, variant, models)` drives `solo` / `team` / `team+memory` (same model+tools; `disableVerifier` kill-shot; `DEFAULT_SOLO_RETRIES=3` parity). One traced `recovery.case` op; returns `draftV1`/`verdictV1`/`verdictFinal`/`memoryUsed`/`budget`. |
| `recovery-score.ts` | hero | **live (WS-C)** — `scoreCase` (conjunctive GRPR), `runRecoveryHarness` (3 variants over the dataset, budgeted, traced, with the `HonestComparison` guard), `buildRecoveryReport`, `judgeOverPromise` (opt-in narrow over-promise judge). |
| `grounding.ts` | hero machine (reused) | **live** — `checkGrounding` (the mechanical claim checker the GRPR reuses) + `runGroundingScenario` + `CONTENT_PRODUCER`/`PREP_PRODUCER`. Drives legacy `pnpm grounding`. |
| `recovery-contract.ts` | hero contract | **live** — types: `RecoveryVariant`, `RecoveryOutput`, `CaseScore`, `RecoveryRunResult`, `RecoveryReport`. |
| `memory.ts` | re-export | **live** — re-exports `@weavehacks/memory` (`writeFailureCard`/`retrieveFailureCards`/`__resetMemory`/`FailureCard`/`RetrieveQuery`) so the agents barrel keeps one import surface. |
| `tools/policy.ts` | hero tool | **live (WS-B)** — `policyLookupTool` / `POLICY_TOOLS` (`policy_lookup`, reads `truth` policy canon). |
| `tools/reviews.ts` | shared tools | **live** — `review_stats` / `get_reviews` (Curator reuses these). |
| `tools/realtime.ts` · `tools/history.ts` · `tools/analytics.ts` | legacy/shared tools | **live** — `get_menu`, the four Scout signals, POS analytics (read seed `ORDERS`). |
| `stations.ts` · `discussion.ts` | legacy | **live** — the 4 legacy stations + `runFridayPrep` (`pnpm prep`). |
| `prep.ts` | legacy (secondary) | **live** — `naiveForecast` / `contextForecast` / `backtest`. The demoted forecast number; don't expand. |

### `packages/truth` — CANON

| File | State |
| --- | --- |
| `index.ts` | **live** — `TRUTH` (menu/prices/hours) + `menuItem` / `isGroundedPrice`; re-exports `./policy`. |
| `policy.ts` | **live (WS-A)** — the **policy canon**: `POLICY` (`gesture.maxCreditPct=15`, `maxGestureEuros=10`, `forbiddenGestures=[free_meal, full_refund, cash_refund, unlimited_free_delivery]`, disclosures, forbidden claims) + the mechanical detectors `replyHasDisclosure` / `replyHasForbiddenClaim` (shared verbatim by the Verifier and the scorer). Placeholder VALUES, operator-validated. |

### `packages/seed` — curated demo slice (DERIVED, not canon)

| File | State |
| --- | --- |
| `recovery-types.ts` | **live** — `IncidentType` (9 values), `RecoveryCase`, `CaseContext`. |
| `recovery-cases.ts` | **live** — `RECOVERY_CASES` loaded from `data/recovery-cases.json` (override `RECOVERY_CASES_PATH`); tolerant per-case shape check; `INCIDENT_TYPES`; `checkCaseShape`/`extractRawCases`. |
| `data/recovery-cases.json` | **live (content placeholder)** — **12 synthetic cases, 0 real**, covering all 9 incident types (delivery_late ×2, food_quality ×2, praise_no_issue ×2, the rest ×1). Operator appends real cases. |
| `validate-cases.ts` | **live (WS-A)** — `pnpm --filter @weavehacks/seed validate-cases`: strict gate that resolves every gold tag against `truth` POLICY + reports the distribution. |
| `pos.ts` (+ `data/pos.json`) | **live** — real 3-year Hiboutik POS contract + `loadServiceRecords`/`splitTrainHoldout`. |
| `orders.ts` | **live (stale-ish)** — `ORDERS`, a hand-authored nightly slice powering the live `pnpm prep`. Parallels `pos.json`; migrate analytics tools to `pos.ts`, then retire. |
| `weather.ts` · `fixtures.ts` · `holidays.ts` · `events.ts` · `reviews.ts` | **live** — Scout signals + the review grounding source. |

### `packages/memory` — `@weavehacks/memory` (Layer-2 failure-card store)

| File | State |
| --- | --- |
| `failure-cards.ts` | **live (WS-D)** — `writeFailureCard` / `retrieveFailureCards` / `__resetMemory` / `resetMemoryAsync` / `describeMemory` + `FailureCard` / `RetrieveQuery`. |
| `store.ts` | **live** — `FailureCardStore` / `getStore` / `replaceStore`. Redis vector search (RediSearch FT.SEARCH KNN) → portable cosine over plain Redis → in-memory mirror when Redis is down. |
| `split.ts` | **live** — `chronologicalSplit` / `auditLeakage` / `assertNoLeakage` / `assessMemoryLift` (the no-leakage + honesty guards for the third leaderboard row). |
| `embeddings.ts` | **live** — `embed` / `cosine` / `embedderInfo` / `__resetEmbeddings`. |

> Depends only on the spine (`observability`/`runtime`/`shared`) — no restaurant nouns. `packages/agents`
> depends on `@weavehacks/memory`; `packages/agents/src/memory.ts` re-exports it.

---

## Layer 3 — Apps

### `apps/api` — orchestration runtime entrypoint

HTTP routes (`index.ts`): `GET /` (info) · `/health` · `/compare` · `/recovery`.

| File | Role | State |
| --- | --- | --- |
| `recovery.ts` | hero | **live (WS-C wired)** — `runRecovery()` runs `runRecoveryHarness` + `buildRecoveryReport` (real numbers). CLI: `pnpm recovery [--no-verifier] [--judge]`, `RECOVERY_MODEL=<id>`; prints rows + parity guard + honesty note + the solo-fail/team-pass sample case. |
| `index.ts` · `health.ts` | spine/support | **live** — HTTP server + `pnpm health`. |
| `compare.ts` · `runners.ts` · `scenario.ts` · `baseline.ts` · `demo.ts` | legacy | **live** — the stand-in solo-vs-team scoreboard + narrated demo. |
| `grounding.ts` | legacy hero | **live** — `pnpm grounding` (the real mechanical grounding eval). |
| `prep.ts` | legacy | **live** — `pnpm prep`. |
| `forecast.ts` | legacy (secondary) | **live** — `pnpm --filter @weavehacks/api forecast`. Not aliased at root. |
| `seed.ts` · `ask.ts` · `models.ts` · `agent-check.ts` · `tool-check.ts` | support | **live** — seed validation, one-off prompt, model listing, smoke tests. `models`/`agent:check`/`tool:check` are api-package scripts, not root aliases. |

### `apps/web` — dashboard (CopilotKit deps live: `@copilotkit/react-core`/`react-ui`/`runtime` + `openai`)

| Route / area | State |
| --- | --- |
| `app/recovery/page.tsx` + `CopilotLayer.tsx` | **live (WS-E)** — the GRPR view: leaderboard + agent theater + case drill-down (solo fail vs team pass + memory reuse) + HITL approve/reject, wrapped in CopilotKit. |
| `app/api/copilotkit/route.ts` | **live** — the CopilotKit runtime endpoint (front-end only). |
| `/` (`page.tsx`, OwnerHome) · `/brigade` | **live (legacy)** — week-ahead prep board + agent discussion/scoreboard. |

---

## Commands (where each lives)

Root aliases (`package.json`): `dev` `build` `lint` `typecheck` `seed` `health` `recovery` `prep`
`grounding` `compare` `baseline` `demo` `ask` `format`. Package-only scripts (run via
`pnpm --filter @weavehacks/<pkg> <name>`): `forecast` `models` `agent:check` `tool:check` (api),
`validate-cases` (seed). The recovery kill-shot is `pnpm recovery --no-verifier`.

---

## Notes & risks

- **Dataset content is the live gap.** 12 synthetic cases, 0 real today — the harness + UI run
  end-to-end, but "grounded in real reviews" needs the operator's real cases (majority `source:"real"`).
  `validate-cases` is the gate that keeps gold labels resolving to the shared POLICY vocabulary.
- **Placeholder canon values.** `truth` menu/prices/hours and the `POLICY` gesture limits are
  demo-plausible, operator-validated — the shape is locked, the values are swappable.
- **GRPR numbers are live.** `pnpm recovery` runs real LLM agents (needs a runtime key, spends
  credits) and produces the rows fresh — there are no baked-in numbers, and the parity guard +
  honesty note keep the result honest.
- **Two data sources.** `ORDERS` (curated, powers live `pnpm prep`) vs the real `pos.json`. Migrate
  the analytics tools to `pos.ts`, then retire `ORDERS`.
- **Spine purity.** `orchestration`/`observability`/`runtime`/`shared` (and `@weavehacks/memory`) stay
  free of restaurant/review nouns — verified clean. Recovery types live in domain packages.
