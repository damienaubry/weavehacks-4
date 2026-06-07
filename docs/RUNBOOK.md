# RUNBOOK — launch the demo reliably, every time

## 0. The one rule before submission
The judged result is **locked** in `recovery-report.json` (solo 80% < team 90%, sample `rc-real-025`).
**Do NOT re-run the judged eval — it can overwrite this file with a noisier/worse run (N=16 varies).**
If you want to test, run to a SEPARATE file (see §4). The demo always serves the locked file.

## 1. Prereqs (once)
- `.env` has `WANDB_API_KEY=...` (powers Weave tracing). Runtime keys only needed to RE-RUN, not to demo.
- `pnpm install` (only if you haven't since the last pull).
- Redis optional (memory degrades to in-memory if it's down — fine for the demo).

## 2. Launch the demo (no credits, guaranteed) — THIS is the command
```bash
lsof -ti:3000 | xargs kill -9   # free the port (a stale next dev is the usual culprit)

RECOVERY_REPORT_CACHE=/Users/damien_abr/Documents/GitHub/weavehacks-4/recovery-report.json pnpm dev
```
Then open **http://localhost:3000/recovery**.

> Why the env var: `GET /recovery` serves whatever `RECOVERY_REPORT_CACHE` points at. Without it, the
> API reads an empty temp cache and the page shows zeros or the stale fallback. Pinning it to
> `recovery-report.json` guarantees the page shows the **canonical W&B run**.

## 3. Verify on screen (3 checks — must all pass)
1. Leaderboard = **solo 80% · team 90% · team+memory 80%**, dataset **16 cases**.
2. Drill-down case = **`rc-real-025`** — the real review *"Inadmissible… il manque la moitié de la commande"*;
   solo **FAIL** (ungrounded claim), team **PASS**.
3. If you instead see **60% / 100%** or **`rc-real-088`** → the API didn't read the file (wrong path /
   fallback fired). Re-check the absolute path in the command above.

## 4. The kill-shot (the one live moment) — uses a SEPARATE cache, never clobbers the demo
```bash
RUNTIME_PROVIDER=openai RECOVERY_CONCURRENCY=3 \
  RECOVERY_CASES_PATH=/Users/damien_abr/Documents/GitHub/weavehacks-4/packages/seed/data/recovery-cases.demo.json \
  RECOVERY_REPORT_CACHE=/Users/damien_abr/Documents/GitHub/weavehacks-4/recovery-report-killshot.json \
  pnpm recovery --no-verifier
```
Read the CLI: team GRPR drops toward solo. (Optional — you can also just show the captured number.)

## 5. The Weave tab
Open **https://wandb.ai/aubry/weavehacks-4** → **Traces**. Pre-open one **`recovery.case`** trace
(Curator→Analyst→Writer→Verifier) before you present, so the right view is already on screen.

## 6. If anything breaks → fall back to the green commit
```bash
git stash || true
git reset --hard 509f71a   # last known-green snapshot
```
Then re-run §2. Present from `/recovery` + screenshots; never debug live on stage.

## 7. One-line summary
`kill :3000` → `RECOVERY_REPORT_CACHE=…/recovery-report.json pnpm dev` → open `/recovery` → verify 80/90 + rc-real-025. Done.
