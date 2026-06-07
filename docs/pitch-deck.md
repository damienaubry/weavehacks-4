# Grounded Recovery Copilot — Pitch Deck

---

## Slide: Introduction

### Texte de la slide

**Title:** Grounded Recovery Copilot

**Subtitle:** Multi-agent review recovery for a real restaurant

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  🍜 LE KYOTO                                       │
│  Japanese takeout restaurant · near Paris           │
│  4.7★ on Google · real business, real customers     │
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
│  THE DATASET                                        │
│  48 cases:                                          │
│     30 real Google reviews (verbatim)               │
│     18 synthetic variants                           │
│                                                     │
│  "My restaurant is rated 4.7★ — I needed more of   │
│   the angry ones to stress-test the system."        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### Questions du jury que cette slide répond

**Q1: "Why synthetic reviews? Is this cheating?"**

> Réponse orale : "My restaurant is 4.7 stars — I have some angry reviews, but not enough variety. Food poisoning claims, repeated wrong orders, aggressive customers — these happen rarely at Le Kyoto. So I generated 18 synthetic ones to cover those edge cases. All clearly labeled. The 30 real ones are the core benchmark, the synthetic ones stress-test the long tail."

**Q2: "Is this a real business or a hackathon toy?"**

> Réponse orale : "I operate Le Kyoto. These are real Google reviews from real customers. The policy — 15% max credit, no free meals — is our actual business rule. This isn't a demo dataset, it's my restaurant's reputation on the line."

**Q3: "What does 'grounded' mean exactly?"**

> Réponse orale : "Every claim in the reply must trace back to a tool result. If the agent says '15% credit', the policy tool must confirm that's within limits. If it says 'we're sorry about the missing items', the review must actually mention missing items. No claim without a source. That's what grounded means."

---

## Slide: What It Does (Concrete Example)

### Texte de la slide

**Title:** One review in → Full recovery package out

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  INPUT (real Google review)                         │
│  ★★☆☆☆                                             │
│  "Very average and tasteless… I do not recommend!"  │
│                                                     │
│                      ↓                              │
│                                                     │
│  OUTPUT (3 things)                                  │
│                                                     │
│  1️⃣ TRIAGE                                         │
│     → food_quality                                  │
│                                                     │
│  2️⃣ PUBLIC REPLY (grounded)                        │
│     "We're sorry your meal didn't meet              │
│      expectations. We'd like to offer you a         │
│      15% credit on your next order."                │
│     → every claim backed by a tool result           │
│     → nothing exceeds policy limits                 │
│                                                     │
│  3️⃣ INTERNAL TICKET                                │
│     Severity: medium · Owner: kitchen               │
│     Action: review seasoning consistency            │
│                                                     │
│  🔒 Human approves before anything goes public      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### Questions du jury que cette slide répond

**Q1: "So what does it actually DO?"**

> Réponse orale : "You give it one Google review. It gives you three things: a triage — what type of incident is this. A public reply that's grounded — every claim traces back to real data, no hallucinated promises. And an internal ticket so your team knows what to fix. Nothing goes out without human approval."

**Q2: "What types of incidents does it handle?"**

> Réponse orale : "Food quality, wrong or missing items, allergen concerns, hygiene issues, late delivery, staff complaints, pricing disputes. Nine categories total. The triage is the first step — it determines how the rest of the pipeline behaves."

**Q3: "Why not just use ChatGPT to reply to reviews?"**

> Réponse orale : "ChatGPT will happily offer a free meal or a 50% refund — things I can't actually give. My system is constrained by my real business policy. It can only promise what I've authorized. That's the difference between a chatbot and an operational tool."

---

## Slide: The Dataset

### Texte de la slide

**Title:** Real reviews, real edge cases

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  48 CASES                                           │
│                                                     │
│  30 REAL (verbatim from Google)                     │
│  ──────────────────────────────                     │
│  "Inadmissible, il manque la moitié                 │
│   de la commande. Ce n'est pas normal"              │
│   → wrong_or_missing_item                           │
│                                                     │
│  "Un peu déçue... les ramens m'ont                  │
│   le plus déçue"                                    │
│   → food_quality                                    │
│                                                     │
│                                                     │
│  18 SYNTHETIC (edge cases that rarely happen)       │
│  ──────────────────────────────────────────         │
│  "J'avais précisé mon allergie à l'arachide...      │
│   j'ai fait une réaction en rentrant"               │
│   → allergen_concern                                │
│                                                     │
│  "J'ai trouvé un cheveu dans mon yakisoba"          │
│   → hygiene                                         │
│                                                     │
│                                                     │
│  WHY SYNTHETIC?                                     │
│  Le Kyoto is 4.7★ — allergen scares, hygiene        │
│  incidents are rare. But the system must handle     │
│  them. Synthetic = stress-testing the long tail.    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### Questions du jury que cette slide répond

**Q1: "How do you know the synthetic ones are realistic?"**

> Réponse orale : "They're modeled on real review patterns from the restaurant industry — same language, same complaints, just for incident types Le Kyoto rarely gets. And they're clearly labeled in the dataset. The GRPR metric runs on both — if the system handles a synthetic allergen case correctly, it'll handle a real one too."

