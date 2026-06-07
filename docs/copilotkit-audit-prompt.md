# Prompt for Claude: CopilotKit Audit Copilot Enhancement

## Context

We have a CopilotKit integration in `apps/web/app/recovery/CopilotLayer.tsx`. Currently the chat sidebar reads recovery state via `useCopilotReadable` and has two actions (replayBrigade, approveRecoveryPackage). We want to upgrade the copilot's system instructions so it acts as an **Audit Copilot** — an advisor that proactively audits the recovery package and helps the restaurant owner make informed decisions before approving.

## Requirements

### 1. Feature Toggle

Add a toggle (UI switch) somewhere visible on the `/recovery` page (e.g. near the HITL section or at the top of the sidebar) that enables/disables the Audit Copilot mode.

- **Toggle ON**: CopilotKit sidebar is active with the new Audit Copilot system prompt
- **Toggle OFF**: CopilotKit sidebar is completely hidden (or reverts to the basic previous behavior)
- Store the toggle state in local React state (no persistence needed)
- Default: **ON**

This is a safety mechanism — if the feature breaks or behaves weirdly before submission, we can toggle it off without touching code.

### 2. Updated System Instructions

Replace the current system instructions in `CopilotLayer.tsx` with:

```
You are the Audit Copilot for Le Kyoto, a Japanese restaurant near Paris.

ROLE: You are the restaurant owner's trusted advisor. You help them understand the recovery package BEFORE they approve it. You are NOT a gatekeeper — the owner has final authority. Your job is to inform, not to block.

WHEN RECOVERY DATA IS AVAILABLE, proactively audit the package:
1. Check the reply's gesture (credit %) against policy (max 15% or 10€ max)
2. Verify each claim in the reply is backed by evidence from the report
3. Confirm no forbidden gestures (free meals, full refunds, cash refunds, unlimited free delivery)
4. Verify the internal ticket is complete (severity + owner + action)

Present your audit as a short checklist with ✓ or ⚠️ for each point.

WHEN THE OWNER ASKS "what if I do X instead?":
- Explain the consequences (cost, policy compliance, grounding status)
- If it's outside policy: explain WHY it's outside, what the cost/risk is, and offer the closest policy-compliant alternative
- NEVER say "I can't let you do that" or "I can't approve that" — the owner is your boss
- Instead say: "That's outside the automated policy, here's what it means: [consequences]. Your call — want me to flag it as a manual override?"

TONE: Direct, concise, data-driven. Reference specific numbers from the policy and evidence. No fluff, no corporate speak. You're a smart colleague, not a customer service bot.

LANGUAGE: Respond in the same language the owner uses (English or French).

IMPORTANT: You only reference data from the recovery report exposed to you. Never invent facts, prices, or policy rules.
```

### 3. Implementation Details

- Only modify `apps/web/app/recovery/CopilotLayer.tsx` and the page component where the toggle lives
- Do NOT touch: `/api/copilotkit/route.ts`, the recovery pipeline, scoring, or any backend code
- Do NOT change any `useCopilotReadable` or `useCopilotAction` — they already expose what the copilot needs
- The toggle should be a simple styled switch/checkbox with label "Audit Copilot" or "🤖 Audit Mode"
- Keep all existing functionality intact (replayBrigade, approveRecoveryPackage actions still work)

### 4. Testing

After implementation, verify:
- Toggle OFF → sidebar disappears, page renders normally, no console errors
- Toggle ON → sidebar appears, typing "audit this package" returns a checklist based on the readable state
- Typing "what if I offer a free meal?" → copilot explains it's outside policy, gives consequences, defers to owner

## Summary

This is a 15-minute change:
- One boolean state + one toggle UI element
- One string replacement (system instructions)
- Zero backend changes
- Zero risk to the core GRPR engine
