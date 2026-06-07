"use client";

import type { DiscussionTurn } from "../lib/brigade";

/** Per-station visual identity (purely cosmetic). */
const STATION: Record<string, { emoji: string; color: string }> = {
  Chef: { emoji: "👨‍🍳", color: "var(--accent)" },
  Historian: { emoji: "📚", color: "#60a5fa" },
  Scout: { emoji: "🛰️", color: "var(--warn)" },
  Prep: { emoji: "🔪", color: "#f472b6" },
};

const panel: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 16,
};

export function Turn({ turn, index }: { turn: DiscussionTurn; index: number }) {
  const s = STATION[turn.speaker] ?? { emoji: "•", color: "var(--muted)" };
  return (
    <div style={{ display: "flex", gap: 12 }}>
      {/* rail */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "var(--chip)",
            border: `1px solid ${s.color}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 17,
            flexShrink: 0,
          }}
        >
          {s.emoji}
        </div>
        <div style={{ flex: 1, width: 1, background: "var(--border)", marginTop: 4 }} />
      </div>

      {/* card */}
      <div style={{ ...panel, flex: 1, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <strong style={{ color: s.color, fontSize: 15 }}>{turn.speaker}</strong>
          <span style={{ color: "var(--muted)", fontSize: 12 }}>· {turn.note}</span>
          <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 11 }}>step {index + 1}</span>
        </div>

        {turn.toolCalls.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "10px 0 4px" }}>
            {turn.toolCalls.map((c, i) => (
              <span
                key={i}
                title={JSON.stringify(c.args)}
                style={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 11.5,
                  color: "var(--accent)",
                  background: "var(--chip)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "3px 7px",
                }}
              >
                ↳ {c.name}({compactArgs(c.args)})
              </span>
            ))}
          </div>
        )}

        <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap", color: "var(--text)" }}>
          {turn.text}
        </p>
      </div>
    </div>
  );
}

function compactArgs(args: unknown): string {
  if (!args || typeof args !== "object") return "";
  const entries = Object.entries(args as Record<string, unknown>);
  if (entries.length === 0) return "";
  return entries.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(", ");
}
