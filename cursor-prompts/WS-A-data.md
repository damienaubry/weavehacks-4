# WS-A — Data & Truth (real-review recovery dataset + policy canon)

You are one of six parallel workstreams pivoting Brigade to the **Grounded Recovery Copilot**.
Read `CLAUDE.md` and `cowork-prompts/00-launch-order.md` first. Phase 0 contracts are frozen.

## Your job

Produce the **evaluation dataset** the whole GRPR proof rests on: ~50 review-recovery cases derived
from Le Kyoto's **real Google reviews**, each with gold labels — plus extend `packages/truth` with
the **policy** the Verifier checks against.

## Files you OWN (touch only these)

- `packages/seed/data/recovery-cases.json`  ← the dataset (new)
- `packages/seed/src/recovery-cases.ts`     ← load + export from JSON (replace the placeholder array)
- `packages/seed/src/reviews.ts`            ← widen the real-review corpus (same `Review` shape)
- `packages/truth/src/index.ts` (+ a new `packages/truth/src/policy.ts`) ← policy canon
- a validator script: `packages/seed/src/validate-cases.ts` + a `validate-cases` package script

Do NOT touch agents, eval, memory, front-end, or the spine.

## What to build

1. **Dataset** (`RecoveryCase[]`, the frozen type from `@weavehacks/seed`): ~50 cases. The operator
   (Damien) provides the raw real reviews — build cases from them, `source:"real"`. You MAY add
   clearly-marked `source:"synthetic"` paraphrase/variants to widen coverage, but keep a **majority
   `real`** and never invent a fact passed as canon. Spread across `IncidentType`s
   (food_quality, delivery_late, wrong_or_missing_item, allergen_concern, hygiene, service_staff,
   pricing_billing, praise_no_issue, other).
2. For each case fill `gold`: `incidentType`, `requiredEvidenceTags` (what the ledger must cover),
   `requiredDisclosures` (e.g. `allergen_disclaimer`, `no_refund_promise`), `forbiddenClaims`.
3. **Policy canon** in `truth`: refund/gesture rules (e.g. "max gesture = 15% credit, never a free
   meal or full refund unless …"), required allergen disclaimer wording, hours, return/again policy.
   Export a typed `POLICY` object WS-B's `policy_lookup` tool and WS-C's `policyOk` will read.
4. **Validator**: `validate-cases.ts` checks every case matches `RecoveryCase`, prints the
   `real/synthetic` split and the per-`incidentType` distribution. Wire `pnpm --filter
   @weavehacks/seed validate-cases`. Produce a short format Damien can review/approve fast.

## Constraints

- `RECOVERY_CASES` must stay the export name (front-end + harness import it).
- No LLM, no credits in seed/validation. Keep it deterministic.
- `pnpm typecheck` green.

## Done when

- [ ] ~50 cases, majority `source:"real"`, schema-valid, spread across incident types.
- [ ] `truth` exports a `POLICY` canon (gesture limits, disclosures) the Verifier can check.
- [ ] `pnpm --filter @weavehacks/seed validate-cases` prints the distribution and passes.
- [ ] A reviewable summary for the operator to approve the gold labels.
