# Demo script — Grounded Recovery Copilot (3 minutes)

The judged story: **same base model, same tools, same compute budget — the solo ships an ungrounded
claim, and the team's Verifier catches it.** The number that proves it is the
**GRPR** (Grounded Recovery Pass Rate), mechanical, in Weave.

> One-liner to land at the end: _"On held-out cases from Le Kyoto's real Google reviews, at matched
> compute, the multi-agent team beats the best solo on GRPR — and it's the Verifier, not extra
> budget. Every claim traced to the query that proves it."_

> ✅ **State check (the real result).** `pnpm recovery` runs the **real** harness (three variants,
> mechanical GRPR, per-case parity guard, honest held-out memory note) and writes
> `recovery-report.json`; `GET /recovery` serves that cache; the web `/recovery` view (leaderboard +
> rc-real-025 drill-down + HITL, on CopilotKit) renders it. The **full dataset** is **48 real-derived
> cases — 30 verbatim from Le Kyoto's Google reviews, 18 clearly-marked synthetic** (majority real);
> the **scored slice in `recovery-report.json` is 16 cases (9 real / 7 synthetic)**. We iterated fast
> on a cheap dry-run slice (gpt-4o-mini); the captured/judged run is **16 cases on W&B Inference**
> (same harness, same three variants, same model). Read the rows off the CLI / `recovery-report.json`
> — never recite from memory.

---

## Before you go on stage

```bash
pnpm typecheck                                   # green gate (no keys)
pnpm --filter @weavehacks/seed validate-cases    # dataset valid + incident distribution (no keys)

# DRY RUN — the fast 8-case slice (cheap, gpt-4o-mini); capture the three rows + the sample case
RUNTIME_PROVIDER=openai RECOVERY_CONCURRENCY=6 \
  RECOVERY_CASES_PATH=packages/seed/data/recovery-cases.fast.json \
  pnpm recovery

# JUDGED RUN — 16 cases on W&B Inference (on-brand); this writes the report /recovery serves
RECOVERY_CONCURRENCY=3 \
  RECOVERY_CASES_PATH=packages/seed/data/recovery-cases.demo.json \
  pnpm recovery

pnpm dev                                         # web :3000 / api :3001 — open http://localhost:3000/recovery
```

Record the three rows, the parity line, the honest memory note, and the sample case from the run so
the live demo has no surprises. (Slice size is just which JSON `RECOVERY_CASES_PATH` points at — the
harness has no case cap.)

## 0:00–0:30 · The setup (why this is real)

- "We operate Le Kyoto, a Japanese takeout near Paris. These are our **real Google reviews** — 30 of
  the 48 cases are **verbatim** customer reviews; the rest are clearly-marked synthetic variants we
  use to cover the rarer incident types. We never pass a guess off as Le Kyoto's truth."
- The product: a copilot that turns one review into a **recovery package** — triage, a **grounded
  public reply**, and an **internal action ticket**. Nothing auto-publishes (HITL).
- The claim we'll prove: a single agent is not enough; a small coordinated team is — and we measure
  it, **mechanically**.

## 0:30–1:15 · The leaderboard (the headline, first)

- Open the web `/recovery` view (or the Weave leaderboard): three rows.
  - `solo` — **80%** GRPR.
  - `team` (Curator → Analyst → Writer → **Verifier**) — **90%**.
  - `team+memory` — **80%** (cross-run memory; on this small slice it did **not** beat team — we show
    it honestly, see 2:15).
- Point at the **budget column**: `solo 224,794 tok / 129 calls` vs `team 150,975 tok / 100 calls`
  (and `team+memory 90,804 tok / 61 calls`). "Solo spent **~1.5× the tokens** and more calls, and
  still scored lower. The per-case parity guard asserts solo spends ≥ each team variant — so the gap
  is the **Verifier**, not compute."
- "GRPR is **binary and mechanical**: per case, triage correct AND every claim backed by our real
  data (`checkGrounding`) AND policy respected (canon rules) AND a valid ticket. No LLM judge decides
  the headline." (The leaderboard is scored on the chronological **held-out** slice so all three
  variants are apples-to-apples; memory is warmed only on the earlier cases.)

## 1:15–2:15 · One case, drilled in (why solo fails, why team passes)

- Click the sample case **`rc-real-025`** — a **real Google review**: _"Inadmissible, nous venons de
  commander et il manque la moitié de la commande — ce n'est pas normal"_ (verbatim; gloss:
  "unacceptable — we just ordered and half the order is missing — this isn't right"). Gold incident:
  `wrong_or_missing_item`.
- **Solo** reply, with the failure highlighted: it apologizes and offers a within-policy 15% credit,
  but it **asserts an ungrounded claim** → the mechanical grounding check fires:
  **`claim non sourcée : « missing items in the order »`** → one conjunctive check fails →
  **GRPR: fail**. (The solo states a fact about the order that no tool result backs.)
- **Team** reply: same apology and a within-policy credit, but **every claim is grounded** — and a
  valid ticket → **all four checks green → pass**. The drill-down shows the Writer's v1 (the
  ungrounded draft the solo would ship) and the post-Verifier v2.
- Open the **Weave trace**: `agent.recovery.*` per station, `recovery.case` per case — each claim
  links to the tool query that grounds it.

