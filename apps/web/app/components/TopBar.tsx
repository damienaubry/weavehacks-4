"use client";

import { ThemeToggle } from "./ThemeToggle";

/** Owner main top bar: title + range, "forecasts updated", theme toggle. */
export function TopBar({ rangeLabel }: { rangeLabel: string }) {
  return (
    <div className="owner-topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <PanelIcon />
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Service planning</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{rangeLabel}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontSize: 12.5,
            color: "var(--muted)",
            border: "1px solid var(--border)",
            borderRadius: 999,
            padding: "5px 12px",
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--accent)" }} />
          Forecasts updated 06:00
        </span>
        <ThemeToggle />
      </div>
    </div>
  );
}

function PanelIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </svg>
  );
}
