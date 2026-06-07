"use client";

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";

/*
 * /demo — the 3-minute pitch deck. Self-contained: dark theme baked in (ignores the
 * app's light/dark toggle), no API calls, all content static from docs/pitch-deck.md.
 * Horizontal slides; ←/→ (or click left/right edge) to navigate; Esc → first slide.
 */

// ── palette ──────────────────────────────────────────────────────────────────
const BG = "#0a0a0a";
const PANEL = "#121316";
const BORDER = "#23262d";
const TEXT = "#e8edf2";
const MUTED = "#8b95a1";
const RED = "#f87171"; // failures / blocked
const GREEN = "#4ade80"; // passes
const CYAN = "#38bdf8"; // neutral info / memory / tools
const AMBER = "#fbbf24"; // warnings

const MONO =
  'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';
const SANS =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

// ── shared style helpers ───────────────────────────────────────────────────────
const card: CSSProperties = {
  background: PANEL,
  border: `1px solid ${BORDER}`,
  borderRadius: 14,
  padding: "clamp(16px, 2.4vh, 28px) clamp(20px, 2vw, 32px)",
};

function Kicker({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: "clamp(11px, 1vw, 14px)",
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: MUTED,
        marginBottom: "clamp(8px, 1.4vh, 16px)",
      }}
    >
      {children}
    </div>
  );
}

function Title({ children }: { children: ReactNode }) {
  return (
    <h1
      style={{
        fontFamily: SANS,
        fontSize: "clamp(26px, min(4vw, 5.2vh), 54px)",
        lineHeight: 1.06,
        fontWeight: 700,
        letterSpacing: "-0.02em",
        margin: 0,
        maxWidth: "22ch",
      }}
    >
      {children}
    </h1>
  );
}

function Punchline({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        fontFamily: SANS,
        fontSize: "clamp(15px, 1.6vw, 22px)",
        color: MUTED,
        fontStyle: "italic",
        maxWidth: "60ch",
        margin: 0,
        lineHeight: 1.45,
      }}
    >
      {children}
    </p>
  );
}

// ── individual slides ──────────────────────────────────────────────────────────

function Slide1() {
  return (
    <SlideFrame>
      <Kicker>WeaveHacks 4 · Le Kyoto</Kicker>
      <Title>
        Grounded Recovery <span style={{ color: "hsl(16 90% 60%)" }}>Copilot</span>
      </Title>
      <p
        style={{
          fontFamily: SANS,
          fontSize: "clamp(16px, 1.8vw, 26px)",
          color: TEXT,
          marginTop: "clamp(8px, 1.4vh, 14px)",
          marginBottom: "clamp(16px, 3vh, 34px)",
        }}
      >
        Multi-agent review recovery for a real restaurant.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 18,
          width: "100%",
          maxWidth: 1000,
        }}
      >
        <div style={card}>
          <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>🍜 Le Kyoto</div>
          <div style={{ color: MUTED, lineHeight: 1.5 }}>
            Japanese takeout · near Paris ·{" "}
            <span style={{ color: AMBER, fontWeight: 600 }}>4.7★</span> on Google
          </div>
        </div>
        <div style={card}>
          <div style={{ color: RED, fontFamily: MONO, fontSize: 12, letterSpacing: "0.15em", marginBottom: 8 }}>
            THE PROBLEM
          </div>
          <div style={{ lineHeight: 1.5 }}>
            A bad review needs a fast, accurate response. One wrong promise = broken trust + real
            cost.
          </div>
        </div>
        <div style={card}>
          <div style={{ color: GREEN, fontFamily: MONO, fontSize: 12, letterSpacing: "0.15em", marginBottom: 8 }}>
            THE PRODUCT — one review in →
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
            <li>Incident triage</li>
            <li>Grounded public reply (no hallucinated promises)</li>
            <li>Internal action ticket</li>
            <li style={{ color: AMBER }}>🔒 Nothing publishes without human approval</li>
          </ul>
        </div>
        <div style={card}>
          <div style={{ color: CYAN, fontFamily: MONO, fontSize: 12, letterSpacing: "0.15em", marginBottom: 8 }}>
            DATASET
          </div>
          <div style={{ lineHeight: 1.5 }}>
            <span style={{ color: GREEN, fontWeight: 600 }}>30 real</span> Google reviews +{" "}
            <span style={{ color: CYAN, fontWeight: 600 }}>18 synthetic</span> edge cases to
            stress-test.
          </div>
        </div>
      </div>

      <div style={{ marginTop: "clamp(14px, 2.6vh, 32px)" }}>
        <Punchline>
          “My restaurant is 4.7★ — I needed more of the angry ones to stress-test the system.”
        </Punchline>
      </div>
    </SlideFrame>
  );
}

