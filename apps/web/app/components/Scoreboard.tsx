"use client";

import type { RunDetail, Scoreboard } from "../lib/brigade";

const pct = (n: number) => `${Math.round(n * 100)}%`;

const panel: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 20,
};

/** The solo-vs-team number from `/compare`. The proof, kept secondary to the live discussion. */
export function ScoreboardView({ board }: { board: Scoreboard }) {
  return (
    <>
      <section
        style={{
          ...panel,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          padding: "24px",
          flexWrap: "wrap",
        }}
      >
        <Score label="Single agent" value={pct(board.solo)} tone="bad" />
        <div style={{ fontSize: 22, color: "var(--muted)" }}>→</div>
        <Score label="Agent team" value={pct(board.team)} tone="good" />
        <div style={{ width: 1, height: 56, background: "var(--border)" }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "var(--muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>Delta</div>
          <div style={{ fontSize: 38, fontWeight: 800, color: "var(--accent)" }}>
            {board.delta >= 0 ? "+" : ""}
            {Math.round(board.delta * 100)}
          </div>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>points</div>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <Column title="Solo agent" subtitle="no roles · last-write-wins" detail={board.soloDetail} />
        <Column title="Agent team" subtitle="roles + verifier + conflict resolution" detail={board.teamDetail} />
      </div>
    </>
  );
}

function Score({ label, value, tone }: { label: string; value: string; tone: "good" | "bad" }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ color: "var(--muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 38, fontWeight: 800, color: tone === "good" ? "var(--accent)" : "#f87171" }}>{value}</div>
    </div>
  );
}

function Column({ title, subtitle, detail }: { title: string; subtitle: string; detail?: RunDetail }) {
  return (
    <section style={panel}>
      <h2 style={{ fontSize: 16, margin: 0 }}>{title}</h2>
      <p style={{ color: "var(--muted)", fontSize: 12, margin: "2px 0 14px" }}>{subtitle}</p>
      {detail ? (
        <>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
            {detail.correct}/{detail.total} records correct
          </div>
          {Object.entries(detail.breakdown).map(([k, v]) => {
            const wrong = v.startsWith("WRONG");
            const escalated = v.includes("escalated");
            return (
              <div key={k} style={{ display: "flex", gap: 8, padding: "4px 0", fontSize: 13 }}>
                <span>{wrong ? "❌" : escalated ? "⚠️" : "✅"}</span>
                <span style={{ minWidth: 78, fontFamily: "ui-monospace, monospace" }}>{k}</span>
                <span style={{ color: wrong ? "#f87171" : "var(--muted)" }}>{v}</span>
              </div>
            );
          })}
        </>
      ) : (
        <p style={{ color: "var(--muted)", fontSize: 13 }}>no data</p>
      )}
    </section>
  );
}
