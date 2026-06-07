"use client";

import { Fragment } from "react";

export type RecoverySection = "leaderboard" | "theater" | "drilldown" | "approvals";

const TABS: { id: RecoverySection; label: string }[] = [
  { id: "leaderboard", label: "GRPR leaderboard" },
  { id: "theater", label: "The brigade" },
  { id: "drilldown", label: "Case drill-down" },
  { id: "approvals", label: "Approvals" },
];

/**
 * Horizontal stepper that replaces the old left sidebar: the four demo sections as numbered
 * steps in a row, sticky under the top bar. Clicking a step scrolls to its section; the active
 * step (driven by the page's scroll-spy) is highlighted. The Approvals step carries the pending
 * count so the HITL gate stays visible from anywhere on the page.
 */
export function RecoveryTabs({
  active,
  approvals,
  onNavigate,
}: {
  active: RecoverySection;
  approvals: number;
  onNavigate: (id: RecoverySection) => void;
}) {
  return (
    <nav className="recovery-tabs" aria-label="Recovery sections">
      {TABS.map((t, i) => (
        <Fragment key={t.id}>
          {i > 0 && <span className="tab-connector" aria-hidden="true" />}
          <button
            type="button"
            className={`recovery-tab${active === t.id ? " active" : ""}`}
            onClick={() => onNavigate(t.id)}
            aria-current={active === t.id ? "step" : undefined}
          >
            <span className="recovery-tab-num">{i + 1}</span>
            {t.label}
            {t.id === "approvals" && approvals > 0 && (
              <span className="recovery-tab-count">{approvals}</span>
            )}
          </button>
        </Fragment>
      ))}
    </nav>
  );
}
