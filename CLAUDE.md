# CLAUDE.md

This file is operating instructions to yourself, not a repo brochure. Read the THESIS first.
The project IS decided (Brigade) and the two implementation choices (runtime provider,
orchestration framework) are now RESOLVED (see below). The JUDGED headline is the **GROUNDING
RATE** (mechanical, solo vs team — see RESOLVED DECISIONS 2026-06-07). Next up: harden the
Content → Critic GROUNDING LOOP and its mechanical grounding scoreboard.

---

## WHAT WE'RE BUILDING: Brigade

A **service-as-software** multi-agent system for a REAL restaurant we operate — **Le Kyoto**,
a small Japanese takeout/delivery spot near Paris. Named after the kitchen brigade: a head
chef delegates to specialized stations. Specialized AI agents handle different restaurant
operations, **every agent's output is scored by a Critic, and the system measurably improves
from that feedback.**

Grounded in real data and a real operator ("I run this restaurant, this is the system I wish
I had"). **That founder story is a core asset — protect it.** Never let fabricated data dilute
"this is real": seed files are clearly-marked curated slices that the operator replaces with
the real numbers; we never pass a guess off as Le Kyoto's truth.

20h hackathon (WeaveHacks 4), team of 2, all coding with AI. Optimize for a **working 3-minute
demo**, not production.

---

## THE THESIS — this is what gets judged. Never lose sight of it.

- Multi-agent only earns its place when a **SOLO agent visibly FAILS** and a **coordinated
  team visibly SUCCEEDS**, and we can **PROVE it with numbers in Weave**.
- Coordination only matters when there's a real **CONFLICT** to resolve. The Critic wants
  data-grounded, specific output; the producing agent just wants to ship. **That clash — and
  the jump in GROUNDING when it resolves — IS the judged headline**, measured MECHANICALLY
  (each claim checked against the real data, not by an LLM judge): solo vs team, **same model
  and same tools on both sides, so the ONLY difference is the Critic** and the gap is
  cleanly attributable to coordination (see RESOLVED DECISIONS 2026-06-07).
- **No decorative agents.** Every agent needs a role AND at least one real conflict or
  dependency with another agent, or it doesn't ship.
- The deliverable that proves all of this: **"solo scores X, team scores Y"** in Weave, by
  Saturday night, runnable at all times.

---

## OBSERVABILITY + THE BASELINE COME FIRST

Before any breadth, the scoreboard must exist and stay green:
1. A **SOLO baseline** that produces the prep brief / forecast in one shot, with NO Critic —
   it ships plausible-but-ungrounded claims (the failing baseline).
2. The **agent-TEAM** version — **same model, same tools** — where the **Critic checks each
   claim against the real data and BLOCKS until it's grounded**. The Critic is the only added
   ingredient.
3. **Weave on BOTH**, same scenario through each, reporting a numeric difference — primarily
   the **GROUNDING RATE (% of claims supported by the real data), measured MECHANICALLY**, with
   **forecast error (sMAPE on held-out years, ~42→40)** as an honest, modest SECONDARY number.

Weave is our **SCOREBOARD, not just logging.** Headline demo line: *"the solo agent ships N
ungrounded claims (rain→soba folklore the POS data flatly contradicts); add ONE Critic — same
model, same tools — and grounding goes from X% to ~100%, every claim traced to the query that
proves it. The forecast number barely moves; the trustworthiness does."* Keep `pnpm compare`
runnable after every change.

> Current state: the **Brigade discussion team is live** (`pnpm prep`) — real LLM agents
> (Chef/Historian/Scout/Prep) coordinating on a "prep for Friday" turn over W&B Inference, with
> tools + every turn traced in Weave. The `compare`/`demo` scoreboard still scores the synthetic
> `record_*` stand-in scenario (`apps/api/src/scenario.ts`) so the harness stays green. The
> KEYSTONE in progress: wiring the **mechanical GROUNDING eval** (each claim in the prep brief
> checked against `pos.json`; grounding rate solo vs team) into `compareSoloVsTeam` — swap the
> scenario, harness unchanged. The contextual-vs-naive forecast backtest stays as the modest
> SECONDARY number (sMAPE on held-out years), NOT the headline.

---

## THE HERO LOOP — build this end-to-end FIRST (Day 1, non-negotiable)

The one thing worth showing deeply. A single "Friday prep" turn, exactly this shape:

```
USER: "Prep for Friday dinner."

CHEF (orchestrator): Friday dinner request. Needs demand prediction + content push.
  → delegates to Prep, then Content

PREP AGENT: [pulls POS: last 8 Fridays] [pulls weather: rain, 14C]
  "Friday 19-21h: pre-prep ~32 gyoza, ~15 shoyu ramen. Rain → cold soba drops 40%, skip it."
  → emits prep sheet

CONTENT AGENT: [reads Prep output + review highlights]
  draft v1: "Rainy Friday? Hot ramen's calling." → emits

CRITIC: [scores v1] "5/10. Generic, no data hook, no CTA. Reviews: 83% of 5-star reviews
  mention the broth — use it." → feedback back to Content

CONTENT AGENT: [rewrites with feedback]
  draft v2: "Our 18-hour tonkotsu broth — the one 83% of you can't stop reviewing.
  Rainy Friday, 6:30pm. Pre-order now." → emits

CRITIC: [scores v2] "8.5/10. Grounded, specific, has CTA. ✅"

CHEF: → presents prep sheet + approved post to user
```

What makes it real multi-agent (not one LLM in a trenchcoat): **the Critic wants something
different than Content and BLOCKS it until every claim is grounded.** The judged headline is the
**GROUNDING RATE, measured mechanically** — solo ships ungrounded claims, the team drives them to
~100%, same model and tools on both sides (only the Critic differs). The live 5→8.5 critic score
is the on-stage **qualitative beat of conflict resolution** that makes the jump legible; the
mechanical grounding rate is the number that gets judged. Everything else is additive.

---

## AGENT ROSTER

**Starting team — BUILT and running (`pnpm prep`):** the "Friday prep" discussion.
- **Chef** (orchestrator): receives the request, delegates, presents, escalates big swings (HITL).
- **Historian**: reads POS history via tools — the typical night + how past conditions moved demand.
- **Scout**: reads today's real-world conditions via tools — weather, games, holidays, local events.
- **Prep**: reconciles Historian (baseline) vs Scout (today) into ONE grounded prep sheet.

  The conflict that earns the multi-agent setup: Historian's *average* Friday vs Scout's "*this*
  Friday is rain + a PSG derby + a school holiday + a transport strike." A solo agent picks one
  lens and is wrong; the team surfaces the contradiction and Prep reconciles it.

**The HERO pairing — NOT cuttable (this is the judged headline):**
- **Content** (producer) + **Critic**: the producer drafts the data-grounded output (prep brief /
  post); the **Critic checks each claim against the real data and BLOCKS until grounded**. Headline
  = **grounding rate, measured mechanically, solo vs team** (same model + tools, only the Critic
  differs); the 1–10 score is the live qualitative beat.

**Next layer (additive, cuttable):**
- **Promo**: slow periods → targeted offers.  **Reviews**: review vector search → insights.
- **Forge** (coda): detects a capability gap, scaffolds a NEW agent. 15-second coda only.

Each agent's role + its conflict/dependency live as data in `packages/agents/src/roles.ts`
(`assertEveryRoleHasConflict()` enforces it). If an agent has no conflict listed, it doesn't ship.

> **Tools, not hardcoded prompts.** Agents reach data ONLY through parameterized tools
> (`packages/agents/src/tools/`), driven by the runtime's chat-completions tool loop
> (`runToolAgent`, model-agnostic). Every tool call is a Weave op, so each claim is traceable to
> the exact query that grounded it. The Scout's tools are the four realtime signals (weather,
> games, holidays, events); the Historian's are the POS analytics (baseline + by-condition).

