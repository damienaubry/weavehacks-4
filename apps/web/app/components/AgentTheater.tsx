"use client";

/**
 * The live agent theater — a replay of the HERO LOOP: Curator → Analyst → Writer → Verifier, with
 * the Writer's v1 (over-promising) BLOCKED by the Verifier, then the v2 rewrite that PASSES. This
 * is the "one LLM in a trenchcoat vs a real team" moment, made legible on stage.
 *
 * Self-contained: driven by a local timeline so it plays with or without a live backend. CopilotKit
 * can trigger a replay (bump `runNonce`) and read the current stage via `onStage` — but the theater
 * never depends on the proof engine or an LLM being reachable.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { STATIONS, type RecoverySampleCase, type StationId } from "../lib/recovery";

type Status = "idle" | "working" | "done" | "blocked";
type Tone = "neutral" | "blocked" | "pass";
interface LogLine {
  who: string;
  text: string;
  tone: Tone;
}
interface Frame {
  statuses: Record<StationId, Status>;
  log: LogLine[];
  showV1: boolean;
  v1Blocked: boolean;
  showV2: boolean;
  v2Passed: boolean;
  caption: string;
}

const S = (curator: Status, analyst: Status, writer: Status, verifier: Status): Record<StationId, Status> => ({
  curator,
  analyst,
  writer,
  verifier,
});

function buildFrames(c: RecoverySampleCase): Frame[] {
  const l: LogLine[] = [];
  const push = (who: string, text: string, tone: Tone = "neutral") => {
    l.push({ who, text, tone });
    return [...l];
  };
  return [
    {
      statuses: S("idle", "idle", "idle", "idle"),
      log: [...l],
      showV1: false,
      v1Blocked: false,
      showV2: false,
      v2Passed: false,
      caption: "Ready — the brigade turns one review into a grounded recovery package.",
    },
    {
      statuses: S("working", "idle", "idle", "idle"),
      log: push("Curator", "Pulling authorized sources — review text, aggregated POS window, menu + policy."),
      showV1: false,
      v1Blocked: false,
      showV2: false,
      v2Passed: false,
      caption: "Curator gathers ONLY the authorized evidence.",
    },
    {
      statuses: S("done", "working", "idle", "idle"),
      log: push("Analyst", "Triage → delivery_late. Ledger: 50-min delay, cold ramen, policy gesture = 15% credit."),
      showV1: false,
      v1Blocked: false,
      showV2: false,
      v2Passed: false,
      caption: "Analyst infers the incident type and cites the evidence ledger.",
    },
    {
      statuses: S("done", "done", "working", "idle"),
      log: push("Writer", "Draft v1 — wants a fluent, generous reply."),
      showV1: true,
      v1Blocked: false,
      showV2: false,
      v2Passed: false,
      caption: "Writer drafts v1 — it over-promises.",
    },
    {
      statuses: S("done", "done", "done", "working"),
      log: push("Verifier", "Challenging: unsupported claim? policy violation? over-promise?"),
      showV1: true,
      v1Blocked: false,
      showV2: false,
      v2Passed: false,
      caption: "Verifier (authority 90) challenges every claim.",
    },
    {
      statuses: S("done", "done", "working", "blocked"),
      log: push("Verifier", "✗ policy: over-promise “repas offert + remboursement intégral”   ✗ ticket: missing → BLOCK.", "blocked"),
      showV1: true,
      v1Blocked: true,
      showV2: false,
      v2Passed: false,
      caption: "Verifier BLOCKS — the conflict the team exists to resolve.",
    },
    {
      statuses: S("done", "done", "working", "idle"),
      log: push("Writer", "Rewrite v2 — 15% credit per policy + an internal ticket."),
      showV1: true,
      v1Blocked: true,
      showV2: true,
      v2Passed: false,
      caption: "Writer rewrites from the ledger, within policy.",
    },
    {
      statuses: S("done", "done", "done", "working"),
      log: push("Verifier", "Re-checking v2 against the ledger + policy…"),
      showV1: true,
      v1Blocked: true,
      showV2: true,
      v2Passed: false,
      caption: "Verifier re-checks the rewrite.",
    },
    {
      statuses: S("done", "done", "done", "done"),
      log: push("Verifier", "✓ triage   ✓ 0 ungrounded   ✓ policy   ✓ ticket → PASS.", "pass"),
      showV1: true,
      v1Blocked: true,
      showV2: true,
      v2Passed: true,
      caption: "All four checks pass → hand to a human for sign-off (HITL).",
    },
  ];
}

const FRAME_MS = 1150;

export function AgentTheater({
  sampleCase,
  runNonce = 0,
  onStage,
}: {
  sampleCase: RecoverySampleCase;
  /** bump to replay from outside (e.g. a CopilotKit action) */
  runNonce?: number;
  onStage?: (stage: { index: number; total: number; caption: string; done: boolean }) => void;
}) {
  const framesRef = useRef<Frame[]>(buildFrames(sampleCase));
  framesRef.current = buildFrames(sampleCase);
  const frames = framesRef.current;

  const [fi, setFi] = useState(0);
  const [localNonce, setLocalNonce] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // (re)play whenever an external or local replay signal changes
  useEffect(() => {
    clear();
    setFi(0);
    for (let i = 1; i < frames.length; i++) {
      timers.current.push(setTimeout(() => setFi(i), FRAME_MS * i));
    }
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runNonce, localNonce, frames.length]);

  useEffect(() => {
    onStage?.({ index: fi, total: frames.length - 1, caption: frames[fi].caption, done: fi >= frames.length - 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fi]);

  const replay = useCallback(() => setLocalNonce((n) => n + 1), []);

  const frame = frames[fi];
  const running = fi > 0 && fi < frames.length - 1;
  const progress = Math.round((fi / (frames.length - 1)) * 100);

  return (
    <section
      style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}
      aria-label="agent theater"
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 17, margin: 0 }}>The brigade at work</h2>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>
            One review → a grounded recovery package. Watch the Verifier block the over-promise, then the Writer fix it.
          </p>
        </div>
        <button onClick={replay} disabled={running} style={btn(running)}>
          {running ? "Running…" : fi === 0 ? "▶ Play" : "↻ Replay"}
        </button>
      </div>

      {/* progress rail */}
      <div style={{ marginTop: 14, height: 4, borderRadius: 999, background: "color-mix(in srgb, var(--muted) 16%, transparent)", overflow: "hidden" }}>
        <div style={{ width: `${progress}%`, height: "100%", background: "var(--accent)", transition: "width .3s ease" }} />
      </div>

      {/* station cards */}
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        {STATIONS.map((st, i) => (
          <StationCard key={st.id} index={i} name={st.name} authority={st.authority} note={st.note} status={frame.statuses[st.id]} />
        ))}
      </div>

      {/* caption */}
      <p style={{ marginTop: 14, fontSize: 13.5, color: "var(--text)", minHeight: 20 }}>
        <span style={{ color: "var(--accent)", fontWeight: 700 }}>›</span> {frame.caption}
      </p>

      {/* drafts: v1 (blocked) → v2 (passed) */}
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 10 }}>
        {frame.showV1 && (
          <DraftCard
            version={1}
            text={sampleCase.solo.reply}
            state={frame.v1Blocked ? "blocked" : "pending"}
          />
        )}
        {frame.showV2 && (
          <DraftCard version={2} text={sampleCase.team.reply} state={frame.v2Passed ? "passed" : "pending"} />
        )}
      </div>

      {/* transcript */}
      {frame.log.length > 0 && (
        <div
          style={{
            marginTop: 14,
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--chip)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            fontFamily: "ui-monospace, monospace",
            fontSize: 12,
          }}
        >
          {frame.log.map((line, i) => (
            <div key={i} style={{ display: "flex", gap: 8, opacity: i === frame.log.length - 1 ? 1 : 0.6 }}>
              <span style={{ color: "var(--muted)", minWidth: 64 }}>{line.who}</span>
              <span style={{ color: line.tone === "blocked" ? "var(--danger)" : line.tone === "pass" ? "var(--accent)" : "var(--text)" }}>
                {line.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function StationCard({
  index,
  name,
  authority,
  note,
  status,
}: {
  index: number;
  name: string;
  authority: number;
  note: string;
  status: Status;
}) {
  const tone =
    status === "blocked" ? "var(--danger)" : status === "working" ? "var(--warn)" : status === "done" ? "var(--accent)" : "var(--muted)";
  const active = status === "working" || status === "blocked";
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 12,
        border: `1px solid ${active ? `color-mix(in srgb, ${tone} 55%, var(--border))` : "var(--border)"}`,
        background: active ? `color-mix(in srgb, ${tone} 8%, var(--panel))` : "var(--panel)",
        padding: "11px 12px",
        transition: "border-color .25s ease, background .25s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: tone,
            boxShadow: status === "working" ? `0 0 0 4px color-mix(in srgb, ${tone} 22%, transparent)` : "none",
            transition: "box-shadow .25s ease",
          }}
        />
        <span style={{ fontSize: 11, color: "var(--muted)" }}>{index + 1}</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--muted)" }}>auth {authority}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>{name}</div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, lineHeight: 1.35 }}>{note}</div>
      <div style={{ marginTop: 7, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: tone }}>
        {status === "idle" ? "waiting" : status === "working" ? "working…" : status === "blocked" ? "blocks" : "done"}
      </div>
    </div>
  );
}

function DraftCard({ version, text, state }: { version: 1 | 2; text: string; state: "pending" | "blocked" | "passed" }) {
  const color = state === "blocked" ? "var(--danger)" : state === "passed" ? "var(--accent)" : "var(--muted)";
  const tag = state === "blocked" ? "BLOCKED" : state === "passed" ? "PASS" : "draft";
  return (
    <div
      style={{
        borderRadius: 10,
        border: `1px solid color-mix(in srgb, ${color} 40%, var(--border))`,
        background: `color-mix(in srgb, ${color} 6%, transparent)`,
        padding: "10px 13px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}>Draft v{version}</span>
        <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, color }}>{tag}</span>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.5,
          color: state === "blocked" ? "var(--muted)" : "var(--text)",
          textDecoration: state === "blocked" ? "line-through" : "none",
          textDecorationColor: "color-mix(in srgb, var(--danger) 60%, transparent)",
        }}
      >
        {text}
      </p>
    </div>
  );
}

function btn(disabled: boolean) {
  return {
    // disabled state composites over the panel (not transparent) + a muted label so contrast holds
    // in BOTH themes — the button shows "Running…" for most of the ~10s replay.
    background: disabled ? "color-mix(in srgb, var(--accent) 28%, var(--panel))" : "var(--accent)",
    color: disabled ? "var(--muted)" : "var(--accent-fg)",
    border: 0,
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 700,
    cursor: disabled ? "default" : "pointer",
    whiteSpace: "nowrap" as const,
  };
}
