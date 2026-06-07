"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import type { ServiceForecast } from "../lib/week";
import { SERVICE_START } from "../lib/week";
import { FactorCard } from "./FactorCard";
import { PrepTimeline } from "./PrepTimeline";
import type { Decision } from "./PrepRow";
import {
  panel,
  sectionTitle,
  btn,
  formatLongDay,
  intensityStatus,
  euro,
  vsTypicalFor,
  deliveryFor,
  deltaPill,
  categoryName,
  stationGlyph,
} from "./ui";

type Tab = "forecast" | "why" | "prep";
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Full service detail — opens IN PLACE of the week board (not an inline scroll). */
export function ServiceDetail({
  service,
  isPeak,
  decisionForItem,
  onDecide,
  onBack,
  onNav,
  hasPrev,
  hasNext,
}: {
  service: ServiceForecast;
  isPeak: boolean;
  decisionForItem: (itemId: string) => Decision | undefined;
  onDecide: (itemId: string, decision: Decision) => void;
  onBack: () => void;
  onNav: (dir: -1 | 1) => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  const [tab, setTab] = useState<Tab>("forecast");
  const { plan, slot, covers, revenue, intensity } = service;

  const status = isPeak ? { label: "Peak", color: "var(--accent)" } : intensityStatus(intensity);
  const vs = vsTypicalFor(intensity, slot);
  const delta = deltaPill(vs);
  const low = Math.round(covers * 0.9);
  const high = Math.round(covers * 1.1);
  const weather = plan.factors.find((f) => f.icon === "☔" || f.icon === "☀️") ?? plan.factors[0];
  const avgBasket = Math.round(revenue / Math.max(1, covers));
  const delivery = deliveryFor(covers);
  const discounts = 3 + (covers % 5);

  // breakdowns derived from the prep items (real baseline→adjusted)
  const products = [...plan.items]
    .sort((a, b) => b.adjusted - a.adjusted)
    .map((it) => ({
      label: it.label,
      station: it.station,
      expect: it.adjusted,
      low: Math.round(it.adjusted * 0.85),
      high: Math.round(it.adjusted * 1.15),
      vs: it.baseline ? Math.round(((it.adjusted - it.baseline) / it.baseline) * 100) : 0,
    }));
  const catMap = new Map<string, { qty: number; base: number }>();
  for (const it of plan.items) {
    const c = categoryName(it.station);
    const e = catMap.get(c) ?? { qty: 0, base: 0 };
    e.qty += it.adjusted;
    e.base += it.baseline;
    catMap.set(c, e);
  }
  const categories = [...catMap.entries()]
    .map(([name, { qty, base }]) => ({ name, qty, vs: base ? Math.round(((qty - base) / base) * 100) : 0 }))
    .sort((a, b) => b.qty - a.qty);
  const maxCat = Math.max(...categories.map((c) => c.qty), 1);

  return (
    <div>
      <button onClick={onBack} style={{ ...btn("transparent", "var(--muted)"), padding: "4px 0", marginBottom: 14 }}>
        ← Week ahead
      </button>

      {/* detail card */}
      <section style={{ ...panel, padding: 22 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontSize: 13.5, color: "var(--muted)" }}>
            {formatLongDay(plan.date)} · 🕐 {cap(slot)} {SERVICE_START[slot]}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => onNav(-1)} disabled={!hasPrev} style={navBtn(!hasPrev)} title="previous service">‹</button>
            <button onClick={() => onNav(1)} disabled={!hasNext} style={navBtn(!hasNext)} title="next service">›</button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 60, fontWeight: 800, lineHeight: 0.9 }}>{covers}</span>
          <div style={{ paddingBottom: 6 }}>
            <div style={{ fontSize: 16 }}>covers expected</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 3 }}>
              range {low}–{high}
              {weather ? ` · ${weather.label}` : ""}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <span style={pillSolid(status.color)}>● {status.label}</span>
          <span style={pillSoft(delta.color)}>
            {delta.arrow} {Math.abs(vs)}%
          </span>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>vs a typical {slot}</span>
        </div>

        {/* stat tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginTop: 18 }}>
          <Stat label="Revenue" value={euro(revenue)} />
          <Stat label="Avg basket" value={euro(avgBasket)} />
          <Stat label="Delivery / takeaway" value={`${delivery} / ${100 - delivery}%`} />
          <Stat label="Discounts" value={`${discounts}%`} />
        </div>
      </section>

      {/* tabs */}
      <div style={{ display: "inline-flex", gap: 2, padding: 3, borderRadius: 999, border: "1px solid var(--border)", margin: "18px 0 14px", background: "color-mix(in srgb, var(--panel) 55%, transparent)" }}>
        {(["forecast", "why", "prep"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={tabBtn(tab === t)}>
            {t === "forecast" ? "Forecast" : t === "why" ? "Why" : "Prep plan"}
          </button>
        ))}
      </div>

      {tab === "forecast" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
          {/* by category */}
          <div>
            <h3 style={sectionTitle}>By category</h3>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 14 }}>
              {categories.map((c) => {
                const d = deltaPill(c.vs);
                return (
                  <div key={c.name}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</span>
                      <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 700 }}>{c.qty}</span>
                        <span style={pillSoft(d.color)}>{d.arrow} {Math.abs(c.vs)}%</span>
                      </span>
                    </div>
                    <div className="svc-bar" style={{ marginTop: 7 }}>
                      <span style={{ width: `${Math.round((c.qty / maxCat) * 100)}%`, background: "var(--accent)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* by product */}
          <div>
            <h3 style={sectionTitle}>By product</h3>
            <div style={{ ...panel, marginTop: 12, padding: 0, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 12, padding: "10px 14px", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                <span>Dish</span>
                <span style={{ textAlign: "right" }}>Expect</span>
                <span style={{ textAlign: "right" }}>Range</span>
                <span style={{ textAlign: "right" }}>vs typ.</span>
              </div>
              {products.map((p, i) => {
                const d = deltaPill(p.vs);
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 12, alignItems: "center", padding: "11px 14px", borderTop: "1px solid var(--border)" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{p.label}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                        {stationGlyph(p.station)} {categoryName(p.station)} · {deliveryFor(p.expect)}% delivery
                      </div>
                    </div>
                    <span style={{ textAlign: "right", fontWeight: 700 }}>~{p.expect}</span>
                    <span style={{ textAlign: "right", color: "var(--muted)", fontSize: 13 }}>{p.low}–{p.high}</span>
                    <span style={{ textAlign: "right", ...pillSoft(d.color), justifySelf: "end" }}>{d.arrow} {Math.abs(p.vs)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === "why" && (
        <div>
          <h3 style={sectionTitle}>What&apos;s different · {plan.headline}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10, marginTop: 12 }}>
            {plan.factors.map((f, i) => (
              <FactorCard key={i} factor={f} />
            ))}
          </div>
        </div>
      )}

      {tab === "prep" && (
        <div>
          <h3 style={sectionTitle}>Prep plan — when to make what</h3>
          <PrepTimeline items={plan.items} slot={slot} decisionForItem={decisionForItem} onDecide={onDecide} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", background: "color-mix(in srgb, var(--panel) 50%, transparent)" }}>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, marginTop: 5 }}>{value}</div>
    </div>
  );
}

function pillSolid(color: string): CSSProperties {
  return { fontSize: 12.5, fontWeight: 700, color, border: `1px solid ${color}`, borderRadius: 999, padding: "3px 11px" };
}
function pillSoft(color: string): CSSProperties {
  return { fontSize: 12, fontWeight: 700, color, background: `color-mix(in srgb, ${color} 14%, transparent)`, borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" };
}
function tabBtn(active: boolean): CSSProperties {
  return {
    fontSize: 13.5,
    fontWeight: 600,
    padding: "7px 16px",
    borderRadius: 999,
    border: 0,
    cursor: "pointer",
    color: active ? "var(--text)" : "var(--muted)",
    background: active ? "var(--panel)" : "transparent",
  };
}
function navBtn(disabled: boolean): CSSProperties {
  return {
    background: "transparent",
    color: disabled ? "var(--border)" : "var(--muted)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "4px 11px",
    fontSize: 15,
    cursor: disabled ? "default" : "pointer",
  };
}
