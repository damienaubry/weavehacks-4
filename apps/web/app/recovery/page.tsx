"use client";

/**
 * /recovery — THE judged demo surface for the Grounded Recovery Copilot.
 *
 * Reads `GET /recovery` (3-row GRPR leaderboard + one illustrative case) with a mock fallback so it
 * presents standalone when the API is down. Shows: the rising GRPR leaderboard (solo < team <
 * team+memory at matched compute), the live brigade theater (Curator→Analyst→Writer→Verifier with
 * the v1→v2 rewrite), the case drill-down (solo fail vs team pass + memory reuse), and the HITL
 * gate (approve/reject the reply + ticket before anything publishes).
 *
 * The CopilotKit layer (live chat, readable state, the HITL action) wraps this in `./CopilotLayer`
 * — front-end only, and the page renders fully even if that layer or its runtime is unavailable.
 */
import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchRecovery,
  ticketFor,
  pct,
  memorySummary,
  type RecoveryReport,
} from "../lib/recovery";
import { RecoveryLeaderboard } from "../components/RecoveryLeaderboard";
import { AgentTheater } from "../components/AgentTheater";
import { RecoveryCaseDrilldown } from "../components/RecoveryCaseDrilldown";
import { RecoveryHITL, type HitlState, type HitlTarget, type HitlDecision } from "../components/RecoveryHITL";
import { RecoveryTabs, type RecoverySection } from "../components/RecoveryTabs";
import { LogoMark } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";
import { CopilotLayer } from "./CopilotLayer";

const WEAVE_PROJECT = process.env.NEXT_PUBLIC_WEAVE_PROJECT ?? "weavehacks-4";

export interface RecoveryStage {
  index: number;
  total: number;
  caption: string;
  done: boolean;
}

