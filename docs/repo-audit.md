# Repo audit — `packages/*` + `apps/api/*`

**Scope:** every source file under `packages/*` and `apps/api/*`. `apps/web/*` is the teammate's
(Damien's) frontend — **not analyzed here**; noted only that it is fully decoupled (mock-driven,
imports **zero** `@weavehacks/*` backend packages; it merely *mirrors* the backend types in
comments).

**Method:** grep-based import-graph (`ts-prune`/`knip` are not installed — not worth pulling heavy
deps for a hackathon). READ-ONLY: nothing was deleted, moved, or edited.

**Baseline:** `pnpm typecheck` → **17/17 tasks pass (green)**. No code was changed in this task.

**Direction reference:** the locked headline is the **mechanical GROUNDING RATE** (solo vs team,
same model + tools, only the Critic differs). Forecast accuracy is the agents' **task** + a modest
**secondary** number, not the proof. See `CLAUDE.md` (RESOLVED 2026-06-07) and the memory note
`forecast-accuracy-not-thesis-proof`.

---

## TL;DR

### ✅ Safe to delete — truly dead, zero references
| File / target | Why | Status |
| --- | --- | --- |
| `packages/memory/**` (whole package: `src/index.ts` + `package.json`) | Not imported by **any** file and **not a dependency** of any package.json. It's the Layer-2/3 self-improvement stub (Redis scores / vector search / Forge log) that nothing calls. | **DELETED** — lockfile resynced, typecheck green. CLAUDE.md ARCHITECTURE updated to note the Layer-2/3 Redis substrate is to be rebuilt on `@weavehacks/shared` when Layer 2 is wired. |

> That's the *only* zero-reference file. Everything else below is either live, or referenced-but-off-direction (delete would break the harness or lose the secondary number).

### ⚠️ Revisit (do NOT blind-delete) — referenced but off-direction / stubbed
| Target | Why revisit |
| --- | --- |
| `apps/api/src/scenario.ts` (synthetic `record_*` `TRUTH`) | STALE stand-in, but currently load-bearing for `compare`/`baseline`/`demo`. Replace *in place* with the grounding eval — don't delete until that lands. |
| `packages/seed/src/orders.ts` (`ORDERS`, curated nightly slice) | Powers the **live `pnpm prep`** Historian tools, but is a *parallel* data source to the real `pos.json` (`pos.ts`). The grounding headline should check claims against the real data — migrate the analytics tools to `pos.ts`, then retire `ORDERS`. |
| Dead **exports** (files stay): `reasonAgent` (`runtime/agents.ts`), `generate` / `reason` (`runtime/client.ts`) | No callers anywhere. Public runtime API surface; harmless, but trim when touching runtime. |
| `packages/agents/src/prep.ts` (`contextForecast`, `backtest`, `naiveForecast`) | KEEP — but only for the **secondary** forecast line (`pnpm forecast`). Not the headline; don't let it grow. |

---

## Full classification

Legend: **USED (demo-critical)** = on the hero/demo path · **USED (support)** = utility/infra ·
**DEAD** = zero refs · **STALE** = referenced but off-direction · **MOCK-OR-STUB** = placeholder ·
**KEEP-FOR-SECONDARY** = only the modest forecast number.

### `apps/api/`
| File | Class | Reason | Action |
| --- | --- | --- | --- |
| `index.ts` | USED (support) | HTTP server `/health` + `/compare`; → `health`, `compare`. | keep |
| `health.ts` | USED (support) | `pnpm health` (Redis ping + Weave hello). | keep |
| `seed.ts` | USED (support) | `pnpm seed` — loads/validates the seed slice. | keep |
| `prep.ts` | USED (demo-critical) | `pnpm prep` — the live Brigade discussion (`runFridayPrep`). | keep |
| `compare.ts` | USED (demo-critical) | `pnpm compare` scoreboard → `runners`, `compareSoloVsTeam`. | keep (re-point at grounding eval) |
| `runners.ts` | USED (demo-critical) | wraps `runSolo`/`runTeam` over the scenario; used by compare/baseline/demo. | keep |
| `scenario.ts` | **STALE** | synthetic `record_*` `TRUTH` stand-in; off-direction vs grounding. Load-bearing today. | replace in place with grounding eval |
| `baseline.ts` | USED (support) | `pnpm baseline` — solo run. | keep |
| `demo.ts` | USED (support) | `pnpm demo` — narrated stand-in. | keep |
| `forecast.ts` | KEEP-FOR-SECONDARY | `pnpm forecast` — naive vs context backtest (sMAPE). Secondary number only. | keep, don't expand |
| `ask.ts` | USED (support) | `pnpm ask` — one-off prompt (`runAgent`). | keep |
| `agent-check.ts` | USED (support) | `agent:check` credit probe (`runAgent`). | keep |
| `tool-check.ts` | USED (support) | `tool:check` — proves tool-calling. | keep |
| `models.ts` | USED (support) | `models` — lists model ids. | keep |

