# Grounded Recovery Copilot — Pitch Deck

---

## Slide 1: Introduction

### Texte de la slide

**Title:** Grounded Recovery Copilot

**Subtitle:** Multi-agent review recovery for a real restaurant

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  🍜 LE KYOTO                                       │
│  Japanese takeout · near Paris · 4.7★ on Google     │
│                                                     │
│  THE PROBLEM                                        │
│  A bad review needs a fast, accurate response.      │
│  One wrong promise = broken trust + real cost.      │
│                                                     │
│  THE PRODUCT                                        │
│  One Google review in →                             │
│     ✅ Incident triage                              │
│     ✅ Grounded public reply (no hallucinated       │
│        promises)                                    │
│     ✅ Internal action ticket                       │
│     🔒 Nothing publishes without human approval     │
│                                                     │
│  "My restaurant is 4.7★ — I needed more of the     │
│   angry ones to stress-test the system."            │
│   → 30 real reviews + 18 synthetic edge cases      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### Questions du jury que cette slide répond

**Q1: "Is this a real business or a hackathon toy?"**

> Réponse orale : "I operate Le Kyoto. Real Google reviews, real customers. The policy — 15% max credit, no free meals — is our actual business rule. This is not a demo dataset."

**Q2: "Why synthetic reviews?"**

> Réponse orale : "My restaurant is 4.7 stars. Allergen scares, hygiene problems — they rarely happen at Le Kyoto. But the system must handle them. So I generated 18 edge cases to stress-test. All clearly labeled. The 30 real ones are the core benchmark."

**Q3: "What does 'grounded' mean?"**

> Réponse orale : "Every claim in the reply must trace back to a tool result. If the agent says the order was missing items, a tool result must confirm it. No claim without a source."

---

## Slide 2: What It Does

### Texte de la slide

**Title:** One review in, full recovery package out

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  INPUT                                              │
│  ★★☆☆☆ "Inadmissible, il manque la moitié de la    │
│  commande !"                                        │
│                                                     │
│                      ↓                              │
│                                                     │
│  OUTPUT                                             │
│                                                     │
│  1. TRIAGE → wrong_or_missing_item                  │
│                                                     │
│  2. PUBLIC REPLY                                    │
│     "We'd like to offer you a 10€ credit           │
│      on your next order."                           │
│     → backed by policy_lookup (within 15% cap) ✓    │
│                                                     │
│  3. INTERNAL TICKET                                 │
│     high · ops · re-send missing items              │
│                                                     │
│  🔒 Human approves → then it goes public            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### Questions du jury que cette slide répond

**Q1: "Why not just use ChatGPT?"**

> Réponse orale : "ChatGPT will happily offer a free meal or a 50% refund. Things I cannot give. My system is constrained by my real policy. It can only promise what I authorized. That's the difference."

**Q2: "What types of incidents?"**

> Réponse orale : "Food quality, missing items, allergens, hygiene, late delivery, staff, pricing. Nine categories. The triage decides how the pipeline behaves."

---

## Slide 3: Solo vs Team (The Core Proof)

### Texte de la slide

**Title:** Same model, same tools. Only orchestration changes.

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  SOLO AGENT (fails)                     ❌ 80%     │
│  states "missing items in the order"…               │
│  → No tool result backs that claim. UNGROUNDED.     │
│  → 225K tokens spent. Still fails one check.         │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  TEAM (passes)                          ✅ 90%     │
│  "...offer you a 10€ credit..."                     │
│  → Verifier flags the ungrounded claim. BLOCKED.    │
│  → Writer rewrote — grounded. Now passes.           │
│  → 151K tokens. Fewer than solo, better result.     │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  TEAM + MEMORY (cheapest)               ⚡ 80%     │
│  → Cross-run memory: 91K tokens, 61 calls.          │
│  → Honest result: 80% — did not beat team here.     │
│  → Cheapest of all three.                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### Questions du jury que cette slide répond

**Q1: "Why does solo fail if it has the same tools?"**

> Réponse orale : "It has the tools. But it has conflicting objectives — write a fluent reply AND keep every claim grounded — in one context. The model's training pushes it to sound natural, so it asserts a fact the data never backed. The Verifier has one job: check that each claim has a source. No conflict."

**Q2: "How is this fair? Solo has less compute?"**