## SELF-IMPROVEMENT (3 layers — Layer 1 is the hero, 2 and 3 are bonus)

Self-improvement = the **GROUNDING RATE rising**, shown two ways:
- **Layer 1 (within session):** the Critic forces rewrites until every claim is grounded —
  grounding climbs v1→v2 live. **THE STAR.**
- **Layer 2 (across runs):** Redis stores scores + feedback so agents don't repeat the same
  ungrounded claims — grounding rate trends up across runs.
- **Layer 3 (lifetime):** Forge spawns new agents. Coda only.

---

## RESOLVED DECISIONS (2026-06-06) — do not re-litigate

Both went to the zero-friction option to protect the 20h / 2-person window. If you want to
revisit either, STOP and ask the team first.

1. **RUNTIME PROVIDER — RESOLVED: keep W&B Inference as the day-one default**, OpenAI as a
   switchable fallback. `RUNTIME_PROVIDER` selects `wandb` (default) or `openai`; the one W&B
   API key powers both Weave AND W&B Inference, so the W&B credits fund the agents. If a stronger
   model is ever needed for Critic/Chef, role-based routing lives in `providerForRole()` — but
   only split if it maps to ROLES, and ask first.

2. **ORCHESTRATION FRAMEWORK — RESOLVED: keep the direct-call orchestrator** (`packages/
   orchestration`: `runSolo`/`runTeam` + conflict resolution) and the plain Next.js shell that
   polls `/compare`. No LangGraph, no CopilotKit — the Critic-rewrite loop fits the direct-call
   model directly, and the scoreboard is already green. (CopilotKit/LangGraph stay on the table
   only as a post-hero-loop polish if time allows — ask before adopting.)