function Slide2() {
  return (
    <SlideFrame>
      <Kicker>What it does</Kicker>
      <Title>One review in, full recovery package out</Title>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(260px, 1fr) auto minmax(300px, 1.3fr)",
          alignItems: "center",
          gap: 24,
          width: "100%",
          maxWidth: 1100,
          marginTop: "clamp(16px, 3vh, 40px)",
        }}
      >
        {/* INPUT */}
        <div style={card}>
          <div style={{ color: MUTED, fontFamily: MONO, fontSize: 12, letterSpacing: "0.15em", marginBottom: 12 }}>
            INPUT
          </div>
          <div style={{ fontSize: 26, color: AMBER, letterSpacing: 2, marginBottom: 12 }}>
            ★★☆☆☆
          </div>
          <div style={{ fontFamily: MONO, fontSize: 15, color: TEXT, lineHeight: 1.5 }}>
            “Inadmissible, il manque la moitié de la commande !”
          </div>
        </div>

        <div style={{ fontSize: 40, color: MUTED, textAlign: "center" }}>→</div>

        {/* OUTPUT */}
        <div style={{ display: "grid", gap: 12 }}>
          <OutputRow n="1" label="TRIAGE" color={CYAN}>
            <code style={{ fontFamily: MONO, color: CYAN }}>wrong_or_missing_item</code>
          </OutputRow>
          <OutputRow n="2" label="PUBLIC REPLY" color={GREEN}>
            “We&apos;d like to offer you a <b>10€ credit</b> on your next order.”
            <div style={{ color: GREEN, fontSize: 13, marginTop: 6 }}>
              → backed by policy_lookup (within 15% cap) ✓
            </div>
          </OutputRow>
          <OutputRow n="3" label="INTERNAL TICKET" color={AMBER}>
            <code style={{ fontFamily: MONO }}>high · ops · re-send missing items</code>
          </OutputRow>
        </div>
      </div>

      <div style={{ marginTop: "clamp(14px, 2.6vh, 32px)", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 22 }}>🔒</span>
        <Punchline>Human approves → then it goes public.</Punchline>
      </div>
    </SlideFrame>
  );
}

function OutputRow({
  n,
  label,
  color,
  children,
}: {
  n: string;
  label: string;
  color: string;
  children: ReactNode;
}) {
  return (
    <div style={{ ...card, padding: "16px 20px", display: "flex", gap: 14 }}>
      <div
        style={{
          fontFamily: MONO,
          fontWeight: 700,
          color,
          fontSize: 18,
          minWidth: 18,
        }}
      >
        {n}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.15em", color, marginBottom: 6 }}>
          {label}
        </div>
        <div style={{ lineHeight: 1.5 }}>{children}</div>
      </div>
    </div>
  );
}

