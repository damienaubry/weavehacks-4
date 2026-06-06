# packages/agents — the Brigade roster (DOMAIN code)

One module per restaurant role. This is where domain logic lives — keep it OUT of
`orchestration`/`observability`.

- `roles.ts` is the **manifest**: each role's authority + its REQUIRED conflict/dependency.
  `assertEveryRoleHasConflict()` enforces the project rule — **a role with no conflict is
  decorative and must not ship.**
- **Build the HERO LOOP first:** Prep → Content → Critic → rewrite → visible 5→8.5 jump.
  Promo / Reviews / Forge are breadth/coda and cuttable.
- Each agent's `act()` is built on `@weavehacks/runtime` (`runAgent`/`reasonAgent` or
  `generate`/`reason`) and emits `Claim`s into `@weavehacks/orchestration`. **Wrap every call
  in `observability.traced()`** — every agent call and every Critic scoring is a Weave op.
- The **Critic validates SEMANTICALLY** (is the claim grounded in `@weavehacks/truth` or
  `@weavehacks/seed`?), not "did it run?". Target: 0 ungrounded claims in approved output.
- Anything `sensitive: true` (Content post, Promo offer, Forge code) → **HITL, never
  auto-apply.**
- ▶ Framework is RESOLVED: **direct-call orchestrator**. Build `act()` on `@weavehacks/runtime`
  + `@weavehacks/orchestration` now — hero loop (Prep → Content → Critic) first.