## RESOLVED DECISIONS (2026-06-07) — do not re-litigate

This one sets WHICH NUMBER gets judged. If you want to revisit it, STOP and ask the team first.

**THE JUDGED HEADLINE NUMBER — RESOLVED: the GROUNDING RATE, measured MECHANICALLY.** The solo
producer vs the producer+Critic team, scored by the **% of claims in the produced output that are
actually supported by the real `pos.json`/reviews data — checked programmatically, NOT by an LLM
judge** — traced in Weave. **Same model + same tools on both sides; the ONLY difference is the
Critic**, so the grounding gap is cleanly attributable to coordination. This is the **unfakeable
proof**: a judge who toggles the Critic off watches the grounding rate collapse. **SELF-IMPROVEMENT**
shows as the grounding rate rising — within a session (v1→v2 rewrites) and across runs (Redis
feedback).

> **SUPERSEDES the earlier 2026-06-07 call that made the FORECAST BACKTEST the headline.** A
> ~30-agent backtest + adversarial verification on the real POS proved there is **no honest, big
> solo-vs-team gap on forecast accuracy**: growth (~+23% YoY) is the only large effect and a SOLO
> trend term owns it; the context signals (weather/football/events) are real but swamped by
> per-service noise and don't move total sMAPE (toggling them OFF changes nothing a judge would
> see). The forecast-first experiment was still worth running — it's what told us where NOT to
> invest. So the forecast is kept as the agents' **TASK** and an honest **modest SECONDARY number
> (~42→40 sMAPE)**, NOT the proof; the Content→Critic GROUNDING mechanism is RE-PROMOTED to the
> headline, where the multi-agent gap is genuinely big and unfakeable. See
> `docs/solo-vs-team-research.md` and the memory note `forecast-accuracy-not-thesis-proof`.

---

## RULES FOR ANY AGENT WORKING HERE

- **Canon vs non-canon.** `packages/truth` is the ONLY source of truth (menu, prices, hours) —
  CANON. Surface states, drafts, seed-derived outputs, and anything an agent generates are
  DERIVED and may be stale. **Never treat a generated output as truth.** `packages/seed` is a
  curated demo slice — credibility for the pitch, NOT canon.
- **Every agent needs a clear role and at least ONE conflict/dependency with another agent, or
  it doesn't ship.** No decorative parallel agents.
- **The Critic validates SEMANTICALLY** — is the claim grounded in a real data source? — not
  just "did it run?". Target: **0 ungrounded claims in approved output.**
- **Anything touching money or public reputation (a live promo, a published post) requires HITL
  approval — never auto-publish.**
- **Build the HERO LOOP end-to-end before breadth.** Promo / Reviews / Forge are additive and
  cuttable. Keep the solo-vs-team scoreboard runnable after every change.
- **Everything is instrumented in Weave.** Every agent call AND every Critic scoring/rewrite is
  a traced op. The solo-vs-team comparison stays runnable at all times.
- **Keep the orchestration + observability core domain-agnostic.** `packages/orchestration` and
  `packages/observability` must not leak restaurant concepts (no menu/dish/surface). Domain code
  lives in `packages/agents`, `packages/truth`, `packages/seed`.
- **DATA: do NOT build a pipeline.** We have real data (3yr Hiboutik POS, public Google reviews,
  weather, menu) but the demo uses a **curated seed slice** in `packages/seed` (hardcoded). Real
  data is PITCH CREDIBILITY, not a technical dependency. No live integrations. Make seed easy to
  edit so we can stage the demo.
- **Credits power RUNTIME agents, not build tooling.** OpenAI ($50) + W&B Inference ($50) fund
  the agents *inside* Brigade. ~$123 Cursor credit is for BUILD TOOLING (coding agent), NOT
  runtime. **Exception:** the Forge coda, if it actually WRITES a new agent's code live, is a
  coding task — the only place Cursor credits may touch the product, and only as a Sunday stretch.
  Never burn runtime credits in health checks / scaffolding.
- **20h hackathon discipline (2 people):** if torn between "robust" and "demoable tomorrow," choose
  demoable. No complex auth, multi-tenancy, elaborate CI/CD, YAML owners, scheduled scanners, or
  speculative abstractions.
- **Integrate early, commit often.** Judges read git history as proof we built it here. No
  backend/frontend silos merged in the last hour.

---

## COMMANDS