> Réponse orale : "Solo actually spends MORE — 225K tokens versus 151K for the team. It self-revises three times. Same budget, more compute, worse result. The issue is not compute, it's the quality of feedback."

---

## Slide 4: Blind Revision vs Targeted Feedback

### Texte de la slide

**Title:** 3 blind revisions < 1 targeted rewrite

```
┌─────────────────────────────────────────────────────┐
│  SOLO: revises blind                                │
│                                                     │
│  Draft → "Revise: be warmer" → "be warmer" → same  │
│                                                     │
│  ❌ Never told WHAT is wrong                        │
│  ❌ "Be warmer" = be MORE generous = worse          │
│  ❌ More tokens (225K), still fails one check      │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  TEAM: targeted fix                                 │
│                                                     │
│  Draft → Verifier: "claim not in the evidence      │
│  ledger" → fix it                                   │
│                                                     │
│  ✅ Knows EXACTLY what to fix                       │
│  ✅ One rewrite, done                               │
│  ✅ Targeted fix (151K tokens), passes             │
│                                                     │
└─────────────────────────────────────────────────────┘

Like proofreading your own essay 3 times
     vs. a colleague saying "that claim has no source."
```

---

### Questions du jury que cette slide répond

**Q1: "Why not just prompt the solo to check policy?"**

> Réponse orale : "We tried. It revises three times and still slips in a claim no tool result backs. Having information is not the same as following it. Same reason a developer who reads the style guide still needs code review."

**Q2: "Is the Verifier just another LLM?"**

> Réponse orale : "The core check is mechanical. Claim not found in any tool result? Block. Credit percent exceeds 15? Block. It's code-level verification, not a vibe check."

---

## Slide 5: Weave — Full Traceability

### Texte de la slide

**Title:** Not a black box — every decision is traceable

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  WEAVE TRACE (one recovery case):                   │
│                                                     │
│  recovery.case                                      │
│  ├── agent.curator                                  │
│  │   ├── tool.get_reviews ✓                         │
│  │   ├── tool.policy_lookup ✓                       │
│  │   └── tool.get_menu ✓                            │
│  ├── agent.analyst                                  │
│  │   └── triage: wrong_or_missing_item ✓            │
│  ├── agent.writer                                   │
│  │   └── draft v1: ungrounded claim ⚠️             │
│  ├── agent.verifier                                 │
│  │   └── BLOCKED: claim not in ledger ❌           │
│  ├── agent.writer (rewrite)                         │
│  │   └── draft v2: all claims grounded ✓            │
│  └── agent.verifier                                 │
│      └── PASS ✅                                    │
│                                                     │
│  → Click any node → see input, output, tokens       │
│  → The Verifier's block is PROVABLE in Weave        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### Questions du jury que cette slide répond

**Q1: "How do you use Weave?"**

> Réponse orale : "21 traced decorators. Every agent, every tool, every memory operation is a Weave op. You can open any case and see exactly which claim was blocked, which tool returned which value, and why. It's a debugger for multi-agent coordination."

**Q2: "Could you build this without Weave?"**

> Réponse orale : "You could build agents. But you could not PROVE the grounding. Weave makes the audit trail visible. Without it, you trust the system. With it, you verify it."

---

## Slide 6: Redis — System Memory

### Texte de la slide

**Title:** Learns from mistakes, no retraining

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  CASE N:                                            │
│  Writer → ungrounded claim → Verifier BLOCKS        │
│       ↓                                             │
│  Failure card → Redis                               │
│  { tag: "ungrounded", lesson: "cite the order" }    │
│                                                     │
│  CASE N+1 (similar complaint):                      │
│  Retrieve card → Writer sees lesson BEFORE writing  │
│       ↓                                             │
│  Cites the evidence first try. No rewrite.          │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  TECH: RediSearch + vector KNN                      │
│  → Similarity search by incident type               │
│  → Top-3 relevant failure cards retrieved           │
│  → Three-tier fallback (never crashes)              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### Questions du jury que cette slide répond

**Q1: "Why Redis for memory?"**

> Réponse orale : "Fast, persistent, and RediSearch gives us vector KNN with tag pre-filtering in one query. We retrieve the top-3 similar failure cards by incident type before the Writer even starts. If Redis is down, we fall back to in-memory. The system never crashes."

**Q2: "Does memory actually help?"**

