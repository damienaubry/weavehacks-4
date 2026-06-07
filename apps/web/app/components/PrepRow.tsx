"use client";

import type { PrepItem } from "../lib/plan";
import { btn, stationGlyph } from "./ui";

export type Decision = "approved" | "rejected";

/**
 * One prep-sheet line: how much to prep, vs a normal service (±%), and why. For a flagged item
 * (big swing) it shows inline Approve / Keep-N. CONTROLLED: the decision lives in the parent
 * (keyed `${date}|${slot}|${itemId}`) so the week banner, summary tile, and cell dot all update
 * live the instant the owner decides. `decision` undefined = still pending.
 */
export function PrepRow({
  item,
  first,
  decision,
  onDecide,
}: {
  item: PrepItem;
  first?: boolean;
  decision?: Decision;
  onDecide?: (itemId: string, decision: Decision) => void;
}) {
  const delta = item.adjusted - item.baseline;
  const pctMove = Math.round((delta / item.baseline) * 100);
  const qty = item.flagged && decision === "rejected" ? item.baseline : item.adjusted;

  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        alignItems: "center",
        padding: "14px 16px",
        borderTop: first ? "none" : "1px solid var(--border)",
        background: item.flagged ? "rgba(251,191,36,0.06)" : "transparent",
      }}
    >
      <div style={{ minWidth: 42, textAlign: "center" }}>
        <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{qty}</div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          {item.flagged && <span title="Needs your OK">⚠️</span>}
          {item.station && (
            <span title={item.station} style={{ fontSize: 13 }}>
              {stationGlyph(item.station)}
            </span>
          )}
          <strong style={{ fontSize: 15 }}>{item.label}</strong>
          <span style={{ color: "var(--muted)", fontSize: 12 }}>
            was {item.baseline}{" "}
            <span style={{ color: pctMove < 0 ? "#f87171" : "var(--accent)" }}>
              ({pctMove > 0 ? "+" : ""}
              {pctMove}%)
            </span>
          </span>
        </div>
        <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 3 }}>{item.reason}</div>
      </div>

      {item.flagged &&
        (decision === undefined ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => onDecide?.(item.id, "approved")} style={btn("var(--accent)", "#06210f")}>
              Approve
            </button>
            <button onClick={() => onDecide?.(item.id, "rejected")} style={btn("transparent", "#f87171", "#f87171")}>
              Keep {item.baseline}
            </button>
          </div>
        ) : (
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: decision === "approved" ? "var(--accent)" : "#f87171",
              whiteSpace: "nowrap",
            }}
          >
            {decision === "approved" ? `✅ Cut to ${item.adjusted}` : `↩︎ Keeping ${item.baseline}`}
          </span>
        ))}
    </div>
  );
}
