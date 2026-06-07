"use client";

/**
 * / — the OWNER product: a sidebar + a "week ahead" planning board. The owner scans busy vs
 * quiet services (rich cards), OPENS any one into its full detail view (forecast / why / prep
 * plan), and signs off the few risky calls. No agents/traces here — that's /brigade + Weave.
 *
 * Per-item Approve/Keep decisions are LIFTED here (keyed `${date}|${slot}|${itemId}`) so the
 * sidebar count, the summary tile, the banner, and the card flags all update live on a decision.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchWeek, itemKey, type ServiceForecast, type ServiceSlot, type WeekPlan } from "./lib/week";
import type { Decision } from "./components/PrepRow";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { SummaryTiles } from "./components/SummaryTiles";
import { ApprovalBanner } from "./components/ApprovalBanner";
import { DayCard } from "./components/DayCard";
import { ServiceDetail } from "./components/ServiceDetail";
import { weekdayShort } from "./components/ui";

type Selected = { date: string; slot: ServiceSlot } | null;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function OwnerHome() {
  const [week, setWeek] = useState<WeekPlan | null>(null);
  const [mocked, setMocked] = useState(false);
  const [selected, setSelected] = useState<Selected>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  const run = useCallback(async () => {
    const r = await fetchWeek();
    setWeek(r.week);
    setMocked(r.mocked);
  }, []);
  useEffect(() => {
    run();
  }, [run]);

  const openDays = useMemo(() => (week ? week.days.filter((d) => d.open) : []), [week]);
  const flat = useMemo(
    () => openDays.flatMap((d) => d.services.map((s) => ({ date: d.date, slot: s.slot, service: s }))),
    [openDays],
  );
  const serviceAt = useCallback(
    (sel: Selected): ServiceForecast | null =>
      sel ? flat.find((f) => f.date === sel.date && f.slot === sel.slot)?.service ?? null : null,
    [flat],
  );

  const pendingFor = useCallback(
    (svc: ServiceForecast, date: string, slot: ServiceSlot) =>
      svc.plan.items.filter((i) => i.flagged && !decisions[itemKey(date, slot, i.id)]).length,
    [decisions],
  );

  const totals = useMemo(() => {
    let covers = 0,
      revenue = 0,
      flagged = 0,
      pending = 0;
    for (const f of flat) {
      covers += f.service.covers;
      revenue += f.service.revenue;
      flagged += f.service.flaggedCount;
      pending += pendingFor(f.service, f.date, f.slot);
    }
    return { covers, revenue, flagged, pending };
  }, [flat, pendingFor]);

  const select = useCallback((date: string, slot: ServiceSlot) => {
    setSelected({ date, slot });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const onDecide = useCallback(
    (itemId: string, decision: Decision) => {
      if (!selected) return;
      setDecisions((p) => ({ ...p, [itemKey(selected.date, selected.slot, itemId)]: decision }));
    },
    [selected],
  );
  const onNav = useCallback(
    (dir: -1 | 1) => {
      if (!selected) return;
      const idx = flat.findIndex((s) => s.date === selected.date && s.slot === selected.slot);
      const next = flat[idx + dir];
      if (next) setSelected({ date: next.date, slot: next.slot });
    },
    [flat, selected],
  );

  if (!week) {
    return (
      <div className="owner-shell">
        <div className="owner-body">
          <div className="owner-content" style={{ color: "var(--muted)" }}>
            Loading the week…
          </div>
        </div>
      </div>
    );
  }

  const peakSvc = serviceAt(week.peak);
  const selService = serviceAt(selected);
  const selIdx = selected ? flat.findIndex((s) => s.date === selected.date && s.slot === selected.slot) : -1;
  const selIsPeak = !!selected && week.peak.date === selected.date && week.peak.slot === selected.slot;

  return (
    <div className="owner-shell">
      <Sidebar week={week} selected={selected} approvals={totals.pending} onSelect={select} />

      <div className="owner-body">
        <TopBar rangeLabel={week.rangeLabel} />

        <div className="owner-content">
          {selService && selected ? (
            <ServiceDetail
              service={selService}
              isPeak={selIsPeak}
              decisionForItem={(itemId) => decisions[itemKey(selected.date, selected.slot, itemId)]}
              onDecide={onDecide}
              onBack={() => setSelected(null)}
              onNav={onNav}
              hasPrev={selIdx > 0}
              hasNext={selIdx >= 0 && selIdx < flat.length - 1}
            />
          ) : (
            <>
              <span className="grounded-pill">
                <DbDot /> Grounded in 3 years of Le Kyoto&apos;s service history
              </span>

              <h1 style={{ fontSize: 34, margin: "16px 0 8px", lineHeight: 1.05 }}>The week ahead</h1>
              <p style={{ color: "var(--muted)", fontSize: 15, maxWidth: 720, margin: "0 0 22px" }}>
                {week.rangeLabel}. Scan busy vs quiet services, open any one for its forecast, prep plan and the reasons
                behind it, then sign off the few risky calls.
              </p>

              <SummaryTiles
                s={{
                  totalCovers: totals.covers,
                  serviceCount: flat.length,
                  revenue: totals.revenue,
                  busiestLabel: `${weekdayShort(week.peak.date)} ${cap(week.peak.slot)}`,
                  busiestCovers: peakSvc?.covers ?? 0,
                  approvals: totals.pending,
                }}
              />

              <div style={{ marginTop: 16 }}>
                <ApprovalBanner
                  pending={totals.pending}
                  total={totals.flagged}
                  onReview={() => {
                    const f = flat.find((x) => pendingFor(x.service, x.date, x.slot) > 0);
                    if (f) select(f.date, f.slot);
                  }}
                />
              </div>

              {mocked && (
                <p style={{ color: "var(--warn)", fontSize: 12, marginTop: 14 }}>
                  preview · sample data (live plan connects when the backend exposes <code>/prep/week</code>)
                </p>
              )}

              <div className="daycards" style={{ marginTop: 22 }}>
                {openDays.map((d) => (
                  <div key={d.date} className="daycol">
                    <div className="daycol-head">
                      <span style={{ fontSize: 16, fontWeight: 800 }}>{weekdayShort(d.date)}</span>
                      <span style={{ fontSize: 13, color: "var(--muted)" }}>{Number(d.date.split("-")[2])} Jun</span>
                    </div>
                    {d.services.map((s) => (
                      <DayCard
                        key={s.slot}
                        service={s}
                        isPeak={week.peak.date === d.date && week.peak.slot === s.slot}
                        selected={false}
                        pending={pendingFor(s, d.date, s.slot)}
                        onSelect={() => select(d.date, s.slot)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DbDot() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3" />
    </svg>
  );
}