function Slide3() {
  const rows = [
    {
      tier: "SOLO AGENT",
      note: "fails",
      color: RED,
      score: "80%",
      icon: "❌",
      quote: "states “missing items in the order”…",
      lines: ["→ No tool result backs that claim. UNGROUNDED.", "→ 225K tokens spent. Still fails one check."],
      tokens: "225K tokens",
    },
    {
      tier: "TEAM",
      note: "passes",
      color: GREEN,
      score: "90%",
      icon: "✅",
      quote: "every claim traced to a tool result.",
      lines: [
        "→ Verifier flags the ungrounded claim. BLOCKS.",
        "→ Writer rewrites — grounded. Now passes.",
      ],
      tokens: "151K tokens — fewer than solo",
    },
    {
      tier: "TEAM + MEMORY",
      note: "cheapest",
      color: CYAN,
      score: "80%",
      icon: "⚡",
      quote: "Same score as team — at the lowest cost.",
      lines: ["→ Cross-run memory: 91K tokens, 61 calls.", "→ Honest result: 80% — did not beat team here."],
      tokens: "91K tokens — cheapest of all three",
    },
  ];
  return (
    <SlideFrame>
      <Kicker>The core proof</Kicker>
      <Title>Same model, same tools. Only orchestration changes.</Title>

      <div
        style={{
          display: "grid",
          gap: "clamp(10px, 1.6vh, 16px)",
          width: "100%",
          marginTop: "clamp(16px, 3vh, 32px)",
        }}
      >
        {rows.map((r) => (
          <div
            key={r.tier}
            style={{
              ...card,
              padding: "clamp(12px, 2vh, 22px) clamp(18px, 2vw, 28px)",
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) auto",
              alignItems: "center",
              gap: 20,
              borderLeft: `4px solid ${r.color}`,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: "clamp(16px, 1.8vw, 20px)", color: r.color }}>
                  {r.tier}
                </span>
                <span style={{ color: MUTED, fontStyle: "italic" }}>({r.note})</span>
              </div>
              <div style={{ fontFamily: MONO, fontSize: "clamp(13px, 1.4vw, 16px)", marginBottom: 5 }}>
                {r.quote}
              </div>
              {r.lines.map((l) => (
                <div key={l} style={{ color: MUTED, fontSize: "clamp(12px, 1.2vw, 14px)", lineHeight: 1.5 }}>
                  {l}
                </div>
              ))}
              <div style={{ color: r.color, fontFamily: MONO, fontSize: 13, marginTop: 6 }}>
                {r.tokens}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 20, marginBottom: 2 }}>{r.icon}</div>
              <div
                style={{
                  fontFamily: MONO,
                  fontWeight: 700,
                  fontSize: "clamp(30px, min(4vw, 6vh), 50px)",
                  color: r.color,
                  lineHeight: 1,
                }}
              >
                {r.score}
              </div>
            </div>
          </div>
        ))}
      </div>
    </SlideFrame>
  );
}

function Slide4() {
  return (
    <SlideFrame>
      <Kicker>Why solo fails despite 3 revisions</Kicker>
      <Title>3 blind revisions &lt; 1 targeted rewrite</Title>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          width: "100%",
          maxWidth: 1100,
          marginTop: "clamp(14px, 2.8vh, 36px)",
        }}
      >
        <div style={{ ...card, background: "rgba(248,113,113,0.06)", borderColor: "rgba(248,113,113,0.4)" }}>
          <div style={{ color: RED, fontWeight: 700, fontSize: 19, marginBottom: 14 }}>
            SOLO · revises blind
          </div>
          <div style={{ fontFamily: MONO, fontSize: 14, color: TEXT, marginBottom: 16, lineHeight: 1.6 }}>
            Draft → “Revise: be warmer” → “be warmer” → <span style={{ color: RED }}>same mistake</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", lineHeight: 1.9, color: RED }}>
            <li>❌ Never told WHAT is wrong</li>
            <li>❌ “Be warmer” = be more generous = worse</li>
            <li>❌ More tokens (225K), still fails one check</li>
          </ul>
        </div>

        <div style={{ ...card, background: "rgba(74,222,128,0.06)", borderColor: "rgba(74,222,128,0.4)" }}>
          <div style={{ color: GREEN, fontWeight: 700, fontSize: 19, marginBottom: 14 }}>
            TEAM · targeted fix
          </div>
          <div style={{ fontFamily: MONO, fontSize: 14, color: TEXT, marginBottom: 16, lineHeight: 1.6 }}>
            Draft → Verifier: <span style={{ color: AMBER }}>“claim not in the evidence ledger”</span> → fix it
          </div>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", lineHeight: 1.9, color: GREEN }}>
            <li>✅ Knows EXACTLY what to fix</li>
            <li>✅ One rewrite, done</li>
            <li>✅ Targeted fix (151K tokens), passes</li>
          </ul>
        </div>
      </div>

      <div style={{ marginTop: "clamp(12px, 2.4vh, 28px)" }}>
        <Punchline>
          Like proofreading your own essay 3 times vs. a colleague saying “that claim has no source.”
        </Punchline>
      </div>
    </SlideFrame>
  );
}

