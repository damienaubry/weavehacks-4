# WS-F — Docs & narrative

One of six parallel workstreams for the **Grounded Recovery Copilot**. Read `CLAUDE.md` and
`cursor-prompts/00-launch-order.md` first. The socle docs (`CLAUDE.md`, the research addendum,
`docs/demo-script.md`) are already rewritten in Phase 0 — your job is to finish and keep them true.

## Your job

Keep the written record accurate to the pivot, write the README, and sharpen the 3-minute pitch as
the other workstreams land.

## Files you OWN (touch only these)

- `README.md` (root) — rewrite to the Grounded Recovery Copilot (what / why / how to run)
- `docs/repo-audit.md` — update the package map + the legacy-vs-hero split
- `docs/demo-script.md` — refine timings + fill the real numbers once WS-C runs
- `docs/architecture.md` (new, optional) — a short diagram of the recovery pipeline + the spine
- `CLAUDE.md` — only minor corrections if another workstream changes an interface

Do NOT touch code. If a doc claim and the code disagree, the CODE wins — fix the doc.

## What to build

1. **README** — the pitch in 20 lines: the product (review → grounded reply + ticket), the judged
   metric (GRPR, mechanical, 3 rows, compute-matched), the one-command run (`pnpm recovery` /
   `/recovery`), the "toggle the Verifier off" kill-shot, and the founder/real-data anchor.
2. **repo-audit.md** — refresh the package responsibilities table: spine (domain-agnostic) vs domain
   (agents/truth/seed/memory) vs apps; mark the legacy Friday-prep / grounding-post paths.
3. **demo-script.md** — keep it aligned with what actually renders; drop in the real GRPR numbers
   from WS-C; verify each checklist item is true.
4. Make sure every doc reflects the RESOLVED 2026-06-07-bis decision and the CopilotKit-front-end-only
   scope.

## Constraints

- Prose, accurate, no aspirational claims the code can't back. Cite file paths.
- Don't invent numbers — leave placeholders until WS-C produces real ones.

## Done when

- [ ] README sells the pivot accurately and tells a judge how to run + verify it.
- [ ] repo-audit + demo-script match the shipped code.
- [ ] No doc contradicts `CLAUDE.md` or the actual interfaces.
