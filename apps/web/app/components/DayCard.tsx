"use client";

import type { CSSProperties } from "react";
import type { ServiceForecast } from "../lib/week";
import { SERVICE_START } from "../lib/week";
import { intensityStatus, euro, vsTypicalFor, deliveryFor, deltaPill } from "./ui";

const BAR_W = ["28%", "52%", "76%", "100%"];

/** A rich service card: covers · expected range · status · revenue · context · delivery · sign-off. */
export function DayCard({
  service,
  isPeak,
  selected,
  pending,
  onSelect,
}: {
  service: ServiceForecast;
  isPeak: boolean;
  selected: boolean;
  pending: number;
  onSelect: () => void;
}) {
  const { slot, covers, intensity, revenue, plan } = service;
  const status = isPeak ? { label: "Peak", color: "var(--accent)" } : intensityStatus(intensity);
  const vs = vsTypicalFor(intensity, slot);
  const delta = deltaPill(vs);
  const delivery = deliveryFor(covers);
  const low = Math.round(covers * 0.9);
  const high = Math.round(covers * 1.1);
  const chips = plan.factors.filter((f) => f.icon).slice(0, 2);

  const selStyle: CSSProperties = selected ? { borderColor: "var(--accent)", boxShadow: "0 0 0 1px var(--accent)" } : {};
  const confidence = pending > 0 ? { label: "Medium", color: "var(--warn)" } : { label: "High", color: "var(--accent)" };

  return (
    <button className="svc-card" style={selStyle} onClick={onSelect}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{slot === "lunch" ? "Lunch" : "Dinner"}</span>{" "}
          <span style={{ fontSize: 12, color: "var(--muted)" }}>{SERVICE_START[slot]}</span>
        </div>
        <ArrowIcon dimmed={!selected} />
      </div>

      {/* covers + range */}
      <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 7 }}>
        <span style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{covers}</span>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>covers</span>
      </div>
      <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
          {low}–{high} expected
        </span>
        <span style={pill(delta.color)}>
          {delta.arrow} {Math.abs(vs)}%
        </span>
      </div>

      {/* status + revenue */}
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: status.color }}>{status.label}</span>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>{euro(revenue)}</span>
      </div>
      <div className="svc-bar">
        <span style={{ width: BAR_W[intensity], background: status.color }} />
      </div>

      {/* context chips */}
      {chips.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {chips.map((c, i) => (
            <span key={i} className="ctx-chip">
              {c.icon} {c.label}
            </span>
          ))}
        </div>
      )}

      {/* footer */}
      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 12.5,
        }}
      >
        <span style={pill(confidence.color)}>● {confidence.label}</span>
        <span style={{ color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 5 }}>
          <TruckIcon /> {delivery}%
        </span>
        {pending > 0 && (
          <span style={{ marginLeft: "auto", color: "var(--warn)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}>
            ⚑ {pending} to approve
          </span>
        )}
      </div>
    </button>
  );
}

function pill(color: string): CSSProperties {
  return {
    fontSize: 12,
    fontWeight: 700,
    color,
    border: `1px solid ${color}`,
    borderRadius: 999,
    padding: "1px 8px",
    whiteSpace: "nowrap",
  };
}

function ArrowIcon({ dimmed }: { dimmed: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={dimmed ? "var(--muted)" : "var(--accent)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}
function TruckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 3h13v11H1zM14 7h4l3 3v4h-7" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );
}
