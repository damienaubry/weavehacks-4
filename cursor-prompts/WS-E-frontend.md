# WS-E — Front-end (CopilotKit: leaderboard + case drill-down + HITL)

One of six parallel workstreams for the **Grounded Recovery Copilot**. Read `CLAUDE.md` and
`cursor-prompts/00-launch-order.md` first. CopilotKit is **front-end only** (resolved decision) —
never let it touch the proof engine.

## Your job

Build the demo surface: a `/recovery` view reading `GET /recovery`, showing the 3-row GRPR
leaderboard, a case drill-down (solo fail vs team pass + memory reuse), and HITL approve/reject —
dressed with CopilotKit for the live agent theater.

## Files you OWN (touch only these)

- `apps/web/app/recovery/` (new route + components) — or make it `/` and keep `/brigade` as legacy
- `apps/web/app/lib/recovery.ts` (new) — `fetchRecovery()` + a local `RecoveryReport` DTO type
  mirroring the API shape (the front keeps its own DTO; don't import server packages)
- `apps/web/app/components/` — new recovery components (reuse `Scoreboard`, `Sidebar`, `TopBar`,
  `ThemeToggle`, `ApprovalBanner`, `HumanGate`)
- `apps/web/package.json` — add CopilotKit deps

Do NOT touch the API harness logic, agents, eval, or the spine. You consume `GET /recovery` only.

## What to build

1. **Probe the endpoint first** — `GET /recovery` already returns a real (placeholder, then live)
   `RecoveryReport`. Build your parser around the ACTUAL JSON shape you see, with a mock fallback
   when the API is down (mirror the existing `fetchWeek` pattern).
2. **Leaderboard** — 3 rows `solo` / `team` / `team+memory`: GRPR + budget tokens/calls (show the
   parity). A rising bar; the headline.
3. **Case drill-down** — `sampleCase`: the review → SOLO reply with `failReasons` highlighted
   (unsupported claim / missing disclosure / over-promise) vs TEAM reply (pass) → the
   **memory-reuse** chip if present.
4. **HITL** — Approve/Reject on the public reply + the ticket (reuse `ApprovalBanner` / `HumanGate`).
   Nothing publishes; this is the human gate.
5. **CopilotKit** — use it for the live agent-state theater (agent cards, streamed state) and the
   approve/reject affordance. Keep it on the WEB layer only; the GRPR numbers come from the API.

## Constraints

- No agent logic in the front-end — read-only via the API.
- Keep `/brigade` (legacy) working. Reuse existing components + styling; dark-mode safe.
- `pnpm --filter @weavehacks/web typecheck` green.

## Done when

- [ ] `/recovery` renders the 3-row leaderboard + drill-down + HITL from `GET /recovery`.
- [ ] Mock fallback works when the API is down.
- [ ] CopilotKit drives the live agent theater; HITL approve/reject works.
- [ ] Legacy `/brigade` still loads; typecheck green.
