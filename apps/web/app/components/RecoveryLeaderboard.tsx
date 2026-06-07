"use client";

/**
 * THE HEADLINE — the 3-row GRPR leaderboard: solo < team < team+memory, same model + tools on all
 * three (parity columns prove it), only the orchestration differs. A rising bar IS the thesis.
 */
import type { CSSProperties } from "react";
import { pct, memorySummary, type LeaderboardRow, type RecoveryVariant } from "../lib/recovery";

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
  // Parity in this design = the solo gets a budget ≥ the team's (self-retries). The honest, strong
  // story isn't "the budgets match" — it's "the solo had AT LEAST the team's compute and STILL
  // scored lower", so the gap is attributable to orchestration, not to compute.
  const find = (v: RecoveryVariant) => rows.find((r) => r.variant === v);
  const solo = find("solo");
  const team = find("team");
  const soloNotStarved =
    !!solo && !!team && solo.budgetTokens >= team.budgetTokens && solo.budgetCalls >= team.budgetCalls;
  const soloLoses = !!solo && !!team && solo.grpr < team.grpr;
  const ratio = solo && team && team.budgetTokens ? solo.budgetTokens / team.budgetTokens : 0;
  const parityOk = soloNotStarved;
  const mem = memorySummary(rows);

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
          title={
            parityOk
              ? "Solo was given ≥ the team's compute budget (self-retries) and still scored lower — the gap is orchestration, not compute."
              : "Solo's budget fell below the team's — raise solo self-retries before reading the gap."
          }
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

      {/* parity callout — the strong, honest story: solo had MORE compute and still lost */}
      {solo && team && soloNotStarved && soloLoses && (
        <div
          style={{
            marginTop: 16,
            padding: "11px 14px",
            borderRadius: 12,
            fontSize: 12.5,
            lineHeight: 1.5,
            color: "var(--text)",
            border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)",
            background: "color-mix(in srgb, var(--accent) 7%, transparent)",
          }}
        >
          <strong>Parity, the honest way.</strong> The solo spent{" "}
          <strong style={{ fontVariantNumeric: "tabular-nums" }}>{ratio.toFixed(1)}×</strong> the team&apos;s tokens (
          {solo.budgetTokens.toLocaleString("en-US")} vs {team.budgetTokens.toLocaleString("en-US")}) over{" "}
          {solo.budgetCalls} vs {team.budgetCalls} calls — and{" "}
          <strong>still scored {pct(solo.grpr)} vs the team&apos;s {pct(team.grpr)}</strong>. More compute didn&apos;t
          close the gap; the Verifier did.
        </div>
      )}

      {/* honest memory note — never hide team+memory underperforming on a small slice */}
      {mem.teamToMemory !== null &&
        (mem.teamToMemory > 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 12, margin: "12px 0 0", lineHeight: 1.5 }}>
            <strong style={{ color: "var(--brand)" }}>+{mem.teamToMemory} pts from memory</strong> — across-run
            failure-card memory stops the team repeating a past over-promise.
          </p>
        ) : (
          <p style={{ color: "var(--muted)", fontSize: 12, margin: "12px 0 0", lineHeight: 1.5 }}>
            <strong style={{ color: "var(--text)" }}>Honest note:</strong> on this small held-out slice, team+memory
            didn&apos;t beat team ({mem.teamToMemory} pts) — across-run memory is{" "}
            <strong>neutral here</strong>. The self-improvement you can watch live is the Verifier driving the
            Writer&apos;s <strong>v1→v2 rewrite</strong> within a session.
          </p>
        ))}

      <p style={{ color: "var(--muted)", fontSize: 12, margin: "12px 0 0", lineHeight: 1.5 }}>
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
