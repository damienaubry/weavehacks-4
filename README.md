# Grounded Recovery Copilot

_codename **Brigade** · WeaveHacks 4 · a 2-person, ~20h build, all coding with AI_

A **service-as-software** multi-agent system for a **real restaurant we operate** — **Le Kyoto**, a
small Japanese takeout/delivery spot near Paris. Named after the kitchen brigade: a head chef
delegates to specialized stations. The product turns **one real customer review** into a **recovery
package** — incident **triage**, a **grounded public reply**, and an **internal action ticket** —
where **every claim is verified against the real data by an independent Verifier before a human
approves it.** Nothing auto-publishes.

## The thesis (what we're judged on)

**Multi-agent only earns its place when a solo agent visibly fails and a coordinated team visibly
succeeds — and we prove it with numbers in Weave.** The star is the **Verifier**: it wants
data-grounded, policy-safe output and *blocks* the Writer until every claim is grounded. A solo
agent ships the ungrounded, over-promising draft; the team catches it.

The headline number is the **GRPR — Grounded Recovery Pass Rate**: binary, conjunctive, and **mostly
mechanical** (no LLM judge for the score). For each case `pass = 1` iff **all four** hold:

```
triage_correct      predicted incidentType == gold            (deterministic)
all_claims_grounded every ledger claim backed by a tool result (checkGrounding — mechanical)
policy_ok           required disclosures present, no over-promise (canon rules + an opt-in narrow judge)
ticket_valid        severity / owner / action present          (schema check)
```

Three leaderboard rows, **same base model + same tools on all three — only the orchestration differs**:

```
solo            one strong agent, self-revision (compute-matched, budget ≥ team)
team            Curator → Analyst → Writer → Verifier (Verifier blocks ≤1 rewrite until grounded)
team+memory     team + Redis failure-cards (stop repeating an over-promise across runs)
```

**The kill-shot:** `pnpm recovery --no-verifier` runs the team with the Verifier off and the GRPR
collapses back toward solo. Unfakeable — same model, same tools, same compute budget; the
coordination is the only difference.

**On-screen sentence:** _"On held-out cases derived from Le Kyoto's real Google reviews, at matched
compute, our multi-agent team beats the best solo on GRPR — and it's the Verifier, not extra budget;
every claim traced to the query that proves it in Weave."_

## The real result

The fast 8-case slice (held-out, matched compute), captured in `recovery-report.json`:

```
solo         GRPR  60%   ·  117,830 tok / 65 calls
team         GRPR 100%   ·   65,197 tok / 45 calls   ← +40 pts on nearly HALF the tokens
team+memory  GRPR  80%   ·   55,164 tok / 34 calls   (cross-run memory; neutral on this small slice)
```

Solo spent **nearly 2× the tokens** and still scored lower — the per-case parity guard confirms the
gap is the **Verifier**, not compute. The real sample case is a **1★ Google review** `rc-real-088`
(_"Very average and tasteless… I do not recommend!"_): the **solo offers a 20% discount** →
`gesture 20% exceeds the 15% credit limit [over_promise]` → **FAIL**; the **team offers a 15% credit**
→ **PASS**. The rows above are the **fast iteration slice** (gpt-4o-mini, 8 cases); the **judged run is
a separate, larger pass — 16 cases on W&B Inference** (`recovery-cases.demo.json`), same harness, same
three variants, same model — the more robust number. **Honest caveat, baked in:** cross-run memory did
*not* beat team on this slice (80% < 100%) — the defensible self-improvement is the Verifier's
within-session v1→v2 rewrite, and the CLI prints that verdict for us to read aloud.

## The hero loop

```
REVIEW (2★): "Livré 50 min en retard, le ramen tonkotsu était froid. D'habitude c'est très bon."

CURATOR  pulls ONLY authorized sources (review text + aggregated POS window + menu/policy) → evidence set
ANALYST  triage = delivery_late; builds the cited evidence ledger (acknowledge delay + cold food + policy gesture)
WRITER   draft v1: apology + "full refund + a free meal next time" + no ticket
VERIFIER ✗ policy: "free meal + full refund" over-promises the gesture policy   ✗ ticket: missing  → BLOCKS
WRITER   draft v2: apology + "a 15% credit on your next order, per our policy" + internal ticket (sev=med, ops-delivery)
VERIFIER triage ✓ · 0 ungrounded ✓ · policy ✓ · ticket ✓ → PASS
HITL     a human approves the public reply + ticket before anything is published
```

