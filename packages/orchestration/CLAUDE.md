# packages/orchestration — domain-agnostic core (keep it that way)

The reusable spine: roles + `authority`, the coordination loop (`runSolo`/`runTeam`), and
conflict resolution (**highest authority wins; `sensitive` claims escalate to a human**).

- **NO restaurant concepts here.** No menu/dish/surface/POS. If you're typing a domain noun,
  it belongs in `@weavehacks/agents`/`truth`/`seed`. This is what makes the spine reusable and
  the solo-vs-team comparison honest.
- The **Critic-rewrite loop** (Layer 1 hero) is modeled here generically — a producer emits,
  a verifier scores/blocks, the producer rewrites — keep it domain-free; the Critic's actual
  scoring prompt lives in `@weavehacks/agents`.
- `runSolo` is the failing baseline (last-write-wins, blindly auto-applies sensitive changes).
  `runTeam` is the win. Both must stay runnable so `pnpm compare` always reports a number.
- A project may pass a **semantic** `detect` into `runTeam` (validates meaning, not just "did
  it run?"). The default `detectConflicts` is structural — fine for the stand-in scenario.