> Réponse orale : "On small data, the lift is modest — we report that honestly. The big proven win is within-session: the Verifier blocks and the Writer rewrites. Memory adds cross-session learning. At scale with more cases, it compounds."

---

## Slide 7: CopilotKit — Audit Copilot

### Texte de la slide

**Title:** The owner's advisor before approving

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  BEFORE YOU CLICK "APPROVE":                        │
│                                                     │
│  🤖 Audit Copilot:                                  │
│  "Here's my check on this package:                  │
│                                                     │
│   ✓ 10€ credit — within the 15% policy cap          │
│   ✓ 'missing items' — customer DID say that         │
│   ✓ No forbidden gestures                           │
│   ✓ Ticket complete: high · ops · re-send items     │
│                                                     │
│   → Safe to approve."                               │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  Owner: "What if I offer a free meal instead?"      │
│                                                     │
│  🤖 "Free meal is outside your policy.              │
│      Risk: ~15-20€ cost, no automated tracking.     │
│      Alternative: max credit is 15% (≈ 10€).        │
│      Your call — want me to flag it as manual       │
│      override?"                                     │
│                                                     │
│  → AI advises. Human decides. Nothing auto-sends.   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### Questions du jury que cette slide répond

**Q1: "How do you use CopilotKit?"**

> Réponse orale : "CopilotKit is the human-in-the-loop advisor. Before the owner approves, the copilot audits the package — checks every claim against policy and evidence. If the owner wants to override, the copilot explains the consequences but respects the decision. It's an AI that audits another AI, for the human."

**Q2: "Why not just buttons?"**

> Réponse orale : "Approve/Reject buttons are a rubber stamp. The owner doesn't know WHY it's safe. The copilot explains — 'this claim is grounded because this tool returned this value.' The human becomes an informed approver, not a blind one."

**Q3: "Can the copilot override the system?"**

> Réponse orale : "No. It only reads the recovery data. It cannot modify the pipeline, the score, or the output. It advises the owner, that's it. The proof engine stays untouched."

---

## Slide 8: The Kill-Shot (Live Demo)

### Texte de la slide

**Title:** Prove it's the coordination

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  $ pnpm recovery                                    │
│                                                     │
│    solo         80%     225K tokens                  │
│    team         90%     151K tokens                  │
│    team+mem     80%      91K tokens                  │
│                                                     │
│  $ pnpm recovery --no-verifier                      │
│                                                     │
│    solo         80%                                  │
│    team          ↓   ← collapses toward solo        │
│    team+mem      ↓   ← collapses toward solo        │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  Same model ✓                                       │
│  Same tools ✓                                       │
│  Same budget ✓                                      │
│  One flag changed: Verifier OFF                     │
│                                                     │
│  "If removing one agent collapses the score,        │
│   that agent IS the value."                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### Questions du jury que cette slide répond

**Q1: "How do we know it's not just more compute?"**

> Réponse orale : "Solo spends ~1.5x the tokens — 225K versus 151K — and scores worse. The team spends less and scores better. And when I disable just the Verifier — same model, same tools, same budget — the score collapses toward solo. It's the coordination. Not the compute."

**Q2: "Is this reproducible?"**

> Réponse orale : "Run it yourself. One command: pnpm recovery. One flag to kill it: --no-verifier. The metric is binary and mechanical. No LLM judge, no subjectivity. Same result every time."

---

## Ordre recommandé pour le pitch (3 min)

| # | Slide | Durée | Ce que tu fais |
|---|---|---|---|
| 1 | Introduction | 20s | Context + "real restaurant" |
| 2 | What It Does | 20s | Input → Output concret |
| 3 | Solo vs Team | 30s | Le side-by-side : solo ungrounded vs team grounded |
| 4 | Blind vs Targeted | 25s | Pourquoi solo fail malgré 3 revisions |
| 5 | Kill-Shot (LIVE) | 25s | Terminal: --no-verifier collapse |
| 6 | Weave | 15s | "Full traceability, 21 ops" |
| 7 | Redis | 15s | "Learns from mistakes" |
| 8 | CopilotKit | 15s | Live: "what if free meal?" |

**Total: ~2min45.** Te laisse 15s de marge.

Slides 5-6-7-8 sont rapides (sponsor tech), le coeur c'est slides 2-3-4 + kill-shot live.