function Slide5() {
  const tree: { text: string; color?: string; indent: number }[] = [
    { text: "recovery.case", indent: 0 },
    { text: "├── agent.curator", indent: 0 },
    { text: "│   ├── tool.get_reviews ✓", color: GREEN, indent: 0 },
    { text: "│   ├── tool.policy_lookup ✓", color: GREEN, indent: 0 },
    { text: "│   └── tool.get_menu ✓", color: GREEN, indent: 0 },
    { text: "├── agent.analyst", indent: 0 },
    { text: "│   └── triage: wrong_or_missing_item ✓", color: CYAN, indent: 0 },
    { text: "├── agent.writer", indent: 0 },
    { text: "│   └── draft v1: ungrounded claim ⚠️", color: AMBER, indent: 0 },
    { text: "├── agent.verifier", indent: 0 },
    { text: "│   └── BLOCKED: claim not in ledger ❌", color: RED, indent: 0 },
    { text: "├── agent.writer (rewrite)", indent: 0 },
    { text: "│   └── draft v2: all claims grounded ✓", color: GREEN, indent: 0 },
    { text: "└── agent.verifier", indent: 0 },
    { text: "    └── PASS ✅", color: GREEN, indent: 0 },
  ];
  return (
    <SlideFrame>
      <Kicker>Weave · sponsor tech</Kicker>
      <Title>Not a black box — every decision is traceable</Title>

      <div style={{ ...card, marginTop: "clamp(14px, 2.8vh, 32px)", width: "100%", maxWidth: 820 }}>
        <div style={{ color: MUTED, fontFamily: MONO, fontSize: 12, letterSpacing: "0.15em", marginBottom: 14 }}>
          WEAVE TRACE — one recovery case
        </div>
        <pre
          style={{
            fontFamily: MONO,
            fontSize: "clamp(12px, 1.3vw, 17px)",
            lineHeight: 1.6,
            margin: 0,
            whiteSpace: "pre",
            overflow: "hidden",
          }}
        >
          {tree.map((row, i) => (
            <div key={i} style={{ color: row.color ?? TEXT }}>
              {row.text}
            </div>
          ))}
        </pre>
      </div>

      <div style={{ marginTop: "clamp(10px, 2.2vh, 24px)" }}>
        <Punchline>
          Click any node → see input, output, tokens. The Verifier&apos;s block is{" "}
          <span style={{ color: GREEN, fontStyle: "normal", fontWeight: 600 }}>provable</span> in
          Weave — 21 traced ops.
        </Punchline>
      </div>
    </SlideFrame>
  );
}

