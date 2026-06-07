"use client";

/**
 * Case drill-down — the legible jump. ONE review → the SOLO reply (fail reasons highlighted +
 * classified) vs the TEAM reply (pass), the grounded evidence ledger, and the memory-reuse chip
 * when the win came from a past failure-card. This is where "solo ships it, the team blocks it"
 * becomes visible.
 */
import type { CSSProperties, ReactNode } from "react";
import {
  classifyFailReason,
  FAIL_META,
  ledgerFor,
  INCIDENT_LABEL,
  caseSource,
  type RecoverySampleCase,
} from "../lib/recovery";

const panel: CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 18,
};

export function RecoveryCaseDrilldown({ c }: { c: RecoverySampleCase }) {
  const ledger = ledgerFor(c);
  const isReal = caseSource(c.id) === "real";
  return (
    <section style={{ ...panel, padding: 22 }} aria-label="case drill-down">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 17, margin: 0 }}>One case, two ways</h2>
        <span style={{ fontSize: 11.5, color: "var(--muted)", fontFamily: "ui-monospace, monospace" }}>{c.id}</span>
      </div>

      {/* the review */}
      <div
        style={{
          marginTop: 14,
          padding: "14px 16px",
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--chip)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ color: "var(--warn)", letterSpacing: 1 }}>★★☆☆☆</span>
          <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.6 }}>
            {isReal ? "real Google review" : "synthetic variant"}
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 11.5,
              fontWeight: 600,
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: 999,
              padding: "2px 10px",
            }}
            title="Gold triage label the GRPR scorer checks against"
          >
            gold: {INCIDENT_LABEL[c.incidentTypeGold] ?? c.incidentTypeGold}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, fontStyle: "italic" }}>“{c.review}”</p>
      </div>

      {/* the two replies, side by side */}
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        {/* SOLO — fails */}
        <div
          style={{
            ...panel,
            border: "1px solid color-mix(in srgb, var(--danger) 45%, var(--border))",
            background: "color-mix(in srgb, var(--danger) 5%, var(--panel))",
          }}
        >
          <Header tone="bad" title="Solo agent" verdict="ships it" />
          <p style={{ fontSize: 14, lineHeight: 1.55, margin: "10px 0 12px" }}>
            <GestureHighlight text={c.solo.reply} tone="bad" />
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {c.solo.failReasons.map((r, i) => {
              const meta = FAIL_META[classifyFailReason(r)];
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    fontSize: 12.5,
                    padding: "6px 9px",
                    borderRadius: 8,
                    border: `1px solid color-mix(in srgb, ${meta.color} 35%, transparent)`,
                    background: `color-mix(in srgb, ${meta.color} 8%, transparent)`,
                  }}
                >
                  <span aria-hidden>{meta.glyph}</span>
                  <span>
                    <strong style={{ color: meta.color }}>{meta.label}.</strong>{" "}
                    <span style={{ color: "var(--muted)" }}>{r}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* TEAM — passes */}
        <div
          style={{
            ...panel,
            border: "1px solid color-mix(in srgb, var(--accent) 50%, var(--border))",
            background: "color-mix(in srgb, var(--accent) 6%, var(--panel))",
          }}
        >
          <Header tone="good" title="Agent team" verdict="grounded · passes" />
          <p style={{ fontSize: 14, lineHeight: 1.55, margin: "10px 0 12px", whiteSpace: "pre-line" }}>
            <GestureHighlight text={c.team.reply} tone="good" />
          </p>

          {/* grounded ledger */}
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>
            Evidence ledger
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {ledger.map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5 }}>
                <span style={{ color: "var(--accent)" }}>✓</span>
                <span style={{ flex: 1 }}>
                  {l.fact} — <span style={{ color: "var(--muted)" }}>{l.statedValue}</span>
                </span>
                {l.citedTool && (
                  <code style={{ fontSize: 10.5, padding: "1px 6px" }}>{l.citedTool}</code>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* memory-reuse chip */}
      {c.memoryReuse && (
        <div
          style={{
            marginTop: 14,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "11px 14px",
            borderRadius: 12,
            border: "1px solid color-mix(in srgb, var(--brand) 45%, transparent)",
            background: "color-mix(in srgb, var(--brand) 8%, transparent)",
          }}
        >
          <span style={{ fontSize: 16 }}>🧠</span>
          <div style={{ fontSize: 13 }}>
            <strong>team+memory</strong> reused failure-card{" "}
            <code style={{ fontSize: 11.5 }}>{c.memoryReuse.failureCardId}</code>{" "}
            <span style={{ color: "var(--muted)" }}>
              (tag <code style={{ fontSize: 11.5 }}>{c.memoryReuse.tag}</code>) — it had over-promised this before, and
              didn&apos;t again.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Render a reply, visually highlighting its goodwill gesture (e.g. the offending "20% discount" in
 * red for the solo, the policy-safe "15% credit" in green for the team). This is the contrast that
 * makes the over-promise vs the bounded gesture legible at a glance.
 */
function GestureHighlight({ text, tone }: { text: string; tone: "good" | "bad" }): ReactNode {
  const re = /\d{1,3}\s*%(?:\s*(?:discount|credit|crédit|off|réduction|reduction|remise|avoir))?/i;
  const m = text.match(re);
  if (!m || m.index == null) return <>{text}</>;
  const color = tone === "bad" ? "var(--danger)" : "var(--accent)";
  return (
    <>
      {text.slice(0, m.index)}
      <mark
        title={tone === "bad" ? "Over-promise — exceeds the policy credit limit" : "Policy-safe gesture"}
        style={{
          background: `color-mix(in srgb, ${color} 18%, transparent)`,
          color,
          fontWeight: 700,
          padding: "0 4px",
          borderRadius: 5,
        }}
      >
        {m[0]}
      </mark>
      {text.slice(m.index + m[0].length)}
    </>
  );
}

function Header({ tone, title, verdict }: { tone: "good" | "bad"; title: string; verdict: string }) {
  const color = tone === "good" ? "var(--accent)" : "var(--danger)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 15 }}>{tone === "good" ? "✅" : "❌"}</span>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{title}</span>
      <span
        style={{
          marginLeft: "auto",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          color,
        }}
      >
        {verdict}
      </span>
    </div>
  );
}
