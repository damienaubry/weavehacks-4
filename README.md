# Brigade

A **service-as-software** multi-agent system for a real restaurant — **Le Kyoto**, a Japanese
takeout/delivery spot near Paris. Named after the kitchen brigade: a head chef delegates to
specialized stations. Specialized AI agents handle different restaurant operations, **every
agent's output is scored by a Critic, and the system measurably improves from that feedback.**

Built at **WeaveHacks 4**. See [`CLAUDE.md`](./CLAUDE.md) for the build rules and the two open
implementation decisions.

## The thesis (what we're judged on)

**Multi-agent only earns its place when a solo agent visibly fails and a coordinated team
visibly succeeds — and we prove it with numbers in Weave.** The star is the **Critic**: it
wants data-grounded, specific output and *blocks* the producing agent until it gets it. That
clash, and the visible quality jump when it resolves, is the demo.

Headline: *"solo agent scores 5/10 and hallucinates; our team scores 8.5/10 with every claim
traced to POS/reviews — here's the Weave trace."*

## The hero loop

```
USER: "Prep for Friday dinner."
CHEF   → delegates to Prep, then Content
PREP   → [POS: last 8 Fridays] [weather: rain, 14°C] → prep sheet (~32 gyoza, ~15 shoyu ramen; skip soba)
CONTENT→ draft v1: "Rainy Friday? Hot ramen's calling."
CRITIC → 5/10: generic, no data hook, no CTA. "83% of 5★ reviews mention the broth — use it."
CONTENT→ draft v2: "Our 18-hour tonkotsu broth — the one 83% of you can't stop reviewing. Pre-order now."
CRITIC → 8.5/10: grounded, specific, has CTA. ✅
CHEF   → presents prep sheet + approved post (HITL before anything publishes)
```

## Layout (pnpm + Turborepo)

| Package | What |
| --- | --- |
| `packages/orchestration` | Domain-agnostic core: roles, coordination loop, conflict resolution (highest authority wins; sensitive → human). |
| `packages/observability` | W&B Weave wrapper + the **solo-vs-team scoreboard** (`compareSoloVsTeam`). |
| `packages/runtime` | Inference: OpenAI + W&B Inference (OpenAI-compatible, switchable). |
| `packages/agents` | The Brigade roster (chef/prep/promo/content/reviews/critic/forge). Domain lives here. |
| `packages/truth` | **CANON** — menu, prices, hours. The source of truth conflicts resolve toward. |
| `packages/seed` | Curated demo slice (orders, reviews, weather). Pitch credibility, not canon. |
| `packages/memory` | Redis: scores, Critic feedback, review vector search, Forge gap log. |
| `packages/shared` | Redis client, env loader, cross-cutting types. |
| `apps/api` | Orchestration runtime entrypoint (`/health`, `/compare`; the CLI scripts). |
| `apps/web` | Dashboard: the Critic score jump, live agent cards, HITL approve/reject. |

## Run it

```bash
./start.sh          # one command: tools → install → .env → Redis → seed → health → dev
```

Or manually:

```bash
pnpm install
pnpm seed           # validate the curated seed slice (no keys, no credits)
pnpm dev            # web (:3000) + api (:3001)
pnpm health         # Redis ping + Weave hello-world
pnpm baseline       # run the SOLO agent alone (watch it fail)
pnpm compare        # THE SCOREBOARD: solo vs team, numeric delta
pnpm demo           # narrated demo: catch the contradiction, resolve/escalate, the number
pnpm --filter @weavehacks/api agent:check   # prove the runtime end-to-end (spends a little credit)
```

Requirements: Node 20+, pnpm, Docker (for Redis; otherwise bring your own `REDIS_URL`). Copy
`.env.example` → `.env`. Runtime agents use OpenAI and/or W&B Inference; Weave needs
`WANDB_API_KEY`. **The deterministic scoreboard (`pnpm seed`/`compare`/`demo`) runs with no
keys at all.**

## 3-minute demo script

1. **Setup (20s).** "Le Kyoto is a real restaurant we run. Its digital ops drift. Meet Brigade
   — a kitchen brigade of AI agents." Show the dashboard.
2. **Solo fails (40s).** Run the solo baseline: one agent writes the Friday post in one shot →
   generic, ungrounded, ~5/10. Show the Weave trace.
3. **Team wins (70s).** Run the team: Prep grounds demand in POS+weather, Content drafts, the
   **Critic blocks it** and demands the broth stat, Content rewrites → **8.5/10**. Show the
   5→8.5 jump live in Weave, every claim traced to a source.
4. **The number (20s).** `solo X% → team Y%`. "That delta is the whole thesis."
5. **Coda (15s, stretch).** Forge detects a gap and scaffolds a new agent. "And it can grow new
   stations." Stop.

## Status

Project **decided: Brigade.** Implementation choices resolved: **W&B Inference** runtime
(OpenAI fallback) + the **direct-call orchestrator** (no LangGraph/CopilotKit). The shared
spine is built and the deterministic stand-in scoreboard is green (solo 60% → team 100%).
**Next: implement the Content → Critic hero loop.**
