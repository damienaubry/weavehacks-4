"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Scoreboard {
  name: string;
  solo: number;
  team: number;
  delta: number;
}

export default function Home() {
  const [board, setBoard] = useState<Scoreboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runScoreboard() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/compare`);
      setBoard(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const pct = (n: number) => `${Math.round(n * 100)}%`;

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px" }}>
      <p style={{ color: "var(--warn)", fontSize: 13, letterSpacing: 1, textTransform: "uppercase", margin: 0 }}>
        Project A or B — undecided
      </p>
      <h1 style={{ fontSize: 34, margin: "8px 0 4px", lineHeight: 1.1 }}>WeaveHacks 4</h1>
      <p style={{ color: "var(--muted)", fontSize: 16, marginTop: 0 }}>
        Multi-agent orchestration spine. This is a neutral demo shell — no domain UI yet.
      </p>

      <section
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 24,
          marginTop: 32,
        }}
      >
        <h2 style={{ fontSize: 18, marginTop: 0 }}>Scoreboard — solo vs team</h2>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>
          The same scenario, run two ways. The number is what gets judged. (Neutral
          placeholder scenario — replaced once we pick A or B.)
        </p>

        <button
          onClick={runScoreboard}
          disabled={loading}
          style={{
            background: "var(--accent)",
            color: "#06210f",
            border: 0,
            borderRadius: 8,
            padding: "10px 16px",
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Running…" : "Run scoreboard"}
        </button>

        {error && (
          <p style={{ color: "#f87171", fontSize: 13, marginTop: 16 }}>
            {error} — is the API running? <code>pnpm dev</code>
          </p>
        )}

        {board && (
          <div style={{ display: "flex", gap: 16, marginTop: 24 }}>
            <Stat label="Solo" value={pct(board.solo)} />
            <Stat label="Team" value={pct(board.team)} accent />
            <Stat label="Delta" value={`${board.delta >= 0 ? "+" : ""}${Math.round(board.delta * 100)} pts`} />
          </div>
        )}
      </section>

      <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 32 }}>
        See <code>CLAUDE.md</code> for status and open decisions. CLI: <code>pnpm compare</code>,{" "}
        <code>pnpm demo</code>.
      </p>
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ flex: 1, background: "#0f1318", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
      <div style={{ color: "var(--muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent ? "var(--accent)" : "var(--text)", marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}
