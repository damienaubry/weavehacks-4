# CLAUDE.md

This file is operating instructions to yourself, not a repo brochure. Read the THESIS first.
The project IS decided (Brigade, now shipping as the **Grounded Recovery Copilot**) and the
implementation choices are RESOLVED (see below). The JUDGED headline is the **GRPR — Grounded
Recovery Pass Rate** (mechanical, solo vs team vs team+memory — see RESOLVED DECISIONS
2026-06-07-bis). Next up: build the Curator→Analyst→Writer→Verifier pipeline and its mechanical
GRPR scoreboard over a dataset of real-review cases.

---

## WHAT WE'RE BUILDING: the Grounded Recovery Copilot (codename Brigade)

A **service-as-software** multi-agent system for a REAL restaurant we operate — **Le Kyoto**, a
small Japanese takeout/delivery spot near Paris. Named after the kitchen brigade: a head chef
delegates to specialized stations. The product turns **one real customer review** into a
**recovery package**: (1) incident **triage**, (2) a **grounded public reply**, (3) an **internal
action ticket** — and **every claim in that output is verified against the real data by an
independent Critic, with the system measurably improving from that feedback.**

Grounded in real data and a real operator ("I run this restaurant, this is the system I wish I
had"). **That founder story is a core asset — protect it.** Never let fabricated data dilute "this
is real": seed files are clearly-marked curated slices that the operator replaces/validates with
the real numbers; we never pass a guess off as Le Kyoto's truth. The recovery dataset is derived
from **real Google reviews** (majority `source:"real"`); synthetic variants are clearly marked.

20h hackathon (WeaveHacks 4), team of 2, all coding with AI. Optimize for a **working 3-minute
demo**, not production.

> **Why we re-pointed (don't re-litigate — see RESOLVED 2026-06-07-bis):** the multi-agent gap is
> genuinely big and unfakeable on **open generation under a truth constraint** (review → grounded
> reply), not on forecasting and not on a single marketing post. A customer-facing reply makes a
> hallucination (wrong hours/ingredient, an over-promised refund) obviously costly — so an
> independent Verifier has a real reason to exist, and the metric becomes a hard **pass RATE over
> ~50 cases**, not a soft 1-shot score.

---

## THE THESIS — this is what gets judged. Never lose sight of it.

- Multi-agent only earns its place when a **SOLO agent visibly FAILS** and a **coordinated team
  visibly SUCCEEDS**, and we can **PROVE it with numbers in Weave**.
- Coordination only matters when there's a real **CONFLICT** to resolve. The Verifier wants
  data-grounded, policy-safe output; the Writer just wants to ship. **That clash — and the jump in
  GRPR when it resolves — IS the judged headline**, measured MECHANICALLY (each claim checked
  against the real data, not by an LLM judge): solo vs team, **same model and same tools on both
  sides, so the ONLY difference is the Verifier** and the gap is cleanly attributable to
  coordination.
- **Self-improvement** shows as GRPR RISING: within a session (Writer rewrites until grounded) and
  **across runs** (Redis failure-cards stop the team repeating an over-promise) → the third
  leaderboard row, `team+memory`.
- **No decorative agents.** Every agent needs a role AND at least one real conflict or dependency
  with another agent, or it doesn't ship.
- The deliverable that proves all of this: **"solo scores X, team scores Y, team+memory scores Z"**
  in Weave, by Saturday night, runnable at all times.

---

## THE METRIC — GRPR (Grounded Recovery Pass Rate)

Binary and **conjunctive**, mostly mechanical. For each case, `pass = 1` iff ALL four hold:

```
GRPR = mean over N cases of [ triage_correct          (predicted incidentType == gold, deterministic)
                            ∧ all_claims_grounded     (every ledger claim backed by a tool result — checkGrounding, mechanical)
                            ∧ policy_ok               (required disclosures present, no forbidden claim / over-promise)
                            ∧ ticket_valid ]          (severity/owner/action present — schema check)
```

- The grounding sub-score REUSES the existing mechanical checker (`packages/agents/src/grounding.ts`,
  `checkGrounding`) — **no LLM judge for the headline.** Triage and ticket are deterministic.
  Policy is deterministic rules; a NARROW LLM judge is tolerated ONLY for "over-promise", isolated,
  never for the grounding score.
- Three leaderboard rows, **same model + same tools on all three, only orchestration differs**:
  `solo` (one strong agent, self-revision, compute-matched) **<** `team` (Curator→Analyst→Writer→
  Verifier; the Verifier blocks until grounded) **<** `team+memory` (team + failure-card memory).
- **Compute parity is mandatory.** Solo gets a budget ≥ the team's (self-retries). Reuse the
  `Budget` + parity guards already in `grounding.ts`. Never fake a gap.

**The on-screen sentence:** *"On N held-out cases derived from Le Kyoto's REAL reviews, at matched
compute budget, our multi-agent team beats the best solo on GRPR, then improves again after
automatic memory of the critic's feedback — every claim traced to the query that proves it in
Weave."* Keep `pnpm recovery` runnable after every change.

> Current state: the **legacy Friday-prep team is live** (`pnpm prep`) and the legacy mechanical
> grounding eval (`pnpm grounding`, Content+Critic on an Instagram post) still works — kept
> runnable, not the judged product. The new **GRPR scoreboard** (`pnpm recovery`, `GET /recovery`)
> exists as a typed PLACEHOLDER (`apps/api/src/recovery.ts`) returning mock numbers in the real
> `RecoveryReport` shape so the API/CLI/front build against a stable contract. The KEYSTONE in
> progress: wire the real harness — run Curator→Analyst→Writer→Verifier over the real-review
> dataset and score GRPR solo vs team vs team+memory.

---

## THE HERO LOOP — build this end-to-end FIRST (non-negotiable)

The one thing worth showing deeply. A single review → recovery turn, exactly this shape:

```
REVIEW (2★): "Livré 50 min en retard, le ramen tonkotsu était froid. Dommage, d'habitude c'est très bon."

CURATOR: [pulls review text + aggregated POS window + menu/policy facts] → emits the authorized evidence set
ANALYST: triage = delivery_late; builds the cited evidence ledger (acknowledge delay, cold food, policy gesture = 15% credit)
WRITER:  draft v1 (from the ledger): apology + "we refund you in full + a free meal next time" + no ticket
VERIFIER (independent, authority 90):
   ✗ unsupported: none      ✗ policy: "free meal + full refund" violates the gesture policy (over-promise)
   ✗ ticket: missing        → BLOCKS, sends feedback
WRITER:  draft v2 (rewrite): apology, "a 15% credit on your next order, per our policy", + internal ticket (sev=med, ops-delivery)
VERIFIER: triage ✓ · 0 ungrounded ✓ · policy ✓ · ticket ✓ → PASS
HITL:    human approves the public reply + ticket before anything is published
```

What makes it real multi-agent (not one LLM in a trenchcoat): **the Verifier wants something
different than the Writer and BLOCKS it until every claim is grounded and policy-safe.** The judged
headline is the **GRPR, measured mechanically** — solo ships ungrounded/over-promising claims, the
team drives them to a high pass rate, same model and tools on both sides (only the Verifier
differs). Keep the on-stage **theater stolen from the legacy design**: specialized agents
(Curator/Analyst) surface context the solo ignores, and the live v1→v2 Writer rewrite makes the
jump legible. Everything else is additive.

---

## AGENT ROSTER

**HERO — the Grounded Recovery Copilot (the judged product). 4 roles MAX (MAST: more roles ⇒
misalignment).** Roles + their required conflicts live as data in `packages/agents/src/roles.ts`
(`assertEveryRoleHasConflict()` enforces it — no conflict ⇒ doesn't ship).
- **Evidence Curator** (`curator`, auth 55): pulls ONLY authorized sources — review text,
  aggregated POS window, menu + policy facts. Supplies the ledger; refuses unauthorized context.
- **Operational Analyst** (`analyst`, auth 58): infers the incident type (triage) + assembles an
  atomic-fact, cited evidence ledger. Pushes specificity against the Writer's fluency.
- **Writer** (`writer`, auth 30, **sensitive → HITL**): drafts the public reply + internal ticket
  FROM THE LEDGER ONLY. Wants to ship; the Verifier blocks until grounded.
- **Adversarial Verifier** (`verifier`, auth 90): three challenges — unsupported? policy violation?
  over-promise? **Blocks** until grounded; escalates money/reputation gestures to a human. (This is
  the Critic mechanism, re-pointed.)

  The conflict that earns the multi-agent setup: the Writer wants a fluent, generous reply; the
  Verifier refuses any claim not in the ledger and any over-promise. A solo agent ships the
  ungrounded/over-promising draft; the team blocks and grounds it.

**LEGACY (kept runnable, NOT the judged product):** Chef / Historian / Scout / Prep (the Friday-prep
discussion, `pnpm prep`) and Content / Critic (the grounding-post eval, `pnpm grounding`). Tiered
`legacy` in `roles.ts`. Don't delete — judges read git history, and the spine is shared.

**Next layer (additive, cuttable):** Promo (slow periods → offers), Reviews (review vector search →
insights), Forge (coda — scaffolds a NEW agent live; Sunday stretch only).

> **Tools, not hardcoded prompts.** Agents reach data ONLY through parameterized tools
> (`packages/agents/src/tools/`), driven by the runtime's chat-completions tool loop
> (`runToolAgent`, model-agnostic). Every tool call is a Weave op, so each claim is traceable to
> the exact query that grounded it. The recovery tools: `review_stats`/`get_reviews`, the POS
> analytics (`history.ts`), `get_menu`, and a new `policy_lookup` (reads `truth`).

## SELF-IMPROVEMENT (3 layers — Layer 1 is the hero, 2 is the third leaderboard row, 3 is coda)

Self-improvement = the **GRPR RISING**, shown two ways:
- **Layer 1 (within session):** the Verifier forces rewrites until every claim is grounded —
  grounding climbs v1→v2 live. **THE STAR.**
- **Layer 2 (across runs):** Redis failure-cards store what failed (`failure_tags`,
  `missing_evidence`, `bad_pattern`, `patch_exemplar`); the Curator/Writer retrieve them by
  similarity + tag filter so the team doesn't repeat an over-promise → `team+memory` beats `team`.
  Tested with a **chronological split** (early cases warm the memory, later cases test it — no
  leakage). **GUARD: if `team+memory` doesn't beat `team` on held-out cleanly, report it honestly
  and fall back to the Layer-1 v1→v2 beat. Never inflate.**
- **Layer 3 (lifetime):** Forge spawns new agents. Coda only.

---

## RESOLVED DECISIONS (2026-06-06) — do not re-litigate

Both went to the zero-friction option to protect the 20h / 2-person window. Revisit ⇒ ask the team.

1. **RUNTIME PROVIDER — RESOLVED: keep W&B Inference as the day-one default**, OpenAI as a
   switchable fallback (`RUNTIME_PROVIDER` = `wandb` default / `openai`). One W&B key powers Weave
   AND W&B Inference. Role-based routing lives in `providerForRole()` — split only if it maps to
   ROLES, and ask first.
2. **ORCHESTRATION FRAMEWORK — RESOLVED: keep the direct-call orchestrator** (`packages/
   orchestration`: `runSolo`/`runTeam` + conflict resolution) for the PROOF ENGINE. The
   Verifier-rewrite loop fits the direct-call model directly. No LangGraph.

## RESOLVED DECISIONS (2026-06-07) — superseded, kept for the record

The earlier call made the **mechanical GROUNDING RATE on a marketing post** the headline. A ~30-agent
forecast backtest first proved there's no honest solo-vs-team gap on forecast accuracy (growth owns
it; context signals are swamped by noise) — so forecasting was demoted to a modest secondary number.
Then the post-grounding eval, while real, rested on a SINGLE post where the solo is often already
grounded (hence the `HONESTY GUARD`). See `docs/solo-vs-team-research.md`.

## RESOLVED DECISIONS (2026-06-07-bis) — the current headline. Revisit ⇒ ask the team first.

**THE JUDGED HEADLINE — RESOLVED: GRPR on review-recovery, measured MECHANICALLY, over a dataset of
~50 real-review cases.** Re-point the existing grounding machine (spine + `checkGrounding` + parity
guards + the Critic-rewrite loop — ~80% reused) at a sharper task: **review → grounded reply +
internal ticket**. The metric becomes a hard **binary conjunctive pass RATE** (not a 1-shot %, not a
/10) across `solo` < `team` < `team+memory`, same model + tools, only the Verifier (and then memory)
differs — **unfakeable: toggle the Verifier off and the GRPR collapses.** Keep the legacy theater
(specialized context agents + live v1→v2 rewrite) inside the recovery pipeline. SUPERSEDES the
2026-06-07 "grounding-post-as-headline" call and the earlier "forecast-as-headline" call.

3. **FRONT-END FRAMEWORK — RESOLVED (2026-06-07-bis): adopt CopilotKit for the FRONT-END ONLY** —
   live agent cards, streamed agent state, HITL approve/reject. The PROOF ENGINE (recovery harness,
   GRPR, parity) stays on the direct-call orchestrator. A UI framework must NEVER touch the judged
   number. (This relaxes the 2026-06-06 "no CopilotKit" call, scoped to the web layer only.)

---

## RULES FOR ANY AGENT WORKING HERE

- **Canon vs non-canon.** `packages/truth` is the ONLY source of truth (menu, prices, hours,
  **policy**) — CANON. Reviews, ledgers, drafts, seed-derived cases, and anything an agent
  generates are DERIVED and may be stale. **Never treat a generated output as truth.**
  `packages/seed` is a curated demo slice (incl. the recovery dataset) — credibility for the pitch,
  NOT canon.
- **Every agent needs a clear role and at least ONE conflict/dependency with another agent, or it
  doesn't ship.** No decorative parallel agents. Max 4 LLM roles in the hero pipeline.
- **The Verifier validates SEMANTICALLY + MECHANICALLY** — is each claim grounded in a real data
  source? does it respect policy? — not just "did it run?". Target: **0 ungrounded claims and 0
  policy violations in approved output.**
- **Mechanical, not LLM judge, for the HEADLINE.** Grounding via `checkGrounding`; triage/ticket
  deterministic; policy by rules + a narrow over-promise judge only. No "vibe score".
- **Compute parity, always.** Solo budget ≥ team budget; reuse the parity guards. Report the real
  result even if modest. Keep the BUILD / HONESTY / PARITY guards honest.
- **Anything touching money or public reputation (a published reply, a gesture/credit) requires HITL
  approval — never auto-publish.**
- **Build the HERO LOOP end-to-end before breadth.** Promo / Reviews / Forge are additive and
  cuttable. Keep `pnpm recovery` (and the legacy `pnpm compare` / `pnpm grounding`) runnable after
  every change.
- **Everything is instrumented in Weave.** Every agent call AND every Verifier scoring/rewrite AND
  every GRPR case is a traced op. Use Weave as the SCOREBOARD (Evaluations + a custom GRPR scorer +
  a 3-row Leaderboard with cost/token tracking proving parity), not just logging.
- **Keep the orchestration + observability core domain-agnostic.** `packages/orchestration` and
  `packages/observability` must not leak restaurant/review concepts (no menu/dish/review/reply).
  Domain code lives in `packages/agents`, `packages/truth`, `packages/seed`, `packages/memory`.
  (This is why `RecoveryReport`/`RecoveryCase` live in domain packages, not in `shared`.)
- **DATA: do NOT build a pipeline.** We have real data (3yr Hiboutik POS, public Google reviews,
  weather, menu) but the demo uses a **curated seed slice** (hardcoded / JSON). The recovery dataset
  derives from real reviews but is staged, not live-pulled. No live integrations. Make seed easy to
  edit so we can stage the demo.
- **Credits power RUNTIME agents, not build tooling.** OpenAI + W&B Inference fund the agents
  *inside* Brigade. Cursor/Claude credits are for BUILD TOOLING. Never burn runtime credits in
  health checks / scaffolding. (Forge coda, if it writes a new agent live, is the only exception.)
- **20h hackathon discipline (2 people):** if torn between "robust" and "demoable tomorrow," choose
  demoable. No complex auth, multi-tenancy, elaborate CI/CD, or speculative abstractions.
- **Integrate early, commit often.** Judges read git history as proof we built it here.

---

## COMMANDS

```bash
./start.sh        # one-command setup: tools → install → .env → Redis → seed → health → dev
pnpm dev          # turbo dev: web (:3000) + api (:3001)
pnpm health       # Redis ping + Weave hello-world (also: GET /health on the api)
pnpm seed         # load + validate the curated seed slice (no LLM, no credits)
pnpm recovery     # ⭐ THE judged scoreboard: GRPR solo vs team vs team+memory (also: GET /recovery)
pnpm prep         # LEGACY Brigade discussion: Chef→Historian+Scout→Prep, live (real LLMs, traced)
pnpm grounding    # LEGACY mechanical grounding eval: Content+Critic on an Instagram post
pnpm baseline     # LEGACY solo agent alone (deterministic stand-in scenario)
pnpm compare      # LEGACY stand-in scoreboard: solo vs team, numeric delta (also: GET /compare)
pnpm demo         # LEGACY narrated stand-in demo
pnpm ask "..."    # one-off free-form prompt through the configured runtime (spends credits)
pnpm --filter @weavehacks/api models       # list runtime model ids your key can use
pnpm typecheck    # turbo typecheck (tsc --noEmit) across all packages
pnpm build        # turbo build
pnpm format       # prettier
```

Run one package: `pnpm --filter @weavehacks/<name> <script>`. Redis runs as the `weavehacks-redis`
docker container on `:6379`. Weave needs `WANDB_API_KEY` in `.env`; without it, tracing degrades to
a no-op (the spine still runs).

## ARCHITECTURE

pnpm + Turborepo monorepo. TypeScript ESM throughout; packages export `src/*.ts` directly (no build
step — `tsx` runs the api, Next transpiles the web).

- **`packages/orchestration`** — domain-agnostic core. `Agent` = `role` (with `authority`: higher =
  closer to truth) + `act()` emitting `Claim`s. `runSolo()` = last-write-wins (the failing
  baseline); `runTeam()` = gather → verify conflicts → `resolveConflict()` (highest authority wins;
  `sensitive` escalates to a human). `SharedState` = Redis-backed with in-memory fallback. The
  Verifier-rewrite loop is modeled here generically.
- **`packages/observability`** — `initWeave()` + `traced()` (no-ops without a key) wrap every agent
  call/resolution. `compareSoloVsTeam()` is the legacy scoreboard; the recovery harness traces each
  variant + each GRPR case the same way.
- **`packages/runtime`** — inference. OpenAI-compatible clients for OpenAI and W&B Inference
  (`RUNTIME_PROVIDER`). `generate()`/`reason()` = raw chat; `runToolAgent()` = the tool-calling loop
  (what the agents run on); `describeRuntime()` reports config without spending credits.
- **`packages/agents`** — **DOMAIN.** `roles.ts` = the manifest (hero recovery roles + legacy).
  `tools/` = the parameterized Weave-traced tools. `grounding.ts` = `checkGrounding` (the mechanical
  checker, REUSED by GRPR) + the legacy Content/Critic loop. **Recovery socle (Phase 0):**
  `recovery-types` (via seed), `recovery-contract.ts` (`RecoveryOutput`/`CaseScore`/
  `RecoveryRunResult`/`RecoveryReport`), `memory.ts` (failure-card stub). **To build:**
  `recovery-stations.ts` (Curator/Analyst/Writer/Verifier on `runToolAgent`), `recovery-score.ts`
  (`scoreCase`/`runRecovery` harness), `tools/policy.ts`.
- **`packages/truth`** — **CANON.** Menu, prices, hours, **policy** (refund/gesture rules, allergen
  disclaimers). The single source of truth conflicts resolve toward.
- **`packages/seed`** — curated demo slice. Legacy: `orders`/`weather`/`fixtures`/`holidays`/
  `events`/`reviews`. **Recovery:** `recovery-types.ts` (the `RecoveryCase`/`IncidentType` contract)
  + `recovery-cases.ts` (placeholder; WS-A expands to ~50 real-review cases, ideally
  `data/recovery-cases.json`). Derived, NOT canon.
- **`packages/memory`** _(to be promoted by WS-D)_ — across-runs failure-card store. Phase 0 lives as
  an IN-MEMORY stub in `packages/agents/src/memory.ts` (`writeFailureCard`/`retrieveFailureCards`);
  WS-D moves it to its own package on Redis **vector search** (embedding similarity + tag filter,
  see `.agents/skills/redis-vector-search`) + the chronological eval split.
- **`packages/shared`** — `createRedis()`, `loadRootEnv()`, domain-agnostic types (`Scoreboard`,
  `RunResult`). NO review/recovery types here (kept domain-agnostic).
- **`apps/api`** — orchestration runtime entrypoint. HTTP `/health` + `/compare` + `/recovery`, and
  the `recovery`/`compare`/`grounding`/`prep`/`seed`/`ask` CLI scripts. `recovery.ts` is a typed
  PLACEHOLDER until WS-C wires the real harness (keep the `RecoveryReport` shape).
- **`apps/web`** — dashboard. **Pivot (WS-E):** a `/recovery` view (or `/`) reading `GET /recovery` —
  the 3-row GRPR leaderboard + a case drill-down (solo fail vs team pass + memory reuse) + HITL
  approve/reject — built with **CopilotKit (front-end only)**. Legacy `/brigade` stays.

The point: orchestration + observability are the reusable spine; agents/truth/seed/memory are
Brigade; the GRPR scoreboard proves the thesis (solo → team → team+memory) after every change.