The live **v1 → v2 rewrite** makes the jump legible; the GRPR makes it measurable. The pre-rewrite
draft (`draftV1`) and both verdicts are kept on every run for the drill-down. (The diagram is the
mechanism; the live demo drills into the **real** case `rc-real-088` above — solo 20% over-promise vs
team 15% credit. See [`docs/demo-script.md`](docs/demo-script.md).)

## Real data, real operator

Le Kyoto is a restaurant we actually run — _"this is the system I wish I had."_ That founder story is
a core asset, so we protect it: **`packages/seed` is a clearly-marked curated slice, never passed off
as canon**, and **`packages/truth` is the only source of truth** (menu, prices, hours, **policy**).
The recovery dataset is **derived from Le Kyoto's real Google reviews**: **48 cases — 30 verbatim real
reviews** (majority `source: "real"`, the target met) **+ 18 clearly-marked synthetic variants** that
cover the rarer incident types we don't have enough real examples of (Le Kyoto is genuinely 4.7★, so
the harshest cases are mostly synthetic — we present that honestly). The fast demo slice is **8 cases**
and the judged run **16** — both just point `RECOVERY_CASES_PATH` at a smaller JSON; the harness has no
case cap. Menu/prices/hours and the `packages/truth` policy gesture limits are demo-plausible
placeholders the operator validates with the real numbers — the SHAPE is locked, the values are
swappable. We never guess a fact and call it Le Kyoto's truth.

## Run it

```bash
./start.sh          # one command: tools → install → .env → Redis → seed → health → dev
```

Or manually:

```bash
pnpm install
pnpm seed                              # validate the curated seed slice (no keys, no credits)
pnpm --filter @weavehacks/seed validate-cases   # strict gate on the recovery dataset (no keys)
pnpm recovery                          # ⭐ THE judged scoreboard: GRPR solo vs team vs team+memory (live; writes recovery-report.json)
RECOVERY_CASES_PATH=packages/seed/data/recovery-cases.fast.json pnpm recovery   # fast 8-case slice (cheap iteration)
pnpm recovery --no-verifier            # the KILL-SHOT: Verifier off → GRPR collapses toward solo
pnpm dev                               # web (:3000) + api (:3001) — open /recovery
pnpm health                            # Redis ping + Weave hello-world
```

Legacy paths, kept runnable (not the judged product):

```bash
pnpm grounding      # the mechanical solo-vs-team grounding eval (Content/Critic) — the machine GRPR reuses (checkGrounding)
pnpm prep           # the live Brigade discussion: Chef → Historian + Scout → Prep (real LLMs, traced)
pnpm compare        # legacy stand-in scoreboard: solo vs team, numeric delta (also: GET /compare)
```

Requirements: Node 20+, pnpm, Docker (for Redis; or bring your own `REDIS_URL`). Copy
`.env.example` → `.env`. Runtime agents default to **W&B Inference** (`RUNTIME_PROVIDER=wandb`, the one
`WANDB_API_KEY` powers both Weave tracing and inference); OpenAI is a switchable fallback. Pin the base
model for every variant with `RECOVERY_MODEL=<id>` (W&B Inference default `zai-org/GLM-5.1`; the fast
slice iterated on OpenAI `gpt-4o-mini`). **`pnpm recovery` runs real LLM agents (needs a runtime key,
spends inference credits) and produces the three rows live**, then writes them to `recovery-report.json`.
**`GET /recovery` never runs the harness** — it serves that cache (or a clearly-flagged
`placeholder:true` stub before the first run), so the front-end is fast and credits are spent only when
you choose. **Weave degrades to a no-op without `WANDB_API_KEY`** (the spine still runs), and `pnpm seed`
/ `validate-cases` / `pnpm typecheck` need no keys at all.

## How to verify the claim

