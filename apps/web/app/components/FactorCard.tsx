"use client";

import type { PrepFactor } from "../lib/plan";
import { panel, dirGlyph } from "./ui";

/** One "what's different tonight" factor (rain, derby, holiday, strike…). Presentational. */
export function FactorCard({ factor }: { factor: PrepFactor }) {
  return (
    <div style={{ ...panel, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 15 }}>{dirGlyph(factor.direction)}</span>
        <strong style={{ fontSize: 14 }}>{factor.label}</strong>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13, margin: "6px 0 0" }}>{factor.detail}</p>
    </div>
  );
}
