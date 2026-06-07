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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { RecoverySidebar, type RecoverySection } from "../components/RecoverySidebar";
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

  // theater replay signal + current stage (also surfaced to the copilot)
  const [runNonce, setRunNonce] = useState(0);
  const [stage, setStage] = useState<RecoveryStage | null>(null);

  // HITL — lifted so both the buttons and a copilot action resolve the same state
  const [hitl, setHitl] = useState<HitlState>({ reply: "pending", ticket: "pending" });
  const decide = useCallback((target: HitlTarget, decision: HitlDecision) => {
    setHitl((p) => ({ ...p, [target]: decision }));
  }, []);

  const sections = {
    leaderboard: useRef<HTMLDivElement>(null),
    theater: useRef<HTMLDivElement>(null),
    drilldown: useRef<HTMLDivElement>(null),
    approvals: useRef<HTMLDivElement>(null),
  } as const;

  const goto = useCallback((id: RecoverySection) => {
    setActive(id);
    sections[id].current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchRecovery().then((r) => {
      setReport(r.report);
      setMocked(r.mocked);
    });
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
    <CopilotLayer report={report} stage={stage} hitl={hitl} decide={decide} replay={replay}>
      <div className="owner-shell">
        <RecoverySidebar active={active} approvals={pendingApprovals} onNavigate={goto} />

        <div className="owner-body">
          {/* top bar */}
          <div className="owner-topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
              <ThemeToggle />
            </div>
          </div>

          <div className="owner-content" style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 1040 }}>
            {/* hero */}
            <div>
              <span className="grounded-pill">
                <Dot /> Derived from Le Kyoto&apos;s real Google reviews
              </span>
              <h1 style={{ fontSize: 32, margin: "16px 0 8px", lineHeight: 1.08 }}>
                One review → a grounded recovery package
              </h1>
              <p style={{ color: "var(--muted)", fontSize: 15, maxWidth: 760, margin: 0, lineHeight: 1.55 }}>
                On {report.dataset.n} held-out cases — with the solo given ≥ the team&apos;s compute — the multi-agent
                team lifts <strong style={{ color: "var(--text)" }}>GRPR</strong>
                {soloRow && teamRow ? (
                  <>
                    {" "}from <strong style={{ color: "var(--text)" }}>{pct(soloRow.grpr)}</strong> to{" "}
                    <strong style={{ color: "var(--text)" }}>{pct(teamRow.grpr)}</strong>
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
                <p style={{ color: banner.tone, fontSize: 12.5, marginTop: 12 }}>{banner.text}</p>
              )}
            </div>

            <div ref={sections.leaderboard}>
              <RecoveryLeaderboard rows={report.rows} dataset={report.dataset} />
            </div>

            <div ref={sections.theater}>
              <AgentTheater sampleCase={report.sampleCase} runNonce={runNonce} onStage={setStage} />
            </div>

            <div ref={sections.drilldown}>
              <RecoveryCaseDrilldown c={report.sampleCase} />
            </div>

            <div ref={sections.approvals}>
              <RecoveryHITL reply={report.sampleCase.team.reply} ticket={ticket} state={hitl} onDecide={decide} />
            </div>

            <footer style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
              Traced in <strong>W&amp;B Weave</strong> · project <code>{WEAVE_PROJECT}</code>. CLI:{" "}
              <code>pnpm recovery</code>. The headline GRPR is mechanical (checkGrounding + deterministic
              triage/ticket) — no LLM judge.
            </footer>
          </div>
        </div>
      </div>
    </CopilotLayer>
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
