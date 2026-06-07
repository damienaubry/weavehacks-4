# Architecture — the spine + the recovery pipeline

A short map of how the **Grounded Recovery Copilot** is wired. Two layers: a **domain-agnostic
spine** (reusable orchestration/observability/inference) and the **Brigade domain** (the recovery
agents, the canon, the data). The judged number — **GRPR** — is produced by the domain harness and
traced through the spine. The whole pipeline is wired end-to-end and `pnpm typecheck` is green.

> Legend: **[live]** = shipped and runnable. (As of this writing every box below is live; the only
> "not yet" is the dataset content — see the status note at the end.)

## The two layers

```
            ┌──────────────────────────── SPINE (domain-agnostic) ────────────────────────────┐
            │  orchestration            observability               runtime                    │
            │  runSolo / runTeam  [live]   initWeave / traced [live]   W&B Inference (default)   │
            │  resolveConflict    [live]   compareSoloVsTeam  [live]   OpenAI (fallback)   [live]│
            │  SharedState (Redis [live]   no-op w/o WANDB_API_KEY     runToolAgent tool-loop    │
            │   + in-memory)                                           describeRuntime           │
            └───────────────▲───────────────────────────────────────────────▲──────────────────┘
                            │ traced() wraps every agent + tool call          │ stations run on runToolAgent
            ┌───────────────┴──────────────── DOMAIN (Brigade) ──────────────┴──────────────────┐
            │  agents                          truth (CANON)            seed (curated, NOT canon) │
            │  roles.ts manifest       [live]  menu/prices/hours [live] recovery cases   [live]   │
            │  tools/ (Weave-traced)   [live]  policy canon       [live]  (12 synthetic, 0 real)  │
            │  grounding.checkGrounding[live]  + mechanical policy detectors  validate-cases [live]│
            │  recovery-stations       [live]  menuItem / replyHasDisclosure  legacy orders/reviews│
            │  recovery-pipeline       [live]                                                     │
            │  recovery-score          [live]  memory (@weavehacks/memory): failure-cards [live]  │
            │                                  Redis vector search → cosine → in-memory fallback  │
            └────────────────────────────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┴──────────────── APPS ─────────────────────────────────────────────┐
            │  apps/api   GET /health · /compare · /recovery (real harness) + CLIs       [live]   │
            │  apps/web   /recovery (GRPR leaderboard + drill-down + HITL, CopilotKit)   [live]   │
            │             · legacy /  (week-ahead prep) · /brigade (discussion)          [live]   │
            └────────────────────────────────────────────────────────────────────────────────────┘
```

**Spine never imports domain nouns** (no menu/review/reply/ticket in orchestration/observability/
runtime/shared) — that is why `RecoveryReport` / `RecoveryCase` live in domain packages, not in
`shared`. `@weavehacks/memory` depends only on the spine (observability/runtime/shared).

## The recovery hero pipeline (one case)

Four LLM roles max (MAST: more roles ⇒ misalignment). Authority (higher = closer to truth, wins
conflicts) is declared as data in [`packages/agents/src/roles.ts`](../packages/agents/src/roles.ts);
`assertEveryRoleHasConflict()` rejects any decorative agent. Each station runs on `runToolAgent` and
is one traced Weave op (`agent.recovery.<id>`); the whole case is `recovery.case`.
[`runRecoveryCase`](../packages/agents/src/recovery-pipeline.ts) drives all three variants.

```
  RecoveryCase (review + authorized context + gold labels)   ← packages/seed/src/recovery-types.ts
        │
        ▼
  CURATOR  (auth 55) ── pulls ONLY authorized sources via tools: review (review_stats/get_reviews),
        │                aggregated POS window, menu (get_menu) + policy (policy_lookup) → evidence
        ▼
  ANALYST  (auth 58) ── triage (incidentType) + atomic-fact, cited evidence ledger
        │                pushes specificity against the Writer's fluency
        ▼            ┌── team+memory only: retrieve failure-cards (similarity + tag) BEFORE drafting
        │            │   → "lessons" injected so the team doesn't repeat a past over-promise
        ▼            ▼
  WRITER   (auth 30, sensitive→HITL) ── drafts public reply + internal ticket FROM THE LEDGER ONLY (v1)
        │   ▲                            wants to ship
        │   │  buildRecoveryCritic feedback → runReviser (≤1 rewrite)
        ▼   │        (on a block in team+memory, a failure-card is written for the next similar case)
  VERIFIER (auth 90) ── verifyRecovery (MECHANICAL): checkGrounding ∧ checkPolicy ∧ ticket schema.
        │                BLOCKS until grounded; toggle off with --no-verifier (the kill-shot)
        ▼
  RecoveryCaseRun { output (incidentType, publicReply, ledger[], ticket), draftV1, verdictV1,
        │            verdictFinal, rewrote, criticFeedback, memoryUsed, toolCalls, budget }
        ▼
  HITL — a human approves the public reply + ticket before anything is published
```

