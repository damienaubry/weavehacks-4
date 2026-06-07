# Judge Q&A defense — Grounded Recovery Copilot

> **The spine (read this first, internalize it).** We do **not** claim "our team reliably beats the
> best solo by +10 GRPR." At N=16 the run-to-run spread is wider than that gap, and one of our own
> judged runs has the team *losing* to solo. What we **do** claim is unfakeable and holds in **every**
> run: **GRPR is mechanical** (no LLM judge), **compute is matched** (solo always spent the most), and
> the **Verifier-forced v1→v2 rewrite** is deterministic to watch. We lead with the **mechanism**, not
> a point estimate, and we **own the variance out loud** — the harness even prints the honesty note
> for us. Honesty is the pitch. A judge who tries to "catch" us with our own bad run finds we already
> put it on the table.

---

## The real numbers (know what a judge can open)

There are several report artifacts on disk; they disagree because **N is small and generation is
stochastic**. Do not hide this — narrate it.

| Artifact | N | solo | team | team+memory | rc-real-025 | solo tokens |
|---|---|---|---|---|---|---|
| [recovery-report.json](recovery-report.json) (served-style, working tree) | 16 (9R/7S) | 80% | **90%** | 80% | solo fail / team **pass** | 224,794 |
| [recovery-report.judged.json](recovery-report.judged.json) (newest) | 16 (9R/7S) | 80% | **60%** | 80% | solo fail / team **fail** | 553,595 |
| committed `recovery-report.json` (git HEAD, fast slice) | 8 (5R/3S) | 60% | **100%** | 80% | — | 117,830 |
| [recovery-report-killshot.json](recovery-report-killshot.json) (`--no-verifier`) | 8 (5R/3S) | 100% | 60% | 60% | — | 118,228 |

**Robust across ALL of the above** (these are what every rebuttal stands on):
1. **Solo spent the MOST compute in every run** (224k / 553k / 118k producer tokens — always the
   highest of the three). So wherever the team matched or beat solo, it did so on **less** compute;
   the team never wins by spending more.
2. **GRPR is mechanical** — grounding via `checkGrounding`, triage/ticket deterministic, policy by
   canon rules. No LLM scores the headline.
3. **`team+memory` never beat `team`** — we make **no** Layer-2 (cross-run memory) win claim anywhere.
4. The **Verifier blocks the Writer's v1 and forces a grounded v2** — deterministic to watch in Weave.

> **Never recite numbers from memory on stage.** Read the rows off the live `pnpm recovery` CLI or the
> on-screen leaderboard. If asked for a figure, point at the screen.

---

## Attacks → one-line rebuttals

Ordered hardest-first. Every rebuttal below is **true given the artifacts above** — no inflation.

### The lethal ones (the variance attacks — expect these)

- **"Your own `recovery-report.judged.json` shows the team LOSING — team 60% vs solo 80%. Which run
  is real?"**
  → "Both are real — that's the point. At N=16 the spread (team 60–100% across runs) is wider than any
  gap, so we don't sell a point estimate; we sell the **mechanism**: same model + tools, solo spent the
  most, and toggling only the Verifier changes the grounding outcome. We put the losing run on the
  table because honesty is the asset."

- **"Run it again and the headline flips. That's noise, not a finding."**
  → "Correct at this N — and we say so. The **load-bearing claim is the deterministic mechanism**
  (Verifier off ⇒ grounding collapses; v1→v2 rewrite rescues drafts), shown per-case in Weave, not the
  aggregate margin. Our harness even prints `⚠ HONESTY: solo ≥ team — no attributable team win on this
  run` and tells us to report it as-is."

- **"Your kill-shot runs on a different, easier 8-case slice where solo is already 100%. That's a
  slice swap, not an ablation."**
  → "Conceded and owned — the `--no-verifier` run is a separate 8-case slice. Its claim is **narrow and
  within-slice**: on the *same* cases, flipping only the Verifier flag drops the team's grounding pass
  rate to 60%. It's an illustration that the Verifier is load-bearing, not a cross-slice comparison to
  solo. The clean same-16 ablation is the next experiment."

