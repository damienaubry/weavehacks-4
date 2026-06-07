# Demo script — Grounded Recovery Copilot (3 minutes)

The judged story: **same model, same tools, same compute budget — the solo hallucinates and
over-promises, the team catches it, the team with memory doesn't even make the mistake anymore.**
The number that proves it is the **GRPR** (Grounded Recovery Pass Rate), mechanical, in Weave.

> One-liner to land at the end: *"On N held-out cases from Le Kyoto's real reviews, at matched
> compute, the multi-agent team beats the best solo on GRPR — then improves again after automatic
> memory of the critic's feedback. Every claim traced to the query that proves it."*

---

## 0:00–0:30 · The setup (why this is real)

- "We operate Le Kyoto, a Japanese takeout near Paris. These are our **real Google reviews**."
- The product: a copilot that turns one review into a **recovery package** — triage, a **grounded
  public reply**, and an **internal action ticket**. Nothing auto-publishes (HITL).
- The claim we'll prove: a single agent is not enough; a small coordinated team is — and we measure
  it, mechanically.

## 0:30–1:15 · The leaderboard (the headline, first)

- Open the **Weave leaderboard** (or the web `/recovery` view): three rows.
  - `solo` — low GRPR.
  - `team` (Curator→Analyst→Writer→**Verifier**) — much higher.
  - `team+memory` — higher still.
- Point at the **budget column**: tokens/calls within ±5%. "Same model, same tools, **matched
  compute**. The only thing we added is coordination — an independent Verifier, then memory."
- "GRPR is **binary and mechanical**: per case, triage correct AND every claim backed by our real
  data AND policy respected AND a valid ticket. No LLM judge deciding the headline."

## 1:15–2:15 · One case, drilled in (why solo fails, why team passes)

- Click the sample case (a 2★: *"delivered 50 min late, the tonkotsu ramen was cold"*).
- **Solo** reply, with the failures highlighted:
  - invents *"under 20 min on average"* → **claim not in the data**;
  - *"full refund + a free meal"* → **policy over-promise**;
  - **no internal ticket**. → the 4 conjunctive checks fail → **GRPR: fail**.
- **Team** reply: apology + acknowledges the delay + a **15% credit, per our policy** (grounded, no
  over-promise) + a valid ops-delivery ticket → **all 4 green → pass**.
- Open the **Weave trace**: each tool call is an op; each claim links to the query that grounds it.

## 2:15–2:50 · Self-improvement (the third row)

- "Earlier in the run, the Writer over-promised a refund. The Verifier wrote a **failure-card** to
  Redis." Show the card (`over_promise_refund`).
- "On the next similar case, the team **retrieves that card** and doesn't repeat the mistake — that's
  `team+memory`." Chronological split, so it's not leakage.
- Honest note (only if asked / if it didn't beat team cleanly): within-session v1→v2 rewrites already
  raise grounding live; memory is the across-run layer.

## 2:50–3:00 · The kill shot

- "Want to see it's the coordination, not the model? **Toggle the Verifier off.**" → GRPR collapses
  back toward solo. "Unfakeable. Same model, same tools, same budget — the orchestration is the
  difference."

---

## Pre-flight checklist

- [ ] `pnpm recovery` prints 3 rows, `solo` < `team` ≤ `team+memory`, budgets shown.
- [ ] `GET /recovery` returns the real `RecoveryReport` (not `placeholder: true`).
- [ ] Weave traces visible for at least one solo-fail and the same team-pass case.
- [ ] Web `/recovery` leaderboard + drill-down render; HITL approve/reject works.
- [ ] Dataset is majority `source:"real"`, validated by the operator.
- [ ] `pnpm typecheck` + `pnpm build` green; legacy `pnpm prep` / `pnpm grounding` still run.
- [ ] The "toggle Verifier off" path is wired and demoable.