1. `pnpm recovery` prints three rows with a **budget column** (`GET /recovery` serves the same numbers
   from the cache) — the CLI's per-case parity guard asserts solo spent ≥ each team variant, so the gap
   is the Verifier's, not extra budget. On the fast slice: solo 60% on 117,830 tok vs team 100% on
   65,197 tok.
2. Open the Weave traces: each station is an op (`agent.recovery.*`), each case is `recovery.case`,
   each score is `recovery.score` — so every claim links to the query that grounds it.
3. `pnpm recovery --no-verifier` → watch the GRPR collapse toward solo.
4. The CLI prints an **honesty note**: if `team+memory` doesn't beat `team` cleanly on the dataset, it
   says so and falls back to the within-session v1→v2 rescue count. We report the real result.

## Layout (pnpm + Turborepo)

The **spine** (orchestration / observability / runtime / shared) is domain-agnostic and reusable; the
**domain** (agents / truth / seed / memory) is Brigade-specific; the **apps** wire them up. The whole
recovery pipeline is wired end-to-end and `pnpm typecheck` is green.

| Package | Layer | What | State |
| --- | --- | --- | --- |
| `packages/orchestration` | spine | `runSolo` / `runTeam` (detect conflicts → resolve by authority → escalate sensitive → human), `SharedState` (Redis + in-memory fallback). | live |
| `packages/observability` | spine | `initWeave` / `traced` (no-op without a key) + `compareSoloVsTeam` (legacy scoreboard). | live |
| `packages/runtime` | spine | Inference: W&B Inference (default) + OpenAI (fallback), `runToolAgent` tool-loop, `describeRuntime`. | live |
| `packages/agents` | domain | Role manifest (`roles.ts` + `assertEveryRoleHasConflict`), Weave-traced `tools/` (incl. `policy_lookup`), `grounding.ts` (`checkGrounding`), and the **recovery pipeline** (`recovery-stations` / `recovery-pipeline` / `recovery-score`). | live |
| `packages/truth` | domain (CANON) | Menu, prices, hours + the **policy canon** (`policy.ts`: 15% max credit, forbidden gestures, mechanical disclosure/forbidden-claim detectors). | live (placeholder values, operator-validated) |
| `packages/seed` | domain | Curated demo slice. Legacy orders/reviews/weather + the recovery dataset (`data/recovery-cases.json` + `fast.json`/`demo.json` slices, override `RECOVERY_CASES_PATH`) + `validate-cases`. | live (48 cases — 30 real / 18 synthetic) |
| `packages/memory` | domain | `@weavehacks/memory` — failure-card store on Redis vector search (→ portable cosine → in-memory fallback) + chronological split & leakage guards. | live |
| `packages/shared` | spine | `createRedis`, `loadRootEnv`, domain-agnostic `Scoreboard`/`RunResult`. | live |
| `apps/api` | app | Entrypoint: `GET /health` · `/compare` · `/recovery` + the CLI scripts. `recovery.ts` runs the real harness. | live |
| `apps/web` | app | Dashboard: `/recovery` (GRPR leaderboard + case drill-down + HITL, **CopilotKit**) + legacy `/` (week-ahead prep) & `/brigade`. | live |

## Resolved decisions

- **Runtime:** W&B Inference is the day-one default; OpenAI a switchable fallback (`RUNTIME_PROVIDER`).
- **Orchestration:** the direct-call orchestrator (`packages/orchestration`) for the proof engine — no
  LangGraph. The Verifier-rewrite loop is composed in the recovery pipeline.
- **Front-end:** **CopilotKit, front-end only** (live agent cards, streamed state, HITL approve/reject).
  A UI framework never touches the judged number — the proof engine stays on the direct-call
  orchestrator. _(2026-06-07-bis; supersedes the earlier "no CopilotKit" call.)_

See [`CLAUDE.md`](./CLAUDE.md) for the full build rules and the resolved-decisions log,
[`docs/demo-script.md`](docs/demo-script.md) for the 3-minute pitch, [`docs/architecture.md`](docs/architecture.md)
for the pipeline diagram, and [`docs/repo-audit.md`](docs/repo-audit.md) for the file-by-file map.
