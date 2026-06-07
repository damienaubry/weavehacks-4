# FS-5 — Judge Q&A defense + live-failure backup

1h to submission. Two NEW files only — `docs/qa-defense.md` and `docs/backup-demo.md`. Do NOT touch
the front-end, demo-script, harness, or README. Read `CLAUDE.md` + `recovery-report.judged.json` for
real numbers. Goal: the presenter can defend any attack and survive a live-demo failure.

## `docs/qa-defense.md` — anticipated attacks + crisp rebuttals (one line each)

- "Your score is just an LLM judge." → GRPR is mechanical: grounding via `checkGrounding`,
  triage/ticket deterministic, policy by rules; the over-promise judge is narrow, isolated, opt-in.
- "The team just used more compute." → Per-case parity guard: solo spent ≥ team (show the budget
  line); solo spent MORE tokens and scored lower.
- "A better solo prompt would close the gap." → The solo baseline is strong: same tools, self-revision,
  ≥ budget — and still fails. The only added thing is the independent Verifier.
- "Memory is leakage / caching." → Chronological held-out split; memory only writes failure-cards
  (not labels); store reset before the scored pass. (And it didn't even beat team — no inflation.)
- "Your memory made it WORSE." → Yes, on this run cross-run memory dropped below team — we report it
  honestly; the real, defensible self-improvement is the within-session v1→v2 rewrite (rescued N cases).
- "Why a restaurant / is the data real?" → Real operator, real Google reviews (30/48 verbatim),
  verifiable truth (menu/policy canon). Not a toy world.
- "Does it hold beyond one model?" → Gap held on W&B Inference (GLM) AND OpenAI (gpt-4o-mini).
- "Small N." → Owned: demo slice is small; the direction (solo < team) is stable across runs + models;
  parity holds per-case.

## `docs/backup-demo.md` — if the live run/page fails on stage

1. The captured judged numbers (from `recovery-report.judged.json`) + the kill-shot number.
2. Where the screenshots live (leaderboard, the rc-real-025 drill-down, one Weave trace) — list the
   exact files/paths the presenter opens instead of going live.
3. The fallback line: "iterated on gpt-4o-mini, judged on W&B Inference — same harness, same 3 variants;
   here are the captured numbers + the live Weave trace." Honesty is part of the pitch.
4. A 20-second "if everything breaks" verbal script that still lands the thesis from the screenshots.

## Done when
- [ ] qa-defense.md: every likely attack has a one-line, true rebuttal grounded in the real result.
- [ ] backup-demo.md: the presenter can deliver the whole story from screenshots if the laptop fails.
