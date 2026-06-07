# Grounded Recovery Copilot — WeaveHacks 4 submission

**Grounded Recovery Copilot turns one real customer review into a triaged, grounded public reply +
an internal action ticket — and proves, mechanically, that a coordinated agent team beats a strong
solo agent.**

## The problem

Replying to customer reviews is open generation under a hard truth constraint. A single
hallucination is expensive: a wrong fact (hours, an ingredient) embarrasses the brand, and an
over-promised gesture (a full refund, a free meal) costs real money the moment it's published. A
solo LLM has no independent check on itself — it will happily ship a fluent, generous, *ungrounded*
reply. That's exactly the kind of task where a coordinated team should pull ahead, and where the gap
is unfakeable.

## What we built

A four-role pipeline over a real restaurant we operate — **Le Kyoto**, a small Japanese
takeout/delivery spot near Paris:

**Evidence Curator → Operational Analyst → Writer → Adversarial Verifier**, then a **human-in-the-loop
(HITL) gate** before anything is published.

The Curator pulls only authorized sources (review text, aggregated POS window, menu + policy facts);
the Analyst infers the incident type and builds a cited evidence ledger; the Writer drafts the
public reply + internal ticket **from the ledger only**; the Verifier independently challenges every
claim — unsupported? policy violation? over-promise? — and **blocks** the draft until it is grounded
and policy-safe (e.g. it rejects any gesture above Le Kyoto's 15% credit cap or any free-meal /
full-refund promise). The conflict is real: the Writer wants to ship a generous reply, the Verifier
refuses anything not in the ledger or over policy. That clash is what earns the multi-agent design.

The data is real: **30 of the 48 cases are verbatim Google reviews** of Le Kyoto; the rest are
clearly-marked synthetic variants (Le Kyoto is genuinely 4.7★, so the harshest cases are staged
honestly, never passed off as real).

## The metric — GRPR (Grounded Recovery Pass Rate)

Binary, **conjunctive**, and **mechanical**. For each case, `pass = 1` iff **all four** hold:

```
triage_correct ∧ all_claims_grounded ∧ policy_ok ∧ ticket_valid
```

There is **no LLM judge on the headline**: grounding reuses our mechanical `checkGrounding` (every
claim must trace to a real tool result), triage and ticket are deterministic schema checks, and
policy is deterministic rules — only a single, isolated "over-promise" check uses a narrow LLM, and
it never touches the grounding score.

**Judged run — W&B Inference (`zai-org/GLM-5.1`), 16 cases (9 real / 7 synthetic):**

| variant | GRPR | tokens | calls |
|---|---|---|---|
| solo | **80%** | 224,794 | 129 |
| team | **90%** | 150,975 | 100 |
| team + memory | 80% | 90,804 | 61 |

**Solo < team at matched compute.** The solo agent got a budget ≥ the team's and *spent more of it*
— 224,794 tokens / 129 calls versus the team's 150,975 / 100 — and still scored lower. The gap is
the **Verifier**, not the budget.

**What that looks like on one real case (`rc-real-025`, the drill-down captured in the run).** A real
1★ review reports *"il manque la moitié de la commande"* ("half the order was missing"). The **solo**
agent's reply asserts an unsupported claim — *missing items* it never verified against the evidence —
so `checkGrounding` fails it → **FAIL**. The **team**'s Verifier blocks that ungrounded claim; the
Writer regrounds the reply to what's actually supported, plus an internal ticket → **PASS**. Same
review, same model — only the independent check differs.

## Robustness — the direction held on two base models

We ran the same harness on two different inference backends — **W&B Inference (`zai-org/GLM-5.1`)**
and **OpenAI (`gpt-4o-mini`)** — and the `solo < team` direction held on both, not just one model's
quirk. (We cite a precise GRPR only where a saved run artifact backs it; the cross-model point is
stated as a direction, deliberately, rather than a ghost number.)

## Honesty (a strength, not a footnote)

- **The proof is the pattern, not a single number.** At N=16, GRPR has real run-to-run variance.
  What's robust is the *consistent direction* — solo < team across clean runs, across two base
  models, with per-case compute parity, plus the kill-shot below. One W&B run was excluded for
  cause: its retries inflated compute ~2.5× and broke parity (the solo/team budgets were no longer
  comparable), so it wasn't a valid measurement. We don't hang the claim on any one GRPR value.
- **Cross-run memory did not beat team on this run.** `team + memory` scored 80% vs team 90%. We
  report it instead of hiding it, and fall back to the **within-session self-improvement** that *did*
  work: the Verifier's v1→v2 rewrite loop, which blocks an ungrounded or over-promising draft and
  drives the Writer to a grounded, policy-safe one (the `rc-real-025` fail→pass above is that loop
  firing). Memory still cut the team's compute ~40% (90,804 vs 150,975 tokens) — cheaper, just not
  more accurate on this slice.
- **The kill-shot.** Toggle the Verifier off (`pnpm recovery --no-verifier`) and the team scores only
  **60% GRPR** (`recovery-report-killshot.json`) — its advantage vanishes. Remove the one component
  that does the coordinating and the gap is gone: it was the Verifier, not the model.
- **Small N, strict metric.** GRPR is deliberately unforgiving — one ungrounded claim or one euro
  over the cap fails the whole case. We'd rather report a modest, honest gap than a flattering, soft
  one.

## Tech

- **W&B Weave** — tracing *and* the scoreboard: every agent call, every Verifier scoring/rewrite,
  and every GRPR case is a traced op, so **each claim traces back to the exact query that grounds
  it**. The 3-row leaderboard (solo / team / team+memory, with token + call counts proving compute
  parity) lives in Weave.
- **W&B Inference** (`zai-org/GLM-5.1`) — runtime for the judged run; OpenAI `gpt-4o-mini` as a
  switchable second backend.
- **Redis** — failure-card memory with three graceful tiers (RediSearch KNN / portable cosine /
  in-memory).
- **CopilotKit** — the front-end only: live agent cards, streamed agent state, and the HITL
  approve/reject gate. It never touches the judged number.
- **TypeScript + Turborepo** monorepo; a domain-agnostic orchestration + observability core, with
  the restaurant logic isolated in the agent/truth/seed/memory packages.

## Links

- **Repo:** https://github.com/damienaubry/weavehacks-4
- **Weave project:** https://wandb.ai/aubry/weavehacks-4
- **The `/recovery` view** (3-row leaderboard + case drill-down + HITL): `pnpm dev` →
  http://localhost:3000/recovery (served from the judged `recovery-report.json`).