export default function RecoveryPage() {
  const [report, setReport] = useState<RecoveryReport | null>(null);
  const [mocked, setMocked] = useState(false);
  const [active, setActive] = useState<RecoverySection>("leaderboard");

  // Audit Copilot toggle — local-only, default ON. OFF unmounts the CopilotKit sidebar entirely
  // (a pre-submission safety switch: kill the copilot from the UI without touching code).
  const [auditMode, setAuditMode] = useState(true);

  // theater replay signal + current stage (also surfaced to the copilot)
  const [runNonce, setRunNonce] = useState(0);
  const [stage, setStage] = useState<RecoveryStage | null>(null);

  // HITL — lifted so both the buttons and a copilot action resolve the same state
  const [hitl, setHitl] = useState<HitlState>({ reply: "pending", ticket: "pending" });
  const decide = useCallback((target: HitlTarget, decision: HitlDecision) => {
    setHitl((p) => ({ ...p, [target]: decision }));
  }, []);

  // Deck model: `active` (the RecoverySection state above) is the single source of truth. The rail is
  // translated by -activeIndex*100%, so the highlighted step and the visible slide can never desync —
  // no scroll-spy / refs / IntersectionObserver needed.
  const ORDER = ["leaderboard", "theater", "drilldown", "approvals"] as const;
  const activeIndex = ORDER.indexOf(active);
  const goto = useCallback((id: RecoverySection) => setActive(id), []);
  const gotoIndex = useCallback((i: number) => {
    const c = Math.max(0, Math.min(ORDER.length - 1, i));
    setActive(ORDER[c]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchRecovery().then((r) => {
      setReport(r.report);
      setMocked(r.mocked);
    });
  }, []);

  // Pin the document while the deck is mounted — the fixed-height shell owns the viewport, so the
  // page itself must never scroll (this is what makes navigation horizontal, not vertical).
  useEffect(() => {
    document.documentElement.classList.add("recovery-noscroll");
    return () => document.documentElement.classList.remove("recovery-noscroll");
  }, []);

  // Keyboard: ←/→ + Home/End move slides; never hijack the copilot chat input or any text field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End") return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable ||
          t.closest("input, textarea, [contenteditable=true], .copilotKitSidebar, .copilotKitWindow, [data-copilotkit]"))
      )
        return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        gotoIndex(activeIndex + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        gotoIndex(activeIndex - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        gotoIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        gotoIndex(ORDER.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, gotoIndex]);

  // Pointer swipe on the deck — horizontal-dominant gestures only (dx > dy*1.3), so a vertical scroll
  // inside a tall slide never flips the slide; swipes starting on a control are ignored.
  const swipeX = useRef<number | null>(null);
  const swipeY = useRef(0);
  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const t = e.target as HTMLElement | null;
    if (t && t.closest("button, a, input, textarea, [contenteditable=true]")) {
      swipeX.current = null;
      return;
    }
    swipeX.current = e.clientX;
    swipeY.current = e.clientY;
  }, []);
  const onPointerUp = useCallback(
    (e: ReactPointerEvent) => {
      if (swipeX.current === null) return;
      const dx = e.clientX - swipeX.current;
      const dy = e.clientY - swipeY.current;
      swipeX.current = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        gotoIndex(activeIndex + (dx < 0 ? 1 : -1));
      }
    },
    [activeIndex, gotoIndex],
  );
  const onPointerCancel = useCallback(() => {
    swipeX.current = null;
  }, []);

  const ticket = useMemo(
    () => (report ? ticketFor(report.sampleCase.incidentTypeGold) : null),
    [report],
  );
  const pendingApprovals = (hitl.reply === "pending" ? 1 : 0) + (hitl.ticket === "pending" ? 1 : 0);
  const replay = useCallback(() => setRunNonce((n) => n + 1), []);

  if (!report || !ticket) {
    return (
      <div className="owner-shell">
        <div className="owner-body">
          <div className="owner-content" style={{ color: "var(--muted)" }}>
            Loading the GRPR scoreboard…
          </div>
        </div>
      </div>
    );
  }

  const banner = mocked
    ? { text: "preview · showing the last recorded GRPR run — the API isn’t warmed (run pnpm recovery for live)", tone: "var(--warn)" }
    : report.placeholder
      ? { text: "preview · placeholder numbers — run pnpm recovery to compute the live GRPR scoreboard", tone: "var(--warn)" }
      : null;

  // Honest, data-driven hero copy — never claim memory "improves again" when the data says otherwise.
  const mem = memorySummary(report.rows);
  const soloRow = report.rows.find((r) => r.variant === "solo");
  const teamRow = report.rows.find((r) => r.variant === "team");

  return (
    <CopilotLayer report={report} stage={stage} hitl={hitl} decide={decide} replay={replay} auditMode={auditMode}>
      <div className="recovery-app">
        <div className="owner-body recovery-body">
          {/* top bar */}
          <div className="owner-topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <LogoMark size={26} />
              <span style={{ fontSize: 15, fontWeight: 700 }}>Grounded Recovery Copilot</span>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                {report.dataset.n} cases · {report.dataset.realCount} real
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  fontSize: 12.5,
                  color: "var(--muted)",
                  border: "1px solid var(--border)",
                  borderRadius: 999,
                  padding: "5px 12px",
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: 999, background: mocked ? "var(--warn)" : "var(--accent)" }} />
                {mocked ? "staged" : "live"} · /recovery
              </span>
              <AuditToggle on={auditMode} onToggle={() => setAuditMode((v) => !v)} />
              <ThemeToggle />
            </div>
          </div>

          {/* horizontal stepper — primary nav; clicking a step flips the deck slide */}
          <RecoveryTabs active={active} approvals={pendingApprovals} onNavigate={goto} />

          {/* slim progress fill under the stepper */}
          <div className="deck-progress" aria-hidden="true">
            <span className="deck-progress-fill" style={{ width: `${((activeIndex + 1) / ORDER.length) * 100}%` }} />
          </div>

          {/* deck viewport — fills the remaining height, clips the horizontal rail */}
          <div
            className="deck-viewport"
            role="region"
            aria-roledescription="carousel"
            aria-label="Recovery demo slides"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
          >
            <button
              type="button"
              className="deck-chevron deck-chevron-prev"
              onClick={() => gotoIndex(activeIndex - 1)}
              disabled={activeIndex === 0}
              aria-label="Previous slide"
            >
              ‹
            </button>
            <button
              type="button"
              className="deck-chevron deck-chevron-next"
              onClick={() => gotoIndex(activeIndex + 1)}
              disabled={activeIndex === ORDER.length - 1}
              aria-label="Next slide"
            >
              ›
            </button>

            <div className="deck-rail" style={{ transform: `translate3d(-${activeIndex * 100}%, 0, 0)` }}>
              {/* SLIDE 1 — compact hero + GRPR leaderboard */}
              <section
                className="deck-slide"
                data-section="leaderboard"
                role="group"
                aria-roledescription="slide"
                aria-label="Step 1 of 4 — GRPR leaderboard"
                aria-hidden={active !== "leaderboard"}
              >
                <div className="deck-slide-inner">
                  <div className="deck-hero">
                    <span className="grounded-pill">
                      <Dot /> Derived from Le Kyoto&apos;s real Google reviews
                    </span>
                    <h1 className="deck-hero-title">One review → a grounded recovery package</h1>
                    <p className="deck-hero-sub">
                      On <strong>{report.dataset.n}</strong> held-out cases — solo given ≥ the team&apos;s compute — the
                      multi-agent team lifts <strong>GRPR</strong>
                      {soloRow && teamRow ? (
                        <>
                          {" "}from <strong>{pct(soloRow.grpr)}</strong> to <strong>{pct(teamRow.grpr)}</strong>
                          {mem.soloToTeam !== null ? ` (+${mem.soloToTeam} pts)` : ""}
                        </>
                      ) : null}
                      .{" "}
                      {mem.memoryHelps === "up"
                        ? `Across-run memory adds another +${mem.teamToMemory} pts.`
                        : mem.memoryHelps === "down"
                          ? `Across-run memory did not help this run (${mem.teamToMemory} pts on the held-out slice) — the self-improvement that holds is the Verifier driving the Writer’s v1→v2 rewrite.`
                          : "The self-improvement you can watch live is the Verifier driving the Writer’s v1→v2 rewrite; across-run memory is neutral on this slice."}{" "}
                      Every claim is traced to the query that proves it in Weave.
                    </p>
                    {banner && (
                      <p className="deck-hero-banner" style={{ color: banner.tone }}>
                        {banner.text}
                      </p>
                    )}
                  </div>
                  <RecoveryLeaderboard rows={report.rows} dataset={report.dataset} />
                  <footer className="deck-footer">
                    Traced in <strong>W&amp;B Weave</strong> · project <code>{WEAVE_PROJECT}</code>. CLI:{" "}
                    <code>pnpm recovery</code>. The headline GRPR is mechanical (checkGrounding + deterministic
                    triage/ticket) — no LLM judge.
                  </footer>
                </div>
              </section>

              {/* SLIDE 2 — the brigade theater (stays mounted → its animation/replay state survives) */}
              <section
                className="deck-slide"
                data-section="theater"
                role="group"
                aria-roledescription="slide"
                aria-label="Step 2 of 4 — The brigade"
                aria-hidden={active !== "theater"}
              >
                <div className="deck-slide-inner deck-slide-inner--wide">
                  <AgentTheater sampleCase={report.sampleCase} runNonce={runNonce} onStage={setStage} />
                </div>
              </section>

              {/* SLIDE 3 — case drill-down (solo fail vs team pass + memory reuse) */}
              <section
                className="deck-slide"
                data-section="drilldown"
                role="group"
                aria-roledescription="slide"
                aria-label="Step 3 of 4 — Case drill-down"
                aria-hidden={active !== "drilldown"}
              >
                <div className="deck-slide-inner deck-slide-inner--wide">
                  <RecoveryCaseDrilldown c={report.sampleCase} />
                </div>
              </section>

              {/* SLIDE 4 — HITL approvals */}
              <section
                className="deck-slide"
                data-section="approvals"
                role="group"
                aria-roledescription="slide"
                aria-label="Step 4 of 4 — Approvals"
                aria-hidden={active !== "approvals"}
              >
                <div className="deck-slide-inner">
                  <RecoveryHITL reply={report.sampleCase.team.reply} ticket={ticket} state={hitl} onDecide={decide} />
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </CopilotLayer>
  );
}

