"use client";

import type { ServiceSlot, WeekPlan } from "../lib/week";
import { LogoMark } from "./Logo";
import { weekdayShort } from "./ui";

type Selected = { date: string; slot: ServiceSlot } | null;

/** Owner left nav: brand · Week ahead / Approvals · jump-to-service · credibility footer. */
export function Sidebar({
  week,
  selected,
  approvals,
  onSelect,
}: {
  week: WeekPlan;
  selected: Selected;
  approvals: number;
  onSelect: (date: string, slot: ServiceSlot) => void;
}) {
  const openDays = week.days.filter((d) => d.open);

  return (
    <aside className="sidebar">
      {/* brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "2px 6px 4px" }}>
        <LogoMark size={34} />
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 0.3 }}>Brigade</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Le Kyoto · Paris</div>
        </div>
      </div>

      {/* primary nav */}
      <div>
        <p className="sidebar-eyebrow">Plan</p>
        <div className="nav-item active">
          <CalIcon /> Week ahead
        </div>
        <div className="nav-item">
          <ShieldIcon /> Approvals <span className="nav-count">{approvals}</span>
        </div>
      </div>

      {/* jump to service */}
      <div>
        <p className="sidebar-eyebrow">Jump to service</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {openDays.map((d) => (
            <div key={d.date}>
              <div style={{ fontSize: 12, color: "var(--muted)", margin: "2px 0 5px 4px" }}>{weekdayShort(d.date)}</div>
              <div style={{ display: "flex", gap: 6 }}>
                {(["lunch", "dinner"] as ServiceSlot[]).map((slot) => {
                  const active = selected?.date === d.date && selected?.slot === slot;
                  return (
                    <button key={slot} className={`jump-pill${active ? " active" : ""}`} onClick={() => onSelect(d.date, slot)}>
                      {slot === "lunch" ? "Lunch" : "Dinner"}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* credibility footer */}
      <div style={{ marginTop: "auto", display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 6px 2px", fontSize: 12, color: "var(--muted)" }}>
        <DbIcon />
        <span>Grounded in 3 years of this kitchen&apos;s own service history.</span>
      </div>
    </aside>
  );
}

const ico = { width: 16, height: 16, stroke: "currentColor", strokeWidth: 2, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;
function CalIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ico}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
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
