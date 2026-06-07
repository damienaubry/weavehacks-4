# Demo script — Grounded Recovery Copilot (3 minutes)

The judged story: **same base model, same tools, same compute budget — the solo hallucinates and
over-promises, the team catches it, the team with memory doesn't even make the mistake anymore.** The
number that proves it is the **GRPR** (Grounded Recovery Pass Rate), mechanical, in Weave.

> One-liner to land at the end: _"On N held-out cases from Le Kyoto's real reviews, at matched
> compute, the multi-agent team beats the best solo on GRPR — then improves again after automatic
> memory of the Verifier's feedback. Every claim traced to the query that proves it."_

> ✅ **State check.** The pipeline is wired end-to-end and `pnpm typecheck` is green: `pnpm recovery`
> runs the **real** harness (three variants, mechanical GRPR, parity guard, honesty note), `GET
> /recovery` serves real numbers, and the web `/recovery` view (leaderboard + drill-down + HITL, on
> CopilotKit) renders. Two honest caveats for the pitch: (1) **the dataset is 12 clearly-marked
> synthetic cases (0 real)** — the operator loads the real Google reviews to make "grounded in real
> data" literal; (2) **GRPR numbers are produced live by your run** (real LLM agents, spends credits) —
> do a dry run first and read the actual rows off the CLI/Weave; never recite numbers from memory.

---

## Before you go on stage

```bash
pnpm typecheck                                   # green gate (no keys)
pnpm --filter @weavehacks/seed validate-cases    # dataset is valid + see the incident distribution (no keys)
pnpm recovery                                    # DRY RUN — capture the three real rows + the sample case
pnpm dev                                         # web :3000 / api :3001 — open http://localhost:3000/recovery
```

Record the three rows and the chosen sample case from the dry run so the live demo has no surprises.

## 0:00–0:30 · The setup (why this is real)

- "We operate Le Kyoto, a Japanese takeout near Paris. These are our **real Google reviews**." (Be
  honest if asked: the demo slice is synthetic stand-ins shaped like the real ones; the operator drops
  in the real reviews — same harness.)
- The product: a copilot that turns one review into a **recovery package** — triage, a **grounded
  public reply**, and an **internal action ticket**. Nothing auto-publishes (HITL).
- The claim we'll prove: a single agent is not enough; a small coordinated team is — and we measure
  it, **mechanically**.

## 0:30–1:15 · The leaderboard (the headline, first)

- Open the web `/recovery` view (or the Weave leaderboard): three rows.
  - `solo` — low GRPR.
  - `team` (Curator → Analyst → Writer → **Verifier**) — much higher.
  - `team+memory` — higher still.
- Point at the **budget column**: the CLI's parity guard asserts solo spent ≥ the team's compute.
  "Same base model, same tools, **matched compute**. The only thing we added is coordination — an
  independent Verifier, then memory."
- "GRPR is **binary and mechanical**: per case, triage correct AND every claim backed by our real
  data AND policy respected AND a valid ticket. No LLM judge deciding the headline."

## 1:15–2:15 · One case, drilled in (why solo fails, why team passes)

- Click the sample case (a 2★: _"delivered 50 min late, the tonkotsu ramen was cold"_).
- **Solo** reply, with the failures highlighted:
  - invents _"under 20 min on average"_ → **claim not in the data**;
  - _"full refund + a free meal"_ → **policy over-promise**;
  - **no internal ticket**. → the 4 conjunctive checks fail → **GRPR: fail**.
- **Team** reply: apology + acknowledges the delay + a **15% credit, per our policy** (grounded, no
  over-promise) + a valid ops-delivery ticket → **all 4 green → pass**. The drill-down shows the
  Writer's v1 (the draft the solo would ship) and the post-Verifier v2.
- Open the **Weave trace**: `agent.recovery.*` per station, `recovery.case` per case, `recovery.score`
  per score — each claim links to the query that grounds it.

## 2:15–2:50 · Self-improvement (the third row)

- "Earlier in the run, the Writer over-promised a refund. The Verifier wrote a **failure-card** to
  Redis (`@weavehacks/memory`)." Show the card (`over_promise_refund`).
- "On the next similar case, the team **retrieves that card** before drafting and doesn't repeat the
  mistake — that's `team+memory`." The store is reset before this pass and warmed only in
  chronological order, so it's not leakage.
- Honesty: the CLI prints whether `team+memory` beat `team` **cleanly**. If it didn't on this run, say
  so and fall back to the within-session beat — the Verifier's v1→v2 rewrite already rescued
  `rewriteRescued` team cases. (Reading the real `honest` note out loud is a strength, not a weakness.)

## 2:50–3:00 · The kill shot

- "Want to see it's the coordination, not the model? **Toggle the Verifier off.**"
  → `pnpm recovery --no-verifier` → GRPR collapses back toward solo. "Unfakeable. Same model, same
  tools, same budget — the orchestration is the difference."

---

## Numbers to drop in (from your dry run)

Read these off the actual `pnpm recovery` output / Weave — don't invent them.

- Dataset: **N** cases (today: 12 synthetic; majority `source:"real"` once the operator loads reviews).
- `solo` GRPR **__%** · `team` GRPR **__%** · `team+memory` GRPR **__%**.
- Budget parity: solo **__** tok / **__** calls vs team **__** tok / **__** calls (solo ≥ team).
- Kill-shot: `team --no-verifier` GRPR **__%** (≈ solo).

## Pre-flight checklist

- [ ] `pnpm typecheck` green; legacy `pnpm prep` / `pnpm grounding` still run.
- [ ] `pnpm --filter @weavehacks/seed validate-cases` passes (no malformed cases / unknown tags).
- [ ] `pnpm recovery` prints 3 rows, `solo` < `team` ≤ `team+memory`, with the parity line solo ≥ team.
- [ ] `GET /recovery` returns a real `RecoveryReport` (numbers from the live run, not placeholders).
- [ ] Web `/recovery` leaderboard + drill-down render; the v1→v2 rewrite + HITL approve/reject show.
- [ ] Weave traces visible for a solo-fail and the same team-pass case (`recovery.case`/`recovery.score`).
- [ ] `pnpm recovery --no-verifier` collapses the GRPR (kill-shot wired).
- [ ] Runtime key set (`WANDB_API_KEY` or `OPENAI_API_KEY` + `RUNTIME_PROVIDER=openai`); Redis up for
      the `team+memory` failure-cards (it degrades to an in-memory mirror if Redis is down).

## If a live run is risky (network/credits)

1. Use the captured dry-run numbers + screenshots; walk the saved Weave trace.
2. Fallback proof-of-mechanism: `pnpm grounding` — the mechanical solo-vs-team grounding eval that
   shares `checkGrounding` with the GRPR. Same idea, smaller surface.
3. Be explicit that the dataset is synthetic stand-ins today and the operator loads the real reviews —
   honesty is part of the pitch (and a hard project rule).