/**
 * Audit Copilot switch — a pill switch in the top bar (matches ThemeToggle's shape). ON mounts the
 * CopilotKit sidebar; OFF hides it entirely. Local state only; no persistence (see RecoveryPage).
 */
function AuditToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      aria-label="Audit Copilot"
      title={on ? "Audit Copilot is on — click to hide the sidebar" : "Audit Copilot is off — click to show the sidebar"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        height: 34,
        padding: "0 12px 0 13px",
        borderRadius: 999,
        border: "1px solid var(--border)",
        background: "transparent",
        color: on ? "var(--text)" : "var(--muted)",
        cursor: "pointer",
        fontSize: 12.5,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden style={{ fontSize: 13, lineHeight: 1 }}>
        🤖
      </span>
      <span>Audit Copilot</span>
      <span
        aria-hidden
        style={{
          position: "relative",
          width: 30,
          height: 16,
          borderRadius: 999,
          background: on ? "var(--accent)" : "var(--border)",
          transition: "background 140ms ease",
          flex: "none",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: on ? 16 : 2,
            width: 12,
            height: 12,
            borderRadius: 999,
            background: on ? "var(--accent-fg)" : "var(--muted)",
            transition: "left 140ms ease",
          }}
        />
      </span>
    </button>
  );
}

function Dot() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3" />
    </svg>
  );
}
