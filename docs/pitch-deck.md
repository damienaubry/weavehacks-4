# Grounded Recovery Copilot — Pitch Deck

---

## Slide: Blind Revision Fails

### Texte de la slide

**Title:** "Why not just a better solo prompt?"

```
┌─────────────────────────────────────────────────────┐
│  SOLO AGENT                                         │
│                                                     │
│  Pass 1: Draft (curate + triage + reply + ticket)   │
│  Pass 2: "Revise — be more helpful, warmer"         │
│  Pass 3: "Revise — be more helpful, warmer"         │
│  Pass 4: "Revise — be more helpful, warmer"         │
│                                                     │
│  4 LLM calls · 117K tokens · GRPR: 60%             │
│  ❌ No feedback on WHAT went wrong                  │
└─────────────────────────────────────────────────────┘

                    vs.

┌─────────────────────────────────────────────────────┐
│  TEAM (Verifier)                                    │
│                                                     │
│  Pass 1-3: Curator → Analyst → Writer (draft v1)    │
│  Pass 4: Verifier → "BLOCKED. 20% exceeds 15% cap" │
│         → Writer rewrites with targeted feedback    │
│                                                     │
│  4 LLM calls · 65K tokens · GRPR: 100%             │
│  ✅ Knows exactly WHAT to fix                       │
└─────────────────────────────────────────────────────┘
```

**Punchline en bas de slide:**
> 3 blind revisions (117K tokens) < 1 targeted rewrite (65K tokens)

---

### Questions du jury que cette slide répond

**Q1: "Why can't the solo agent just check the policy itself?"**

> Réponse orale : "It has access to the same policy tool. But having information and following it are two different things. The solo revises itself three times — it spends 2x the tokens — and still over-promises. Because its revision prompt says 'be warmer, be more helpful.' That actually pushes it to be MORE generous. It makes the problem worse. The Verifier gives targeted feedback: 'this number exceeds this limit.' One targeted rewrite fixes what three blind revisions can't."

**Q2: "Isn't this just a prompting problem? Couldn't you fix the solo with better instructions?"**

> Réponse orale : "We tried the obvious thing. The solo gets four full LLM passes with all tools available. It still fails 40% of the time. The issue isn't the prompt — it's conflicting objectives in one context. The model is trained to be helpful AND must enforce constraints. When you separate those into two agents, each one does its job well. Same reason you don't let the developer approve their own PR."

**Q3: "Why does the team use fewer tokens if it has more agents?"**

> Réponse orale : "Because blind revision is wasteful. The solo rewrites the entire response three times hoping to improve it. The team writes once, gets precise feedback, and fixes only what's broken. Targeted correction is cheaper than repeated guessing."

---