**Q2: "Why not just use more restaurants' data?"**

> Réponse orale : "Because the policy, menu, and pricing are specific to Le Kyoto. The grounding check verifies claims against OUR tools — our menu prices, our credit policy. Using another restaurant's reviews wouldn't test our grounding pipeline. The value is that it's end-to-end real for one business."

**Q3: "48 cases — isn't that too small?"**

> Réponse orale : "For a hackathon proof-of-concept, 48 cases with a binary mechanical metric is solid. The GRPR gap is 40 points — that's not noise. And the kill-shot confirms it: disable the Verifier, the score collapses. You don't need 10,000 cases to prove coordination matters when one flag flips the result."

---

## Slide: How We Use Weave

### Texte de la slide

**Title:** Every claim is a Weave op

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  21 traced() decorators across the pipeline         │
│                                                     │
│  WHAT'S TRACED:                                     │
│                                                     │
│  Agent calls                                        │
│  ├── recovery.case (full case run)                  │
│  ├── agent.recovery.curator                         │
│  ├── agent.recovery.analyst                         │
│  ├── agent.recovery.writer                          │
│  └── agent.recovery.verifier                        │
│                                                     │
│  Tool executions                                    │
│  ├── tool.policy_lookup                             │
│  ├── tool.get_reviews                               │
│  ├── tool.get_menu                                  │
│  └── tool.demand_baseline                           │
│                                                     │
│  Memory operations                                  │
│  ├── memory.embed                                   │
│  ├── memory.writeFailureCard                        │
│  └── memory.retrieveFailureCards                    │
│                                                     │
│  WHY IT MATTERS:                                    │
│  Solo says "15% credit" → open Weave →              │
│  trace back to policy_lookup → tool returned        │
│  maxCreditPct: 15 → claim is GROUNDED.              │
│                                                     │
│  Solo says "20% discount" → open Weave →            │
│  no tool ever returned 20 → UNGROUNDED.             │
│  That's how the Verifier catches it.                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### Questions du jury que cette slide répond

**Q1: "How do you use Weave specifically?"**

> Réponse orale : "Every agent call, every tool execution, every memory operation is a Weave op. 21 traced decorators total. You can open any case, drill into the Curator's tool calls, see what the policy_lookup returned, and trace exactly why the Verifier passed or blocked. It's full observability on the multi-agent pipeline. Not a black box."

**Q2: "Could you build this without Weave?"**

> Réponse orale : "You could build the agents, sure. But you couldn't PROVE the grounding. The whole point of GRPR is that every claim traces back to a tool result. Weave makes that audit trail visible and inspectable. Without it, you're trusting the system. With it, you're verifying it."

**Q3: "What does a Weave trace look like for one case?"**

> Réponse orale : "You see the full tree: recovery.case at the top, then Curator with its 4-5 tool calls nested inside, then Analyst, then Writer, then Verifier. Each tool call shows input and output. When the Verifier blocks, you see the exact claim that failed and the tool result it should have matched. It's a debugger for multi-agent coordination."

---

## Slide: How We Use Redis

### Texte de la slide

**Title:** Failure cards = persistent memory

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  REDIS = the system's long-term memory              │
│                                                     │
│  HOW IT WORKS:                                      │
│                                                     │
│  Case N: Writer drafts "20% off"                    │
│          Verifier BLOCKS                            │
│              ↓                                      │
│          Write failure card to Redis:               │
│          {                                          │
│            tags: ["over_promise", "food_quality"],   │
│            lesson: "max 15% — never exceed policy", │
│            embedding: [0.23, -0.41, ...]            │
│          }                                          │
│                                                     │
│  Case N+1 (similar review comes in):               │
│          Retrieve top-3 cards by similarity         │
│              ↓                                      │
│          Writer sees past lessons BEFORE drafting   │
│              ↓                                      │
│          Drafts "15% credit" on first attempt       │
│          No rewrite needed. Fewer tokens.           │
│                                                     │
│  THREE TIERS (graceful degradation):                │
│  1. RediSearch (FT.SEARCH + KNN vector search)      │
│  2. Plain Redis (key-value + cosine in JS)          │
│  3. In-memory fallback (no persistence)             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### Questions du jury que cette slide répond

**Q1: "Why Redis specifically?"**

> Réponse orale : "We need persistent, fast retrieval of structured failure cards with tag filtering and vector similarity. Redis with RediSearch gives us KNN vector search with pre-filtering by incident type — in one query. And it's a sponsor, so we built a real integration, not a wrapper."

**Q2: "What happens if Redis goes down?"**

> Réponse orale : "Three-tier fallback. First, we try RediSearch with full vector KNN. If the FT module isn't available, we fall back to plain Redis with cosine similarity in JavaScript. If Redis is completely unreachable, we use in-memory storage. The harness never crashes — it just loses persistence between runs."

**Q3: "Is the memory actually helping the score?"**

> Réponse orale : "Honestly, on a small dataset the lift isn't always statistically significant — we report that transparently. But the mechanism is real: failure cards prevent repeated mistakes. The bigger win on small N is the within-session rewrite driven by the Verifier. Memory shines at scale when patterns accumulate."

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