```bash
./start.sh        # one-command setup: tools → install → .env → Redis → seed → health → dev
pnpm dev          # turbo dev: web (:3000) + api (:3001)
pnpm health       # Redis ping + Weave hello-world (also: GET /health on the api)
pnpm seed         # load + validate the curated seed slice (no LLM, no credits)
pnpm prep         # ⭐ the Brigade discussion: Chef→Historian+Scout→Prep, live (real LLMs, traced)
pnpm baseline     # run the SOLO agent alone (deterministic stand-in scenario)
pnpm compare      # the stand-in scoreboard: solo vs team, numeric delta (also: GET /compare)
pnpm demo         # narrated stand-in demo: catch contradiction → resolve/escalate → the number
pnpm ask "..."    # one-off free-form prompt through the configured runtime (spends credits)
pnpm --filter @weavehacks/api models       # list runtime model ids your key can use
pnpm --filter @weavehacks/api agent:check  # prove a single agent run (spends a little credit)
pnpm --filter @weavehacks/api tool:check   # prove tool-calling works on the model (a little credit)
pnpm typecheck    # turbo typecheck (tsc --noEmit) across all packages
pnpm build        # turbo build (next build for web; typecheck gate for packages)
pnpm format       # prettier
```

Run one package: `pnpm --filter @weavehacks/<name> <script>`. Redis runs as the
`weavehacks-redis` docker container on `:6379`. Weave needs `WANDB_API_KEY` in `.env`; without
it, tracing degrades to a no-op (the spine still runs).

## ARCHITECTURE

pnpm + Turborepo monorepo. TypeScript ESM throughout; packages export `src/*.ts` directly (no
build step — `tsx` runs the api, Next transpiles the web).

- **`packages/orchestration`** — domain-agnostic core. `Agent` = a `role` (with `authority`:
  higher = closer to the source of truth) + an `act()` that emits `Claim`s. `runSolo()` applies
  claims last-write-wins (the failing baseline). `runTeam()` gathers claims → a verifier detects
  conflicts → `resolveConflict()` decides: **highest authority wins; `sensitive` claims escalate
  to a human.** `SharedState` is Redis-backed with an in-memory fallback. (The Critic-rewrite
  loop is modeled here too once we build it — keep it generic.)
- **`packages/observability`** — `initWeave()` + `traced()` (no-ops without a key) wrap every
  agent call/resolution. `compareSoloVsTeam()` is the scoreboard: runs the same scenario two
  ways, traces both, returns `{ solo, team, delta }`.
- **`packages/runtime`** — inference. OpenAI-compatible client(s) for **OpenAI** and
  **W&B Inference**, switchable via `RUNTIME_PROVIDER` (default `wandb`, per the resolved
  decision). `generate()`/`reason()` = raw chat completions; `runToolAgent()` = the tool-calling
  loop (model-agnostic function-calling — what the Brigade agents run on); `runAgent()` = the
  OpenAI Agents SDK path. `describeRuntime()` reports config without spending credits.
- **`packages/agents`** — **DOMAIN lives here.** `roles.ts` is the manifest (authority + required
  conflict per role). `tools/` are the parameterized, Weave-traced tools agents call —
  `history.ts` (POS analytics: baseline, by-condition) + `realtime.ts` (the four signals + menu).
  `stations.ts` defines the four LLM agents (Chef/Historian/Scout/Prep) on `runToolAgent`.
  `discussion.ts` = `runFridayPrep()`, the coordination loop (one Weave span). Content/Critic/
  Promo/Reviews/Forge are next.
- **`packages/truth`** — **CANON.** Canonical restaurant data (menu, prices, hours) + schema.
  The single source of truth conflicts resolve toward.
- **`packages/seed`** — curated demo slice, split into editable files: `orders` (POS history),
  `weather`, `fixtures`, `holidays`, `events` (the four realtime signals), `reviews`. `TARGET_DATE`
  is the Friday the team preps for. Derived, NOT canon.
- _(Layers 2 & 3 substrate — across-runs grounding/feedback, Forge log, review vector search —
  is NOT built yet. It was scaffolded as `packages/memory` but removed as dead code; rebuild on
  `@weavehacks/shared`'s Redis client when Layer 2 is actually wired.)_
- **`packages/shared`** — `createRedis()`, `loadRootEnv()`, cross-cutting types (`Scoreboard`,
  `RunResult`).
- **`apps/api`** — orchestration runtime entrypoint. HTTP `/health` + `/compare`, and the
  `baseline`/`compare`/`demo`/`seed`/`ask` CLI scripts.
- **`apps/web`** — dashboard: the Critic score jump, live agent cards, HITL approve/reject.
  Plain Next.js polling `/compare` (direct-call orchestrator, per the resolved decision).

The point: orchestration + observability are the reusable spine; the agents/truth/seed/memory
packages are Brigade; the scoreboard proves the thesis (solo → team) after every change.