### `packages/agents/` (DOMAIN)
| File | Class | Reason | Action |
| --- | --- | --- | --- |
| `index.ts` | USED (support) | package barrel; re-exports roles/stations/discussion/tools/prep. | keep |
| `discussion.ts` | USED (demo-critical) | `runFridayPrep` — the coordination loop behind `pnpm prep`. | keep |
| `stations.ts` | USED (demo-critical) | the 4 LLM agents (Chef/Historian/Scout/Prep) on `runToolAgent`. | keep |
| `roles.ts` | USED (demo-critical) | role/authority/conflict manifest + `assertEveryRoleHasConflict`. | keep |
| `tools/index.ts` | USED (support) | tools barrel. | keep |
| `tools/history.ts` | USED (demo-critical) | Historian's POS tools (baseline/by-condition/orders_on). | keep |
| `tools/realtime.ts` | USED (demo-critical) | Scout's 4 signals + menu tools. | keep |
| `tools/analytics.ts` | USED (support) | analytics behind history tools — **reads `ORDERS`** (see staleness note). | keep; re-point at `pos.ts` |
| `prep.ts` | KEEP-FOR-SECONDARY | `naiveForecast`/`contextForecast`/`backtest` — forecast secondary only. | keep, don't expand |

### `packages/seed/` (curated demo slice — DERIVED, not canon)
| File | Class | Reason | Action |
| --- | --- | --- | --- |
| `index.ts` | USED (support) | barrel + `seedSummary`/`TARGET_DATE`. | keep |
| `types.ts` | USED (support) | seed/`Order` types; consumed widely. | keep |
| `pos.ts` | USED (demo-critical) | **real** POS contract + `loadServiceRecords`/`splitTrainHoldout` (the grounding/secondary data). | keep — make this the single data source |
| `orders.ts` | **STALE** | `ORDERS` curated nightly slice; parallels `pos.json`. Powers live `pnpm prep` today. | migrate tools to `pos.ts`, then retire |
| `weather.ts` | USED (support) | Scout signal (`WEATHER`). | keep |
| `fixtures.ts` | USED (support) | Scout signal (`FIXTURES`/games). | keep |
| `holidays.ts` | USED (support) | Scout signal (`HOLIDAYS`). | keep |
| `events.ts` | USED (support) | Scout signal (`EVENTS`). | keep |
| `reviews.ts` | USED (support) | `REVIEWS` (grounding source for review claims). | keep |

### `packages/orchestration/` (domain-agnostic core)
| File | Class | Reason | Action |
| --- | --- | --- | --- |
| `index.ts` | USED (support) | barrel. | keep |
| `orchestrator.ts` | USED (demo-critical) | `runSolo`/`runTeam`. | keep |
| `conflict.ts` | USED (demo-critical) | `resolveConflict` (authority + sensitive→HITL). | keep |
| `state.ts` | USED (support) | `SharedState` (Redis + in-memory fallback). | keep |
| `types.ts` | USED (support) | `Agent`/`Claim`/core types. | keep |

### `packages/observability/`
| File | Class | Reason | Action |
| --- | --- | --- | --- |
| `index.ts` | USED (support) | barrel. | keep |
| `weave.ts` | USED (support) | `initWeave`/`traced` (no-op without key). | keep |
| `compare.ts` | USED (demo-critical) | `compareSoloVsTeam` — the scoreboard. | keep |

### `packages/runtime/`
| File | Class | Reason | Action |
| --- | --- | --- | --- |
| `index.ts` | USED (support) | barrel. | keep |
| `tools.ts` | USED (demo-critical) | `runToolAgent` — what the Brigade agents run on. | keep |
| `providers.ts` | USED (support) | provider/model selection (`wandb`/`openai`). | keep |
| `client.ts` | USED (support) | chat-completions client. **`generate`/`reason` exports have no callers.** | keep; trim dead exports |
| `json.ts` | USED (support) | JSON parsing helpers. | keep |
| `agents.ts` | USED (support) | `runAgent` (Agents-SDK path) used by `ask`/`agent-check`. **`reasonAgent` has no callers.** | keep; trim `reasonAgent` |

### `packages/shared/`, `packages/truth/`, `packages/memory/`
| File | Class | Reason | Action |
| --- | --- | --- | --- |
| `shared/index.ts` · `redis.ts` · `env.ts` · `types.ts` | USED (support) | `createRedis`/`loadRootEnv`/`Scoreboard`/`RunResult`; consumed everywhere. | keep |
| `truth/index.ts` | USED (demo-critical) | CANON menu/prices/hours; conflicts resolve toward it. | keep |
| `memory/index.ts` (+ pkg) | **DEAD** | zero imports, not a dependency anywhere — Layer-2/3 stub. | **safe to delete** |

---

## Notes & risks
- **Two data sources is the main direction smell.** `ORDERS` (curated, `orders.ts`/`analytics.ts`,
  live discussion) vs `pos.json` (real, `pos.ts`, forecast/grounding). The grounding headline must
  check claims against the **real** data, so the Historian's analytics tools should read `pos.ts`.
  Until then `ORDERS` is referenced and cannot be deleted without breaking `pnpm prep`.
- **`scenario.ts` is a stand-in, not dead.** It's the synthetic `record_*` harness keeping
  `compare`/`demo` green. Per CLAUDE.md it gets *replaced* by the grounding eval (`compareSoloVsTeam`
  unchanged) — swap, don't delete.
- **Dead exports (not files):** `reasonAgent`, `generate`, `reason` — no callers. Low-risk cleanup
  when next editing runtime.
- `apps/web` imports no backend package — deleting the dead backend items above cannot affect it.

---

Want me to delete the safe-dead list? (separate task)
