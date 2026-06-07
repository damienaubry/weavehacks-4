# FS-1 — Front-end: verify, then polish the /recovery demo view

Final sprint. The pipeline WORKS and produces real numbers. Your job is the **demo surface**:
make `http://localhost:3000/recovery` render the REAL result cleanly. Read `CLAUDE.md` first.

## Ground truth (the real result you must render)

The harness writes `recovery-report.json` (repo root) and the API serves it at `GET /recovery`.
Latest real run (fast slice, held-out, apples-to-apples):

- Leaderboard: **solo 60% · team 100% · team+memory 80%**, budgets solo 117830 tok / 65 calls,
  team 65197 / 45, team+memory 55164 / 34. Parity: solo spent ~2× the tokens and still scored lower.
- Sample case `rc-real-088` (REAL review): *"Very average and tasteless… I do not recommend!"*
  - SOLO reply offers a **20% discount** → FAIL: `politique : gesture 20% exceeds the 15% credit limit [over_promise]`.
  - TEAM reply offers a **15% credit** (policy-safe) → PASS.

## Step 0 — LOOK before you build

Kill anything on :3000 (`lsof -ti:3000 | xargs kill -9`), then `pnpm dev`, open `/recovery`. The API
serves the cached real report (no credits). **Judge what's there.** Only rebuild the parts that look
rough — do NOT throw away working components.

## Files you OWN

- `apps/web/app/recovery/*` (page, CopilotLayer)
- `apps/web/app/components/Recovery*` + `AgentTheater`
- `apps/web/app/lib/recovery.ts`
- `apps/web/app/api/copilotkit/route.ts` (only if the chat errors)

Do NOT touch the harness, scorer, API logic, or the spine. You consume `GET /recovery` only.

## What "demo-clean" means

1. **Leaderboard** — 3 rows, the **rising bar** solo→team→team+memory, GRPR % + budget (tokens/calls).
   Show the parity line ("solo spent more, scored lower"). The headline, top of the page.
2. **Case drill-down** — the real `sampleCase`: the review, then SOLO reply with the **over-promise
   highlighted** (the 20% gesture) and its `failReasons`, vs TEAM reply (15%, PASS). This contrast IS
   the demo — make it legible and side-by-side.
3. **HITL** — approve/reject on the team reply + the ticket (reuse RecoveryHITL). Nothing publishes.
4. **CopilotKit** — keep the live agent sidebar; the page must render even if the chat backend is down.
5. Dark-mode safe, no overflow, no console errors. The `mocked:true` badge shows when the API is down.

## Constraints

- Read-only via the API; no agent logic in the front.
- Keep `/brigade` (legacy) working. `pnpm --filter @weavehacks/web typecheck` green.
- If `team+memory` < `team` in the data (it is, 80<100), DON'T hide it — the page can note the honest
  "memory neutral on this slice; within-session v1→v2 is the self-improvement" (matches the CLI honest note).

## Done when

- [ ] `/recovery` renders the real leaderboard + the rc-real-088 drill-down (solo 20% fail / team 15% pass).
- [ ] HITL works; CopilotKit sidebar present; page never crashes (mock fallback ok).
- [ ] Looks clean enough to put on a projector for 3 minutes. typecheck green.
