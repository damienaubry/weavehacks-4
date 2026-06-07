"use client";

import { useState } from "react";
import type { SwingItem } from "../lib/mock-discussion";

const panel: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 16,
};

type Decision = "pending" | "approved" | "rejected";

/**
 * Human-in-the-loop gate. The Chef flags big prep swings (waste / stockout risk) and the owner
 * approves or rejects each before it's committed — nothing irreversible auto-applies.
 * (Local-only for now; wiring the decision back to the backend is a later step.)
 */
export function HumanGate({ swings }: { swings: SwingItem[] }) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>(
    Object.fromEntries(swings.map((s) => [s.item, "pending" as Decision])),
  );

  if (swings.length === 0) return null;

  return (
    <section style={{ ...panel, marginTop: 16, borderColor: "var(--warn)" }}>
      <h2 style={{ fontSize: 16, margin: "0 0 4px" }}>⚠ Needs owner approval</h2>
      <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 12px" }}>
        Big swings don't auto-apply — the operator signs off first.
      </p>

      {swings.map((s) => {
        const d = decisions[s.item];
        const delta = s.adjusted - s.baseline;
        const pctMove = Math.round((delta / s.baseline) * 100);
        return (
          <div
            key={s.item}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              padding: "12px 0",
              borderTop: "1px solid var(--border)",
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14 }}>
                <strong style={{ fontFamily: "ui-monospace, monospace" }}>{s.item}</strong>{" "}
                <span style={{ color: "var(--muted)" }}>
                  {s.baseline} → {s.adjusted}{" "}
                </span>
                <span style={{ color: pctMove < 0 ? "#f87171" : "var(--accent)", fontWeight: 600 }}>
                  ({pctMove > 0 ? "+" : ""}
                  {pctMove}%)
                </span>
              </div>
              <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 3 }}>{s.reason}</div>
            </div>

            {d === "pending" ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setDecisions((p) => ({ ...p, [s.item]: "approved" }))}
                  style={btn("var(--accent)", "#06210f")}
                >
                  Approve
                </button>
                <button
                  onClick={() => setDecisions((p) => ({ ...p, [s.item]: "rejected" }))}
                  style={btn("transparent", "#f87171", "#f87171")}
                >
                  Reject
                </button>
              </div>
            ) : (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: d === "approved" ? "var(--accent)" : "#f87171",
                  whiteSpace: "nowrap",
                }}
              >
                {d === "approved" ? "✅ Approved" : "❌ Rejected — keep baseline"}
              </span>
            )}
          </div>
        );
      })}
    </section>
  );
}

function btn(bg: string, fg: string, border?: string): React.CSSProperties {
  return {
    background: bg,
    color: fg,
    border: border ? `1px solid ${border}` : 0,
    borderRadius: 8,
    padding: "7px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}
