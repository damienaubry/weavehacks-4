# FS-3 — Final judged run + verification (Damien runs these — not a Cursor agent)

This is YOUR checklist, in order. The fast OpenAI iteration proved the shape; now lock the judged
number on W&B Inference and verify the kill-shot.

## 1. Kill-shot (proves it's coordination, not the model) — do this on the fast slice first

```bash
RUNTIME_PROVIDER=openai RECOVERY_CONCURRENCY=6 \
RECOVERY_CASES_PATH=/Users/damien_abr/Documents/GitHub/weavehacks-4/packages/seed/data/recovery-cases.fast.json \
RECOVERY_REPORT_CACHE=/Users/damien_abr/Documents/GitHub/weavehacks-4/recovery-report-killshot.json \
pnpm recovery --no-verifier
```
Expect: team's GRPR **collapses toward solo** (the Verifier is off, so over-promises slip through).
Capture the number — that's your on-stage "toggle the Verifier off" moment. (Note: writes a SEPARATE
cache so it doesn't overwrite your good `/recovery` report.)

## 2. The final judged run — on W&B Inference, 16 cases

```bash
# .env back to W&B (remove RUNTIME_PROVIDER=openai or set it to wandb); WANDB_API_KEY present.
RECOVERY_CONCURRENCY=3 \
RECOVERY_CASES_PATH=/Users/damien_abr/Documents/GitHub/weavehacks-4/packages/seed/data/recovery-cases.demo.json \
RECOVERY_REPORT_CACHE=/Users/damien_abr/Documents/GitHub/weavehacks-4/recovery-report.json \
pnpm recovery
```
(Lower concurrency on W&B — it rate-limits harder than OpenAI.) Read the 3 rows + the `honest` note.
This `recovery-report.json` is what `/recovery` serves on stage.

## 3. Capture proof for the demo (in case the live run is risky)

- Screenshot the CLI scoreboard + the `/recovery` page (leaderboard + drill-down).
- Open ONE Weave trace from a `🍩 wandb.ai/...` line — a `recovery.case` showing solo-fail vs team-pass.
  That live trace is your "every claim is traced" proof.
- Paste the final 3 rows into `docs/demo-script.md` (FS-2 leaves blanks for them).

## 4. Pre-flight (all green before you walk on stage)

- [ ] `pnpm typecheck` green.
- [ ] `pnpm recovery` (W&B) prints solo < team, parity line "solo spends ≥ team".
- [ ] `pnpm recovery --no-verifier` collapses the GRPR.
- [ ] `pnpm dev` → `/recovery` shows the real numbers + the rc-real-088 drill-down + HITL.
- [ ] One Weave trace open and ready.
- [ ] You can say the honest caveats out loud (small N, memory→v1→v2).

## If W&B is too slow / flaky on the day
Fall back to the OpenAI fast-slice numbers you already have + screenshots, and SAY so honestly
("iterated on gpt-4o-mini; same harness, same 3 variants"). Honesty is part of the pitch.