- **"N=16, rows on a held-out *subset* of those 16 — a 90-vs-80 'win' is one case. Where's your
  confidence interval?"**
  → "There isn't one — at N≈10–16 a 10-point gap is inside binomial noise and we won't pretend
  otherwise. We lean on the **direction where it holds** and on the **case-level mechanism** that's
  deterministic to verify, never on statistical significance we don't have."

### The metric attacks

- **"Your score is just an LLM judge."**
  → "No — all four GRPR conjuncts are mechanical: grounding via `checkGrounding` (no LLM), triage and
  ticket deterministic, policy by canon rules. The **only** LLM in scoring is a narrow over-promise
  check that's **opt-in (default OFF)**, fail-safe, on an independent model, and can only ever *tighten*
  `policy_ok`, never relax it." ([recovery-score.ts](packages/agents/src/recovery-score.ts))

- **"Your grounding matcher is 'deliberately generous' (±1 / ±8%, any-tool match) — that's presence,
  not grounding."**
  → "Generous **on purpose** — it under-counts hallucinations, so any gap we measure is a **lower
  bound**. The honest framing is 'even under a lenient checker the solo still ships an ungrounded
  claim,' not 'grounding is airtight.'"

- **"The scorer's policy/menu 'anchor' pass credits whoever calls `policy_lookup` — i.e. the team."**
  → "It's applied **identically to all three variants** and the token must really appear in a captured
  tool result — it corrects a verbatim-matcher blind spot, it doesn't invent grounding. If you want, we
  can report grounding with and without it; the mechanism doesn't depend on it."

- **"You only tested one tolerance. Tighten it and does the gap survive?"**
  → "Fair — one tolerance, and it cuts **against** us (generosity flatters solo). A tolerance sweep is
  the right next experiment; we'd expect the gap to grow, not vanish, as it tightens."

### The "more compute / weak baseline" attacks

- **"The team just used more compute."**
  → "The opposite — **solo spent the most in every run** (e.g. 224,794 tok / 129 calls vs team's
  150,975 / 100). Same model, same tools; solo gets self-revision retries so its budget ≥ team's. The
  CLI prints the parity line `solo … calls/case ≥ each team variant`. The team never wins on budget."

- **"A better solo prompt would close the gap."**
  → "Maybe — which is exactly why we **don't** rest on the rate. Solo is already a strong baseline
  (same tools, self-revision, ≥ budget) and still ships ungrounded drafts like rc-real-025; the only
  thing the kill-shot adds and removes is the **independent Verifier**."

- **"Equal tokens spent *stupidly* (blind retries) isn't a fair baseline."**
  → "That asymmetry **is** the thesis, not a cheat: same model, same tools, *more* budget for solo —
  the only thing solo lacks is a second agent giving grounded feedback. Measuring that is the point."

- **"So the real result is just 'same quality, cheaper'?"**
  → "Yes, and we'll take it: at ≥-parity budget the team reaches equal-or-better GRPR for **~33–50%
  fewer tokens and fewer calls** — even where accuracy ties, the team strictly dominates on cost. That
  *is* a multi-agent payoff."

### The "is it really multi-agent" attacks

- **"This is one LLM in a trenchcoat — your Verifier is mechanical, so it's 3 LLMs + a linter."**
  → "Correct and **deliberate** — the Verifier is mechanical so the headline has no LLM judge. The
  multi-agent effect is the *conflict it creates*: a deterministic block that forces the Writer's
  v1→v2 rewrite. The win is the rewrite, not a fourth chatbot."

- **"Your roster could be decorative."**
  → "Each role has a required conflict enforced in code — `assertEveryRoleHasConflict()` in
  [roles.ts](packages/agents/src/roles.ts); a role with no conflict doesn't ship."

### The self-improvement attacks

