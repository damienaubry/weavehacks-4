# FS-2 — Demo narrative + docs (align to the REAL result)

Final sprint. The docs still reference STALE numbers + a synthetic sample case. Your job: make every
doc tell the true, defensible story. Read `CLAUDE.md` first. NO code changes — docs only.

## The real story (use these, not the old placeholders)

- Headline (fast slice, held-out, matched compute): **solo 60% < team 100%**, and **solo spent ~2×
  the tokens** (117830 vs 65197) and still scored lower → the gap is the **Verifier**, not compute.
- `team+memory` = **80% < team 100%** on this slice → memory did NOT beat team. **Be honest:** report
  the **within-session v1→v2** beat (the Verifier's rewrite rescued cases) as the self-improvement;
  present cross-run memory as neutral on this slice (the CLI prints this honest note — read it aloud).
- Real sample case `rc-real-088` (a REAL Google review): *"Very average and tasteless… I do not
  recommend!"* → SOLO offers a **20% discount** = over-promise (policy cap is 15%) → FAIL; TEAM offers
  a **15% credit** → PASS. Same situation, solo over-promises, the Verifier catches it.
- Dataset: 48 real-derived cases (**30 real**, verbatim from Le Kyoto's Google reviews; 18 clearly
  synthetic). Fast demo slice = 8 cases. Final judged run = 16 on **W&B Inference** (on-brand).

## Files you OWN

- `docs/demo-script.md` — REPLACE the stale bits: the "12 synthetic / 0 real" caveat (now 30 real),
  and the synthetic "delivered 50 min late" sample → use the REAL rc-real-088 (20% vs 15%). Keep the
  3-min structure (leaderboard → drill-down → self-improvement → kill-shot). Fill real numbers.
- `README.md` — the pitch in ~20 lines on the real result + how to run (`pnpm recovery`, `/recovery`,
  the kill-shot). The founder/real-data anchor (30 real Google reviews, verbatim).
- `docs/repo-audit.md` / `docs/architecture.md` — keep the package map true to the shipped code.

## The honest caveats to BAKE IN (they are strengths, not weaknesses)

1. Metric is strict + mechanical (no LLM judge on the headline); over-promise is a narrow isolated check.
2. Small N on the demo slice (8) — the team 100% is on a few cases; the 16-case W&B run is the robust number.
3. Memory neutral this slice → fall back to v1→v2. Reading the `honest` note aloud = credibility.
4. The fast iteration was gpt-4o-mini; the judged run is W&B Inference (same 3 variants, same model).

## Done when

- [ ] demo-script + README tell the real story with the real sample case and real numbers (no placeholders/staleness).
- [ ] The 3-min flow lands the kill-shot ("toggle the Verifier off → GRPR collapses").
- [ ] No doc contradicts CLAUDE.md or the shipped code.
