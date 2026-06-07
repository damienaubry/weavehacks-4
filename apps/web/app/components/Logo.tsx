import type { CSSProperties } from "react";

/**
 * BRIGADE logo. The mark = a rounded badge with an ember→matcha gradient and a white
 * double chevron — kitchen-brigade rank insignia (stations under a head chef), reading
 * upward as "improve". The two brand hues in the gradient are the whole identity in one mark.
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" style={{ display: "block" }}>
      <defs>
        <linearGradient id="brigade-mark" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          {/* CSS vars resolve via the `stop-color` CSS property (style), not the attribute. */}
          <stop offset="0" style={{ stopColor: "var(--brand)" }} />
          <stop offset="1" style={{ stopColor: "var(--accent)" }} />
        </linearGradient>
      </defs>
      {/* circle + crossed chopsticks */}
      <circle cx="16" cy="16" r="15" fill="url(#brigade-mark)" />
      <line x1="10.5" y1="22" x2="20.5" y2="10" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="13.5" y1="23" x2="23.5" y2="11" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

/** Full lockup: mark + "BRIGADE" wordmark, with an optional "· Le Kyoto" tag. */
export function Logo({ size = 28, tag = "Le Kyoto" }: { size?: number; tag?: string | null }) {
  const wordStyle: CSSProperties = {
    fontSize: 17,
    fontWeight: 800,
    letterSpacing: 1.5,
    color: "var(--text)",
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <LogoMark size={size} />
      <span style={wordStyle}>BRIGADE</span>
      {tag && (
        <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500, letterSpacing: 0.2 }}>· {tag}</span>
      )}
    </span>
  );
}