- **"`team+memory` (80%) is BELOW `team` (90%) — your self-improvement row is a regression."**
  → "Yes — and we report it as a **null/negative**, never a win. The self-improvement we stand behind
  is **Layer 1**, the within-session v1→v2 rewrite, which we count per case (read the exact
  `rescued X/Y` straight off the live CLI honest line)."

- **"Memory is leakage / caching."**
  → "Chronological **held-out** split — memory is warmed only on the earliest cases and scored only on
  later held-out ones (all three rows on that same slice); cards store failure **patterns**, never gold
  labels; the store is **reset** before the scored pass. And it didn't beat team anyway — nothing to
  inflate." ([memory.ts](packages/agents/src/memory.ts))

- **"Your synthetic paraphrase-variants could leak across the split."**
  → "A real risk we haven't stress-tested — but cards carry patterns/tags not labels, the store resets,
  and since memory was **neutral-to-negative**, any leakage would only have *inflated* a result we're
  **not** claiming."

### The case + data attacks

- **"Your hero case rc-real-025: solo only 'failed' on a grounding technicality — the customer
  *literally* said half the order was missing. You penalize a true fact."**
  → "Right — GRPR enforces **tool-grounding, not world-truth**, and that's the lesson: solo asserted an
  operational claim with **zero tool backing**, which in a *published* reply is exactly the
  hallucination risk we exist to catch. The team grounded the same intent into a ledger and a
  within-policy gesture. The traceability discipline is the product."

- **"Both replies look fine to a human — the FAIL feels arbitrary."**
  → "That's the value: two warm letters, but one makes an **unsourced operational promise** and the
  other doesn't. In public reputation terms, ungrounded confidence is the liability."

- **"Is the restaurant / data even real?"**
  → "Real operator, real Le Kyoto Google reviews — **30 of 48 cases are verbatim**; the other 18 are
  **clearly-marked synthetic** variants for rarer incidents; menu/prices/hours/policy are verifiable
  canon. Not a toy world." ([truth/policy.ts](packages/truth/src/policy.ts))

- **"All your *critical* incidents are synthetic."**
  → "Stated upfront: Le Kyoto is genuinely ~4.7★, so the disasters **are** synthetic by necessity — and
  honestly labeled. We defend mechanical grounding+policy behavior under a truth constraint, not 'these
  complaints happened.'"

- **"Does it hold beyond one model?"**
  → "Only the **sign** transfers, and we say exactly that: where the gap held it was solo < team on
  both W&B Inference (GLM) and OpenAI (gpt-4o-mini); the **magnitude does not transfer** and one judged
  run inverts. We claim sign-where-it-holds + mechanism, never 'magnitude held.'"

- **"Your demoed numbers aren't even committed."**
  → "True — the 16-case reports are staged artifacts; the committed file is the older 8-case slice.
  Everything regenerates with `pnpm recovery`, every case traced in Weave; we'll re-run live if you want
  the number made, not trusted."

---

## Honest concessions — say them first, they're the strength

1. **At N=16 there is no statistical significance**, and one judged run has the team losing. We don't
   claim a reliable rate gap. *(Mechanism + cost are the claims.)*
2. **Cross-run memory was neutral-to-negative** → we fall back to the within-session v1→v2 rewrite.
3. **The kill-shot is a separate, easier slice** → it's a within-slice illustration, not a clean
   cross-slice ablation.
4. **Critical cases are clearly-marked synthetics** (a 4.7★ restaurant lacks disasters).
5. **We iterated on gpt-4o-mini and judged on W&B GLM** → only the sign of the effect is portable.
6. **The grounding matcher is generous and single-tolerance** → our measured gap is a lower bound.

## Two reflexes when cornered

- **Retreat to the mechanism, not the number.** "Toggle the Verifier; watch the v1→v2 rewrite; every
  claim links to the tool query in Weave." That's deterministic and unfakeable; the rate is not.
- **Out-honest the judge.** Our harness *prints* `⚠ HONESTY: solo ≥ team — no attributable team win on
  this run`. We built the honesty in. Concede fast, then pivot to what holds.
