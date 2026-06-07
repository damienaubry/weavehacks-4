"use client";

import { LogoMark } from "./Logo";

export type RecoverySection = "leaderboard" | "theater" | "drilldown" | "approvals";

const NAV: { id: RecoverySection; label: string; icon: React.ReactNode }[] = [
  { id: "leaderboard", label: "GRPR leaderboard", icon: <BarsIcon /> },
  { id: "theater", label: "The brigade", icon: <FlowIcon /> },
  { id: "drilldown", label: "Case drill-down", icon: <DocIcon /> },
  { id: "approvals", label: "Approvals", icon: <ShieldIcon /> },
];

/** Recovery left nav: brand · jump to each section · approvals count · credibility footer. */
export function RecoverySidebar({
  active,
  approvals,
  onNavigate,
}: {
  active: RecoverySection;
  approvals: number;
  onNavigate: (id: RecoverySection) => void;
}) {
  return (
    <aside className="sidebar">
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "2px 6px 4px" }}>
        <LogoMark size={34} />
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 0.3 }}>Brigade</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Recovery Copilot · Le Kyoto</div>
        </div>
      </div>

      <div>
        <p className="sidebar-eyebrow">Recovery</p>
        {NAV.map((n) => (
          <div
            key={n.id}
            className={`nav-item${active === n.id ? " active" : ""}`}
            onClick={() => onNavigate(n.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onNavigate(n.id)}
          >
            {n.icon} {n.label}
            {n.id === "approvals" && approvals > 0 && <span className="nav-count">{approvals}</span>}
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "auto",
          display: "flex",
          gap: 8,
          alignItems: "flex-start",
          padding: "10px 6px 2px",
          fontSize: 12,
          color: "var(--muted)",
        }}
      >
        <DbIcon />
        <span>Every claim traced to the query that proves it — in W&amp;B Weave.</span>
      </div>
    </aside>
  );
}

const ico = { width: 16, height: 16, stroke: "currentColor", strokeWidth: 2, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;
function BarsIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ico}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}
function FlowIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ico}>
      <circle cx="5" cy="6" r="2" />
      <circle cx="19" cy="6" r="2" />
      <circle cx="12" cy="18" r="2" />
      <path d="M7 6h10M5 8v4a2 2 0 0 0 2 2h3M19 8v4a2 2 0 0 1-2 2h-3" />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ico}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M9 13h6M9 17h6" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ico}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  );
}
function DbIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ico} style={{ flexShrink: 0, color: "var(--accent)" }}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3" />
    </svg>
  );
}
