"use client";

import { btn } from "./ui";

/**
 * Prominent sign-off banner. Amber while risky calls await; flips to a green "all set" at 0.
 * Hidden when the week has nothing flagged.
 */
export function ApprovalBanner({
  pending,
  total,
  onReview,
}: {
  pending: number;
  /** total flagged this week (so the banner persists, green, after all are decided) */
  total: number;
  onReview: () => void;
}) {
  if (total <= 0) return null;
  const resolved = pending === 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 18px",
        borderRadius: 14,
        border: `1px solid ${resolved ? "color-mix(in srgb, var(--accent) 45%, transparent)" : "color-mix(in srgb, var(--warn) 50%, transparent)"}`,
        background: resolved ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "color-mix(in srgb, var(--warn) 9%, transparent)",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          flexShrink: 0,
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: resolved ? "var(--accent)" : "var(--warn)",
          background: resolved ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "color-mix(in srgb, var(--warn) 16%, transparent)",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 22V4a1 1 0 0 1 1-1h11l-1.5 4L16 11H5" />
        </svg>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>
          {resolved ? "All set — nothing left to approve this week." : `${pending} risky call${pending > 1 ? "s are" : " is"} waiting for your sign-off`}
        </div>
        {!resolved && (
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
            Big swings the kitchen shouldn&apos;t act on without you.
          </div>
        )}
      </div>

      {!resolved && (
        <button onClick={onReview} style={btn("var(--panel)", "var(--text)", "var(--border)")}>
          Review approvals
        </button>
      )}
    </div>
  );
}
