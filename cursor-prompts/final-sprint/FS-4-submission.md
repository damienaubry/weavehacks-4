# FS-4 — Submission writeup (Devpost / hackathon entry)

1h to submission. Write the **submission text** judges read. NEW file only — `docs/submission.md`.
Do NOT touch the front-end, demo-script, harness, or README (other sessions own those). Read
`CLAUDE.md` + `recovery-report.judged.json` (the W&B run) for the real numbers — never invent them.

## Produce `docs/submission.md`, tight, in this shape

1. **One-liner** — "Grounded Recovery Copilot: turns one real customer review into a triaged,
   grounded public reply + internal action ticket — and proves, mechanically, that a coordinated
   agent team beats a strong solo agent."
2. **The problem** — replying to reviews under a truth constraint; a hallucination (wrong fact,
   over-promised gesture) is costly; a solo LLM has no independent check.
3. **What we built** — Curator → Analyst → Writer → **Verifier** (4 roles), HITL gate. Real operator
   (Le Kyoto), **real Google reviews** (30/48 verbatim, rest clearly-marked synthetic).
4. **The metric — GRPR** (binary, conjunctive, mechanical: triage ∧ grounded ∧ policy ∧ ticket).
   **No LLM judge on the headline.** Read the REAL judged rows off `recovery-report.judged.json`:
   solo __ < team __, at **matched compute** (solo spent ≥ team — the gap is the Verifier, not budget).
5. **Robustness** — the gap held on **two base models**: W&B Inference (GLM) AND OpenAI (gpt-4o-mini).
6. **Honesty (a strength)** — cross-run memory did not beat team this run; we report it and fall back
   to the within-session v1→v2 rewrite (rescued N cases). The kill-shot: toggle the Verifier off →
   GRPR collapses.
7. **Tech** — W&B Weave (tracing + scoreboard) + W&B Inference, Redis (failure-card memory),
   CopilotKit (front-end), TypeScript/Turborepo. Every claim traced to the query that grounds it.
8. **Links** — repo, Weave project (`wandb.ai/aubry/weavehacks-4`), the `/recovery` view.

Keep it ~1 page, concrete, no fluff. Numbers come ONLY from the judged report.

## Done when
- [ ] `docs/submission.md` is copy-paste-ready for Devpost, with the real W&B numbers + the two-model robustness + honest caveats. No invented figures.