function Slide6() {
  return (
    <SlideFrame>
      <Kicker>Redis · sponsor tech</Kicker>
      <Title>Learns from mistakes, no retraining</Title>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 20,
          width: "100%",
          maxWidth: 1050,
          marginTop: "clamp(14px, 2.8vh, 36px)",
        }}
      >
        <div style={card}>
          <div style={{ color: RED, fontFamily: MONO, fontSize: 12, letterSpacing: "0.15em", marginBottom: 10 }}>
            CASE N
          </div>
          <div style={{ fontFamily: MONO, fontSize: 14, lineHeight: 1.7 }}>
            Writer → ungrounded claim → <span style={{ color: RED }}>Verifier BLOCKS</span>
            <div style={{ marginTop: 12, color: MUTED }}>↓ writes a failure card → Redis</div>
            <div style={{ marginTop: 8, color: CYAN }}>
              {"{ tag: “ungrounded”, lesson: “cite the order” }"}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 36, color: MUTED }}>→</div>

        <div style={{ ...card, borderColor: "rgba(74,222,128,0.4)" }}>
          <div style={{ color: GREEN, fontFamily: MONO, fontSize: 12, letterSpacing: "0.15em", marginBottom: 10 }}>
            CASE N+1 — similar complaint
          </div>
          <div style={{ fontFamily: MONO, fontSize: 14, lineHeight: 1.7 }}>
            Retrieve card → Writer sees lesson BEFORE writing
            <div style={{ marginTop: 12, color: GREEN }}>
              ↓ cites the evidence first try. No rewrite.
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...card, marginTop: "clamp(10px, 2vh, 22px)", maxWidth: 1050, width: "100%" }}>
        <span style={{ color: CYAN, fontWeight: 600 }}>RediSearch + vector KNN</span>
        <span style={{ color: MUTED }}>
          {" "}
          · similarity search by incident type · top-3 cards retrieved · three-tier fallback (never
          crashes)
        </span>
      </div>
    </SlideFrame>
  );
}

function Slide7() {
  return (
    <SlideFrame>
      <Kicker>CopilotKit · sponsor tech</Kicker>
      <Title>The owner&apos;s advisor before approving</Title>

      <div style={{ width: "100%", maxWidth: 880, marginTop: "clamp(12px, 2.4vh, 28px)", display: "grid", gap: "clamp(8px, 1.6vh, 14px)" }}>
        <div style={card}>
          <div style={{ color: MUTED, fontFamily: MONO, fontSize: 12, letterSpacing: "0.15em", marginBottom: 12 }}>
            BEFORE YOU CLICK “APPROVE”
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 20 }}>🤖</span>
            <span style={{ color: TEXT, fontWeight: 600 }}>Audit Copilot — here&apos;s my check:</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", lineHeight: 2, color: GREEN }}>
            <li>✓ 10€ credit — within the 15% policy cap</li>
            <li>✓ “missing items” — customer DID say that</li>
            <li>✓ No forbidden gestures</li>
            <li>✓ Ticket complete: high · ops · re-send items</li>
          </ul>
          <div style={{ color: GREEN, marginTop: 10, fontWeight: 600 }}>→ Safe to approve.</div>
        </div>

        <div style={card}>
          <div style={{ color: AMBER, marginBottom: 10, fontFamily: MONO, fontSize: 14 }}>
            Owner: “What if I offer a free meal instead?”
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🤖</span>
            <div style={{ lineHeight: 1.6 }}>
              “Free meal is <span style={{ color: RED }}>outside your policy</span>. Risk: ~15-20€
              cost, no automated tracking. Alternative: max credit is 15% (≈ 10€). Your call — flag
              it as a manual override?”
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "clamp(10px, 2.2vh, 24px)" }}>
        <Punchline>AI advises. Human decides. Nothing auto-sends.</Punchline>
      </div>
    </SlideFrame>
  );
}

function Slide8() {
  return (
    <SlideFrame>
      <Kicker>The kill-shot · live demo</Kicker>
      <Title>Prove it&apos;s the coordination</Title>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          width: "100%",
          maxWidth: 1050,
          marginTop: "clamp(12px, 2.6vh, 32px)",
        }}
      >
        <div style={{ ...card, fontFamily: MONO }}>
          <div style={{ color: MUTED, marginBottom: 14 }}>$ pnpm recovery</div>
          <Terminal rows={[
            ["solo", "80%", "225K tokens", MUTED],
            ["team", "90%", "151K tokens", GREEN],
            ["team+mem", "80%", "91K tokens", CYAN],
          ]} />
        </div>

        <div style={{ ...card, fontFamily: MONO, borderColor: "rgba(248,113,113,0.45)" }}>
          <div style={{ color: MUTED, marginBottom: 14 }}>$ pnpm recovery --no-verifier</div>
          <Terminal rows={[
            ["solo", "80%", "", MUTED],
            ["team", "↓", "← collapses toward solo", RED],
            ["team+mem", "↓", "← collapses toward solo", RED],
          ]} />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 24,
          marginTop: 26,
          fontFamily: MONO,
          fontSize: "clamp(13px, 1.4vw, 17px)",
          color: GREEN,
          flexWrap: "wrap",
        }}
      >
        <span>Same model ✓</span>
        <span>Same tools ✓</span>
        <span>Same budget ✓</span>
        <span style={{ color: AMBER }}>One flag changed: Verifier OFF</span>
      </div>

      <div style={{ marginTop: "clamp(10px, 2vh, 22px)" }}>
        <Punchline>
          “If removing one agent collapses the score, that agent IS the value.”
        </Punchline>
      </div>
    </SlideFrame>
  );
}