## 2:15–2:50 · Self-improvement — and the honest read

- "Self-improvement shows two ways. The one that's **real on this slice is within-session**: the
  Verifier blocks the Writer's ungrounded v1 and forces a grounded v2. The CLI counts exactly how
  many team cases that **v1→v2 rewrite rescued** (v1 would fail, the final passes)."
- "The second is cross-run **failure-card memory** (`@weavehacks/memory`): on a block, the Verifier
  writes a card to Redis; a later similar case retrieves it before drafting. The store is reset and
  warmed only in chronological order — no leakage."
- **Be honest, out loud — this is a strength.** On this small slice **`team+memory` (80%) did not beat
  `team` (90%)**. The CLI prints the verdict; read it aloud: _"team+memory did NOT beat team — report
  the within-session v1→v2 beat instead; do not inflate the third row. Layer-1 fallback: the Verifier's
  v1→v2 rewrite rescued N/Y team case(s)."_ "We report what the data says; the defensible
  self-improvement here is the Verifier's rewrite, not cross-run memory."

## 2:50–3:00 · The kill shot

- "Want to see it's the coordination, not the model? **Toggle the Verifier off.**"
  → `pnpm recovery --no-verifier` → GRPR collapses back toward solo (the ungrounded claims slip through).
  "Unfakeable. Same model, same tools, same budget — the orchestration is the only difference."
  (Tip: point it at a separate cache so the kill-shot doesn't overwrite the good `/recovery` report —
  `RECOVERY_REPORT_CACHE=recovery-report-killshot.json`.)

---

## Numbers to drop in

The **canonical run** — 16 cases, captured in `recovery-report.json`, the real result `/recovery` serves:

- Dataset: full **48 cases** (30 real / 18 synthetic); **scored slice 16** (9 real / 7 synthetic).
- `solo` GRPR **80%** · `team` GRPR **90%** · `team+memory` GRPR **80%** (held-out).
- Budget parity: `solo 224,794 tok / 129 calls` vs `team 150,975 tok / 100 calls` (and
  `team+memory 90,804 tok / 61 calls`) — solo spends ≥ each team variant.
- Sample case `rc-real-025` (gold `wrong_or_missing_item`): solo ships an **ungrounded claim**
  (_"missing items in the order"_) → **FAIL**; team **grounds every claim** → **PASS**.
- Kill-shot: `pnpm recovery --no-verifier` → team GRPR collapses toward solo.

These numbers are whatever `recovery-report.json` currently holds — **always read the rows off the
file, never recite from memory.** The cheap dry-run slice (`recovery-cases.fast.json`, gpt-4o-mini)
is for rehearsal only; the judged/served numbers are the 16-case run above.

## The honest caveats (say them — they're strengths)

1. The metric is **strict and mechanical** — no LLM judge on the headline; the over-promise check is a
   narrow, isolated, opt-in (`--judge`) flip on the policy axis only.
2. **Small N** — the scored slice is **16 cases**, so team 90% is on a few cases; read the rows off
   `recovery-report.json` and don't over-claim the gap.
3. **Cross-run memory was neutral on this slice** (80% < 90%) → we fall back to the within-session
   v1→v2 rescue. Reading the honest note aloud is credibility, not weakness.
4. We **iterated on gpt-4o-mini** for speed; the **judged run is W&B Inference** — same harness, same
   three variants, same model. (W&B Inference default model `zai-org/GLM-5.1`, pinnable with
   `RECOVERY_MODEL=<id>` so every variant is matched.)

## Pre-flight checklist

- [ ] `pnpm typecheck` green; legacy `pnpm prep` / `pnpm grounding` still run.
- [ ] `pnpm --filter @weavehacks/seed validate-cases` passes (no malformed cases / unknown tags).
- [ ] `pnpm recovery` prints 3 rows with `solo` < `team`, the parity line "solo spends ≥ team per case",
      and the honest memory note.
- [ ] `GET /recovery` returns the real `recovery-report.json` (not the `placeholder:true` stub).
- [ ] Web `/recovery` renders the leaderboard + the `rc-real-025` drill-down (solo ungrounded-claim
      fail / team grounded pass) + the v1→v2 rewrite + HITL approve/reject.
- [ ] One Weave trace open: a `recovery.case` showing the solo-fail vs team-pass.
- [ ] `pnpm recovery --no-verifier` collapses the GRPR (kill-shot wired; separate cache).
- [ ] Runtime key set (`WANDB_API_KEY` for the W&B judged run; or `OPENAI_API_KEY` +
      `RUNTIME_PROVIDER=openai` for the fast slice); Redis up for the `team+memory` failure-cards (it
      degrades to an in-memory mirror if Redis is down).

## If a live run is risky (network/credits)

1. Use the captured `recovery-report.json` numbers + screenshots; walk the saved Weave trace.
2. Say so honestly: "we iterated on a cheap slice; the judged run is 16 cases, same harness, same
   three variants" — the captured 16-case numbers are real and in `recovery-report.json`.
3. Fallback proof-of-mechanism: `pnpm grounding` — the mechanical solo-vs-team grounding eval that
   shares `checkGrounding` with the GRPR. Same idea, smaller surface.
