"use client";

import type { ReactNode } from "react";
import { euro } from "./ui";

export interface WeekSummaryView {
  totalCovers: number;
  serviceCount: number;
  revenue: number;
  busiestLabel: string;
  busiestCovers: number;
  approvals: number;
}

/** The 4 headline tiles: covers · revenue · busiest · sign-off. */
export function SummaryTiles({ s }: { s: WeekSummaryView }) {
  return (
    <div className="summary-grid">
      <Tile icon={<UsersIcon />} label="Covers forecast" value={s.totalCovers.toLocaleString("en-US")} sub={`across ${s.serviceCount} services`} />
      <Tile icon={<WalletIcon />} label="Projected revenue" value={euro(s.revenue)} sub="this week" />
      <Tile icon={<TrendIcon />} label="Busiest service" value={s.busiestLabel} sub={`${s.busiestCovers} covers`} valueSize={22} />
      <Tile icon={<FlagIcon />} label="Need sign-off" value={String(s.approvals)} sub="risky calls flagged" tone={s.approvals > 0 ? "warn" : "default"} />
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  sub,
  tone = "default",
  valueSize = 28,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
  tone?: "default" | "warn";
  valueSize?: number;
}) {
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 13 }}>
        {icon}
        {label}
      </div>
      <div style={{ fontSize: valueSize, fontWeight: 800, marginTop: 10, color: tone === "warn" ? "var(--warn)" : "var(--text)", lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 5 }}>{sub}</div>
    </div>
  );
}

const ico = { width: 15, height: 15, stroke: "currentColor", strokeWidth: 2, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;
function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ico}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  );
}
function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ico}>
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5" />
      <path d="M16 13h.01" />
    </svg>
  );
}
function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ico}>
      <path d="M3 17l6-6 4 4 7-7" />
      <path d="M17 8h4v4" />
    </svg>
  );
}
function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ico}>
      <path d="M4 22V4a1 1 0 0 1 1-1h11l-1.5 4L16 11H5" />
    </svg>
  );
}