The **conflict that earns the multi-agent setup**: the Writer wants a fluent, generous reply; the
Verifier refuses any claim not in the ledger and any over-promise. Solo ships the draft; the team
blocks and grounds it. The block/rewrite loop is **composed in the recovery pipeline** (the spine's
`runTeam` resolves conflicts by authority but does not itself model producer↔verifier rounds).

## Scoring — GRPR (mostly mechanical, no LLM judge for the headline)

For each case, [`scoreCase`](../packages/agents/src/recovery-score.ts) produces a `CaseScore`;
[`runRecoveryHarness`](../packages/agents/src/recovery-score.ts) aggregates to a `RecoveryReport`
([`buildRecoveryReport`](../packages/agents/src/recovery-score.ts)):

```
CaseScore.pass  =  triageCorrect       (predicted incidentType === gold)                deterministic
                ∧  allClaimsGrounded    (checkGrounding: every ledger claim in a tool result)  mechanical
                ∧  policyOk             (canon forbidden-claim/disclosure detectors + gold disclosures)  rules
                ∧  ticketValid          (severity / owner / action present)                schema check

GRPR(variant)   =  mean(pass) over the dataset
```

- `allClaimsGrounded` reuses the mechanical checker
  [`checkGrounding`](../packages/agents/src/grounding.ts) — the same machine the legacy `pnpm
  grounding` eval runs. No model scores the headline.
- `policyOk` is deterministic — it shares the canon detectors (`checkPolicy`, `replyHasDisclosure`
  from [`packages/truth/src/policy.ts`](../packages/truth/src/policy.ts)) **verbatim** with the
  Verifier, so blocking and scoring use one vocabulary. A narrow, isolated, **fail-safe**
  over-promise LLM judge ([`judgeOverPromise`](../packages/agents/src/recovery-score.ts)) is tolerated
  **opt-in** (`--judge`) on the policy axis only — it can only ever flip `policyOk` true→false and
  never touches grounding.
- Every case + every score is a Weave op, so the leaderboard is auditable.

## The three variants (same base model + tools; only orchestration differs)

```
solo         one agent curate+analyse+write in one shot, then self-revise N×3 (NO feedback, NO Verifier)
             compute-matched: DEFAULT_SOLO_RETRIES keeps solo budget ≥ team           the failing baseline
team         Curator → Analyst → Writer → mechanical Verifier; Verifier blocks ≤1 rewrite   the multi-agent win
team+memory  team + failure-card retrieval before drafting + write-on-block               self-improvement
```

**Compute parity is enforced** — the CLI's parity guard asserts `solo.budget.llmCalls ≥
team.budget.llmCalls`; if not it warns to raise `--soloRetries` before claiming the gap. The output
shape is `RecoveryReport` (`{ dataset, rows[], sampleCase }`), served at `GET /recovery`, printed by
`pnpm recovery`, and rendered by the web `/recovery` view. **Numbers are produced live by the run** —
there are no baked-in values.

## Self-improvement (GRPR rising)

- **Layer 1 — within session:** the Verifier forces a rewrite until grounded; grounding climbs v1→v2
  live. The harness tracks `rewriteRescued` (cases where v1 would fail and the final passes).
- **Layer 2 — across runs:** `@weavehacks/memory` failure-cards
  ([`packages/memory`](../packages/memory)) store what failed (`failure_tags`, `missing_evidence`,
  `bad_pattern`, `patch_exemplar`); the team+memory variant retrieves them (similarity + tag filter)
  before drafting so it stops repeating an over-promise → `team+memory` beats `team`. The store is
  reset before the team+memory pass and warmed only in chronological order (no leakage; `split.ts`
  provides `chronologicalSplit` / `auditLeakage` / `assertNoLeakage`). **Honesty guard:** the
  harness's `HonestComparison` reports whether memory beat team *cleanly*; if not, it says so and
  falls back to the Layer-1 v1→v2 rescue count. Never inflate.
- **Layer 3 — lifetime [coda]:** Forge spawns new agents. Stretch only (not built).

## Status snapshot

The spine, the legacy live paths (`pnpm prep` / `pnpm grounding` / `pnpm compare`), and the full
recovery pipeline (four stations, the `scoreCase`/`runRecoveryHarness` harness, `policy_lookup` +
policy canon, the `@weavehacks/memory` package, and the web `/recovery` view with CopilotKit) are all
wired and typecheck-green. The remaining gap is **dataset content**: the shipped slice is **12
clearly-marked synthetic cases (0 real)** covering all nine incident types; the operator loads the
real Google reviews to reach the "majority `source:"real"`" target. Menu/prices/hours and the policy
limits are demo-plausible placeholders pending operator validation. See [`repo-audit.md`](repo-audit.md)
for the file-by-file split.