function Terminal({ rows }: { rows: [string, string, string, string][] }) {
  return (
    <div style={{ display: "grid", gap: 8, fontSize: "clamp(14px, 1.5vw, 19px)" }}>
      {rows.map(([name, score, note, color], i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "120px 70px 1fr", color }}>
          <span>{name}</span>
          <span style={{ fontWeight: 700, textAlign: "right" }}>{score}</span>
          <span style={{ paddingLeft: 16 }}>{note}</span>
        </div>
      ))}
    </div>
  );
}

// ── slide frame + deck shell ────────────────────────────────────────────────────

function SlideFrame({ children }: { children: ReactNode }) {
  return (
    <section
      style={{
        width: "100vw",
        height: "100vh",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "clamp(28px, 3.5vh, 56px) clamp(40px, 6vw, 96px)",
        background: BG,
        color: TEXT,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1180,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          height: "100%",
        }}
      >
        {children}
      </div>
    </section>
  );
}

const SLIDES = [Slide1, Slide2, Slide3, Slide4, Slide5, Slide6, Slide7, Slide8];

export default function DemoDeck() {
  const [i, setI] = useState(0);
  const [navigated, setNavigated] = useState(false);

  const go = useCallback(
    (delta: number) => {
      setNavigated(true);
      setI((cur) => Math.min(SLIDES.length - 1, Math.max(0, cur + delta)));
    },
    [],
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Escape") {
        setNavigated(true);
        setI(0);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [go]);

  const Current = SLIDES[i];

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        background: BG,
        color: TEXT,
        fontFamily: SANS,
        overflow: "hidden",
        zIndex: 9999,
      }}
    >
      <Current />

      {/* click zones — left 30% prev, right 30% next */}
      <button
        aria-label="Previous slide"
        onClick={() => go(-1)}
        style={{ ...edgeZone, left: 0, cursor: i > 0 ? "w-resize" : "default" }}
      />
      <button
        aria-label="Next slide"
        onClick={() => go(1)}
        style={{ ...edgeZone, right: 0, cursor: i < SLIDES.length - 1 ? "e-resize" : "default" }}
      />

      {/* progress dots */}
      <div
        style={{
          position: "fixed",
          bottom: 22,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 8,
          zIndex: 2,
        }}
      >
        {SLIDES.map((_, idx) => (
          <span
            key={idx}
            style={{
              width: idx === i ? 22 : 8,
              height: 8,
              borderRadius: 4,
              background: idx === i ? TEXT : BORDER,
              transition: "width 120ms ease",
            }}
          />
        ))}
      </div>

      {/* slide counter */}
      <div
        style={{
          position: "fixed",
          bottom: 18,
          right: 22,
          fontFamily: MONO,
          fontSize: 13,
          color: MUTED,
          zIndex: 2,
        }}
      >
        {i + 1} / {SLIDES.length}
      </div>

      {/* nav hint — slide 1 only, until first navigation */}
      {!navigated && i === 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 18,
            left: 22,
            fontFamily: MONO,
            fontSize: 13,
            color: MUTED,
            zIndex: 2,
          }}
        >
          Press → to navigate
        </div>
      )}
    </main>
  );
}

const edgeZone: CSSProperties = {
  position: "fixed",
  top: 0,
  width: "30%",
  height: "100%",
  background: "transparent",
  border: "none",
  padding: 0,
  zIndex: 1,
};
