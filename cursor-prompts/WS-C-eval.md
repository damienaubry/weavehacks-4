# WS-C — Eval & GRPR harness (the judged number)

One of six parallel workstreams for the **Grounded Recovery Copilot**. Read `CLAUDE.md` and
`cursor-prompts/00-launch-order.md` first. This is THE judged number — get it mechanical and honest.

## Your job

Score a `RecoveryOutput` into a `CaseScore` (the conjunctive GRPR) and run the whole dataset for
`solo` / `team` / `team+memory`, traced in Weave, with compute parity — replacing the `recovery.ts`
placeholder with the real harness. Keep the `RecoveryReport` shape identical.

## Files you OWN (touch only these)

- `packages/agents/src/recovery-score.ts`  ← `scoreCase()` + `runRecovery()` aggregation (new)
- `packages/agents/src/index.ts`           ← export the scorer/harness (additive)
- `apps/api/src/recovery.ts`               ← replace placeholder body with the real `runRecovery()`
- (optional) `apps/api/src/recovery.ts` CLI output formatting

Do NOT change `checkGrounding`'s matching logic, the dataset (WS-A), the agent pipeline (WS-B —
import it), or the spine.

## What to build

1. **`scoreCase(output, case, toolCalls): CaseScore`** — conjunctive, mostly mechanical:
   - `triageCorrect` = `output.incidentType === case.gold.incidentType`.
   - `allClaimsGrounded` = `checkGrounding(output.ledger as Claim[], toolCalls).ungroundedCount === 0`.
   - `policyOk` = deterministic: all `requiredDisclosures` present, no `forbiddenClaims`, gesture
     within `POLICY` limits — PLUS a NARROW LLM judge for "over-promise" ONLY (isolated; never touches
     grounding). 
   - `ticketValid` = schema check (`severity ∈ {low,med,high}`, non-empty `owner`/`action`).
   - `pass` = AND of the four. Fill `failReasons[]` (front-end highlights them) + `checks` from
     `checkGrounding`.
2. **`runRecovery()`** — for each variant, run WS-B's `runRecoveryCase` over `RECOVERY_CASES`, score
   each case, aggregate `grpr = mean(pass)`, capture `Budget`. **Enforce compute parity** (reuse the
   `Budget` + parity guard pattern from `grounding.ts`); if solo grounds as well as team at ≥ budget,
   say so honestly. Trace each case + each check as a Weave op (`traced`). Use Weave **Evaluations +
   a custom GRPR scorer + a Leaderboard** so the 3 rows live in Weave with cost/token tracking.
3. Build the `RecoveryReport` (real numbers, `placeholder` omitted/false) incl. one `sampleCase`
   (a solo-fail / team-pass case + `memoryReuse` if present). Serve it from `apps/api/src/recovery.ts`.

## Phase 2 (do this after A/B/D/E merge — the integration + adversarial check)

- Wire everything; `pnpm typecheck`, `pnpm build`, `pnpm recovery`, `pnpm compare`, `pnpm grounding`,
  `pnpm prep` all green.
- **Adversarial verification (spawn a sub-agent):** toggle the Verifier OFF → GRPR must collapse
  toward solo; confirm BUILD/HONESTY/PARITY guards fire when they should; confirm solo budget ≥ team;
  confirm the chronological split has no test case in memory. Document the **honest** result.
- Screenshot the front-end; update `docs/demo-script.md` with the real numbers.

## Constraints

- NO LLM judge for the headline grounding score — only the narrow over-promise check may use one.
- Report the true result even if the gap is modest. Never fake parity or the gap.
- `pnpm typecheck` green; legacy scoreboards still run.

## Done when

- [ ] `pnpm recovery` prints 3 rows (`solo` < `team` ≤ `team+memory`) with budgets, from REAL runs.
- [ ] `GET /recovery` returns a real `RecoveryReport` (no `placeholder`).
- [ ] Every case + check is a Weave op; a solo-fail and the same team-pass case are both traceable.
- [ ] Toggling the Verifier off collapses GRPR (the kill-shot works).
