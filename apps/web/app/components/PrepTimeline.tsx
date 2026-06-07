"use client";

import type { PrepItem, PrepStrategy } from "../lib/plan";
import { SERVICE_START, minusMinutes, type ServiceSlot } from "../lib/week";
import { PrepRow, type Decision } from "./PrepRow";
import { sectionTitle } from "./ui";

/**
 * The timed prep PLAN: the same prep-sheet items, but grouped by WHEN/HOW to prep them, with a
 * computed "prep at HH:MM" off the service start. Cold/sushi top sellers batch ~1h ahead; hot &
 * grill are cooked à la minute; components are prepped ahead and assembled live. This is the
 * kitchen constraint the owner asked for — you don't pan gyoza 2h early; you batch maki at 17:30.
 */

const ORDER: PrepStrategy[] = ["ahead", "components", "to-order", "stock"];

interface GroupMeta {
  icon: string;
  title: string;
  sub: string;
  /** minutes before service this group is prepped; null = during/no prep */
  lead: number | null;
}
const META: Record<PrepStrategy, GroupMeta> = {
  ahead: { icon: "❄️", title: "Prep ahead", sub: "cold & sushi — batch the top sellers now, holds through service", lead: 60 },
  components: { icon: "🥗", title: "Components ready", sub: "rice, broth, sauces, blanched sides — assemble live", lead: 30 },
  "to-order": { icon: "🔥", title: "Made to order", sub: "hot & grill — cooked à la minute during service", lead: null },
  stock: { icon: "🥤", title: "Stocked", sub: "no prep — just keep it filled", lead: null },
};

export function PrepTimeline({
  items,
  slot,
  decisionForItem,
  onDecide,
}: {
  items: PrepItem[];
  slot: ServiceSlot;
  decisionForItem: (itemId: string) => Decision | undefined;
  onDecide: (itemId: string, decision: Decision) => void;
}) {
  const start = SERVICE_START[slot];

  return (
    <div>
      {ORDER.map((strategy) => {
        const group = items
          .filter((i) => (i.strategy ?? "to-order") === strategy)
          // priority: flagged first, then the biggest sellers (what you batch first)
          .sort((a, b) => Number(b.flagged ?? false) - Number(a.flagged ?? false) || b.adjusted - a.adjusted);
        if (group.length === 0) return null;

        const meta = META[strategy];
        const at = meta.lead !== null ? minusMinutes(start, meta.lead) : null;

        return (
          <section key={strategy} style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 14 }}>{meta.icon}</span>
              <h4 style={{ ...sectionTitle, fontSize: 12 }}>{meta.title}</h4>
              {at && (
                <span
                  style={{
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--accent)",
                    background: "var(--chip)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "1px 7px",
                  }}
                >
                  {at}
                </span>
              )}
              {!at && (
                <span style={{ fontSize: 11, color: "var(--muted)" }}>during service</span>
              )}
            </div>
            <p style={{ color: "var(--muted)", fontSize: 12, margin: "4px 0 8px" }}>{meta.sub}</p>

            <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
              {group.map((item, i) => (
                <PrepRow
                  key={item.id}
                  item={item}
                  first={i === 0}
                  decision={decisionForItem(item.id)}
                  onDecide={onDecide}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
