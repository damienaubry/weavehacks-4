# Prompt for Claude: Build Slide Deck on /demo page

## Context

We have a Next.js app at `apps/web/`. We need a presentation slide deck at route `/demo` that I'll use for the hackathon pitch (3 minutes). The content is already written in `docs/pitch-deck.md`. Build a clean, minimal, professional slide deck as a React page.

## Requirements

### Route & Structure

- Create a new page at `apps/web/app/demo/page.tsx`
- Client component ("use client")
- Full-screen slides (100vw × 100vh per slide)
- **Horizontal navigation**: arrow keys (Left/Right) + click/tap sides to navigate
- Show current slide number (e.g. "3 / 8") in bottom-right corner, subtle
- No dependencies to install — use only what's already in the project (React, Tailwind/CSS modules, Next.js)

### Design Principles

- **Dark background** (near-black: #0a0a0a or similar) with white/light text
- **Monospace font** for code/data blocks, clean sans-serif for titles
- **Minimal**: no animations, no transitions, no distracting effects. Content-first.
- **High contrast**: important numbers (percentages, token counts) in accent colors
- **Color coding**: 
  - Red/coral for failures (solo, blocked, ❌)
  - Green/emerald for passes (team, ✅)
  - Blue/cyan for neutral info (memory, tools)
  - Yellow/amber for warnings (⚠️)
- **Large text**: titles should be readable from 5 meters away (think conference screen)
- **Whitespace**: don't cram. If content is dense, let it breathe.

### Slide Content (8 slides)

Use the content from `docs/pitch-deck.md`. Each slide has a title and a visual block. Here's the mapping:

**Slide 1: Introduction**
- Title: "Grounded Recovery Copilot"
- Subtitle: "Multi-agent review recovery for a real restaurant"
- Key info: Le Kyoto, 4.7★, the problem, the product (triage + reply + ticket), dataset (30 real + 18 synthetic)
- Punchline quote at bottom

**Slide 2: What It Does**
- Title: "One review in, full recovery package out"
- Visual: Input (star rating + review text) → Arrow → Output (3 items: triage, reply with grounding indicator, ticket)
- Lock icon: "Human approves before publish"

**Slide 3: Solo vs Team**
- Title: "Same model, same tools. Only orchestration changes."
- Three stacked blocks: Solo (red, 60%, "20% discount", FAIL), Team (green, 100%, "15% credit", PASS), Team+Memory (blue, 80%+, "first draft correct")
- Token counts visible for each

**Slide 4: Blind vs Targeted**
- Title: "3 blind revisions < 1 targeted rewrite"
- Two-column layout: Left = Solo (red tint), Right = Team (green tint)
- Solo: Draft → "be warmer" → "be warmer" → same mistake. Never told what's wrong.
- Team: Draft → Verifier: "20% exceeds 15%" → fix. Done.
- Bottom punchline: "Like proofreading your own essay 3 times vs. a colleague saying 'wrong number, line 4.'"

**Slide 5: Weave**
- Title: "Not a black box — every decision is traceable"
- Visual: Tree structure showing the Weave trace (recovery.case → agents → tools → pass/block)
- Bottom: "Click any node → see input, output, tokens"

**Slide 6: Redis**
- Title: "Learns from mistakes, no retraining"
- Visual: Two-step flow. Case N: block → write failure card. Case N+1: retrieve card → correct first try.
- Bottom: "RediSearch + vector KNN · Three-tier fallback"

**Slide 7: CopilotKit**
- Title: "The owner's advisor before approving"
- Visual: Chat-like UI showing the audit checklist (✓ items) then the "what if free meal?" exchange
- Bottom: "AI advises. Human decides. Nothing auto-sends."

**Slide 8: Kill-Shot**
- Title: "Prove it's the coordination"
- Visual: Two terminal blocks. First: normal scores. Second: --no-verifier with COLLAPSED labels in red.
- Bottom: "If removing one agent collapses the score, that agent IS the value."

### Keyboard Navigation

```typescript
useEffect(() => {
  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ') next();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'Escape') goToFirst();
  };
  window.addEventListener('keydown', handleKey);
  return () => window.removeEventListener('keydown', handleKey);
}, []);
```

### Important Constraints

- Do NOT install any new packages (no reveal.js, no slidev, no deck.gl)
- Do NOT modify any existing pages or components
- Pure React + CSS/Tailwind (use whatever styling system is already in the project)
- Each slide is a separate component or section within the page
- The page should work standalone (no API calls needed, all content is static/hardcoded)
- Make it responsive enough to work on the presenter's laptop screen AND a projected display
- Add a subtle "Press → to navigate" hint on slide 1 that disappears after first navigation

### File Structure

```
apps/web/app/demo/
├── page.tsx          (main page with navigation logic)
└── slides/           (optional: individual slide components if cleaner)
    ├── Slide1.tsx
    ├── Slide2.tsx
    └── ...
```

Or if simpler, put everything in `page.tsx` with slide data as an array.

## Summary

One self-contained page at `/demo`. Dark theme, horizontal slides, keyboard navigation. Content from `docs/pitch-deck.md`. No new dependencies. Clean and professional — this is for a $15K hackathon with judges from OpenAI, Google DeepMind, and Cursor.
