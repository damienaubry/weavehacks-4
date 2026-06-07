"use client";

/**
 * THE HEADLINE — the 3-row GRPR leaderboard: solo < team < team+memory, same model + tools on all
 * three (parity columns prove it), only the orchestration differs. A rising bar IS the thesis.
 */
import type { CSSProperties } from "react";
import { pct, type LeaderboardRow, type RecoveryVariant } from "../lib/recovery";

const panel: CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 22,
};

const META: Record<RecoveryVariant, { label: string; blurb: string; bar: string; tone: string }> = {
  solo: {
    label: "Solo",
    blurb: "One strong agent · self-revision · compute-matched",
    bar: "var(--danger)",
    tone: "var(--danger)",
  },
  team: {
    label: "Team",
    blurb: "Curator → Analyst → Writer → Verifier · the Verifier blocks until grounded",
    bar: "var(--accent)",
    tone: "var(--accent)",
  },
  "team+memory": {
    label: "Team + memory",
    blurb: "Team + failure-card memory — stops repeating a past over-promise",
    bar: "var(--brand)",
    tone: "var(--brand)",
  },
};

export function RecoveryLeaderboard({
  rows,
  dataset,
}: {
  rows: LeaderboardRow[];
  dataset: { n: number; realCount: number; syntheticCount: number };
}) {
  // Parity check: budgets within a tight band ⇒ the gap is orchestration, not compute.
  const tokens = rows.map((r) => r.budgetTokens);
  const spread = tokens.length ? (Math.max(...tokens) - Math.min(...tokens)) / Math.max(...tokens) : 0;
  const parityOk = spread <= 0.1; // ≤10% token spread → "matched compute"

  // ordered deltas (solo→team→team+memory)
  const ordered = [...rows].sort((a, b) => order(a.variant) - order(b.variant));

  return (
    <section style={panel} aria-label="GRPR leaderboard">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 17, margin: 0 }}>Grounded Recovery Pass Rate</h2>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>
            Binary, conjunctive, mechanical — over {dataset.n} cases ({dataset.realCount} real · {dataset.syntheticCount}{" "}
            synthetic). Same model + tools on all three; only the orchestration differs.
          </p>
        </div>
        <span
          title={parityOk ? "Token budgets within 10% — the gap is orchestration, not compute." : "Budgets diverge — re-check parity."}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontSize: 12,
            fontWeight: 600,
            padding: "5px 11px",
            borderRadius: 999,
            color: parityOk ? "var(--accent)" : "var(--warn)",
            border: `1px solid color-mix(in srgb, ${parityOk ? "var(--accent)" : "var(--warn)"} 40%, transparent)`,
            background: `color-mix(in srgb, ${parityOk ? "var(--accent)" : "var(--warn)"} 9%, transparent)`,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "currentColor" }} />
          {parityOk ? "Compute parity ✓" : "Parity check"}
        </span>
      </div>

      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        {ordered.map((row, i) => {
          const m = META[row.variant];
          const prev = i > 0 ? ordered[i - 1] : null;
          const deltaPts = prev ? Math.round((row.grpr - prev.grpr) * 100) : null;
          return (
            <div key={row.variant}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{m.label}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.blurb}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexShrink: 0 }}>
                  {deltaPts !== null && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: deltaPts >= 0 ? "var(--accent)" : "var(--danger)" }}>
                      {deltaPts >= 0 ? "+" : ""}
                      {deltaPts} pts
                    </span>
                  )}
                  <span style={{ fontSize: 22, fontWeight: 800, color: m.tone, fontVariantNumeric: "tabular-nums" }}>
                    {pct(row.grpr)}
                  </span>
                </div>
              </div>

              {/* the rising bar */}
              <div
                style={{
                  marginTop: 7,
                  height: 12,
                  borderRadius: 999,
                  background: "color-mix(in srgb, var(--muted) 16%, transparent)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.round(row.grpr * 100)}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: `linear-gradient(90deg, color-mix(in srgb, ${m.bar} 65%, transparent), ${m.bar})`,
                    transition: "width 0.7s cubic-bezier(.2,.8,.2,1)",
                  }}
                />
              </div>

              {/* parity columns */}
              <div style={{ marginTop: 6, display: "flex", gap: 14, fontSize: 11.5, color: "var(--muted)" }}>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{row.budgetTokens.toLocaleString("en-US")} tok</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{row.budgetCalls} calls</span>
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ color: "var(--muted)", fontSize: 12, margin: "18px 0 0", lineHeight: 1.5 }}>
        Toggle the Verifier off and the rate collapses — the gap is{" "}
        <strong style={{ color: "var(--text)" }}>unfakeable</strong>. Every claim is traced to the query that proves it
        in Weave.
      </p>
    </section>
  );
}

function order(v: RecoveryVariant): number {
  return v === "solo" ? 0 : v === "team" ? 1 : 2;
}
