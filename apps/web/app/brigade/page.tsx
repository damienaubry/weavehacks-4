"use client";

/**
 * /brigade — the INTERNAL view: watch the agent brigade discuss, see every tool call, and the
 * solo-vs-team scoreboard. This is a dev/debug + "pull back the curtain" surface — NOT the
 * owner's product screen (that's `/`). Useful for building and as the proof moment in the demo.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchDiscussion, fetchScoreboard, type DiscussionResult, type Scoreboard } from "../lib/brigade";
import { MOCK_SWINGS } from "../lib/mock-discussion";
import { Turn } from "../components/Discussion";
import { HumanGate } from "../components/HumanGate";
import { ScoreboardView } from "../components/Scoreboard";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";

const WEAVE_PROJECT = process.env.NEXT_PUBLIC_WEAVE_PROJECT ?? "weavehacks-4";

export default function BrigadePage() {
  const [discussion, setDiscussion] = useState<DiscussionResult | null>(null);
  const [mocked, setMocked] = useState(false);
  const [board, setBoard] = useState<Scoreboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [scoreErr, setScoreErr] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setScoreErr(null);
    await Promise.all([
      fetchDiscussion().then((r) => {
        setDiscussion(r.result);
        setMocked(r.mocked);
      }),
      fetchScoreboard()
        .then(setBoard)
        .catch((e) => setScoreErr((e as Error).message)),
    ]);
    setLoading(false);
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: "20px 24px 80px" }}>
      {/* top strip — brand + back to owner + theme toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <Logo tag={null} />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" style={{ fontSize: 13, color: "var(--muted)" }}>
            ← Owner
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div>
          <p style={{ color: "var(--warn)", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", margin: 0 }}>
            Brigade · internal · how it decided
          </p>
          <h1 style={{ fontSize: 28, margin: "6px 0 2px", lineHeight: 1.1 }}>The brigade at work</h1>
          <p style={{ color: "var(--muted)", fontSize: 15, marginTop: 0 }}>
            Chef delegates · Historian &amp; Scout disagree · Prep reconciles. Every call traced in Weave.
          </p>
        </div>
        <button onClick={run} disabled={loading} style={btnStyle(loading)}>
          {loading ? "Running…" : "Re-run"}
        </button>
      </header>

      {discussion && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "28px 0 16px" }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>
              {discussion.weekday} {discussion.date}
            </h2>
            {mocked && (
              <span
                style={{ fontSize: 11, color: "var(--warn)", border: "1px solid var(--warn)", borderRadius: 6, padding: "2px 7px" }}
                title="Backend /prep endpoint not wired yet — showing a local mock with the same shape."
              >
                preview · mock
              </span>
            )}
          </div>

          {discussion.turns.map((t, i) => (
            <Turn key={i} turn={t} index={i} />
          ))}

          <HumanGate swings={MOCK_SWINGS} />
        </>
      )}

      <section style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>The proof: solo vs. team</h2>
        <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 16px" }}>
          Same scenario, run two ways — the numeric difference is the whole thesis.
        </p>
        {scoreErr ? (
          <p style={{ color: "#f87171", fontSize: 14 }}>
            {scoreErr} — is the API up? Run <code>pnpm dev</code> (api on :3001).
          </p>
        ) : board ? (
          <ScoreboardView board={board} />
        ) : (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading scoreboard…</p>
        )}
      </section>

      <footer style={{ color: "var(--muted)", fontSize: 13, marginTop: 28 }}>
        Traced in <strong>W&amp;B Weave</strong> · project <code>{WEAVE_PROJECT}</code> —{" "}
        <a href="https://wandb.ai" target="_blank" rel="noreferrer">
          open dashboard
        </a>
        . CLI: <code>pnpm prep</code>, <code>pnpm compare</code>.
      </footer>
    </main>
  );
}

function btnStyle(loading: boolean): React.CSSProperties {
  return {
    background: "var(--accent)",
    color: "#06210f",
    border: 0,
    borderRadius: 8,
    padding: "9px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: loading ? "wait" : "pointer",
    whiteSpace: "nowrap",
  };
}
