"use client";

/**
 * Human-in-the-loop gate. Anything touching money or public reputation — a published reply, a
 * credit/gesture, an action ticket — requires a human OK. NOTHING auto-publishes. The Verifier
 * already passed the package; this is the final human sign-off before it would go out.
 *
 * Controlled: decisions are lifted to the page so a CopilotKit action (renderAndWaitForResponse)
 * and the buttons resolve the SAME state.
 */
import type { CSSProperties } from "react";
import type { RecoveryTicket } from "../lib/recovery";

export type HitlTarget = "reply" | "ticket";
export type HitlDecision = "pending" | "approved" | "rejected";
export type HitlState = Record<HitlTarget, HitlDecision>;

const panel: CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 18,
};

const SEV_COLOR: Record<RecoveryTicket["severity"], string> = {
  low: "var(--muted)",
  med: "var(--warn)",
  high: "var(--danger)",
};

export function RecoveryHITL({
  reply,
  ticket,
  state,
  onDecide,
}: {
  reply: string;
  ticket: RecoveryTicket;
  state: HitlState;
  onDecide: (target: HitlTarget, decision: HitlDecision) => void;
}) {
  const published = state.reply === "approved" && state.ticket === "approved";
  const anyRejected = state.reply === "rejected" || state.ticket === "rejected";

  return (
    <section style={{ ...panel, borderColor: published ? "color-mix(in srgb, var(--accent) 45%, var(--border))" : "var(--warn)" }} aria-label="human approval gate">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16 }}>{published ? "✅" : "⚠"}</span>
        <h2 style={{ fontSize: 17, margin: 0 }}>Human sign-off before anything is published</h2>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13, margin: "5px 0 0" }}>
        The Verifier passed the package — but the public reply and the ticket only go out once you approve. Nothing
        auto-publishes.
      </p>

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {/* public reply */}
        <GateItem
          kind="Public reply"
          decision={state.reply}
          onApprove={() => onDecide("reply", "approved")}
          onReject={() => onDecide("reply", "rejected")}
        >
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55 }}>{reply}</p>
        </GateItem>

        {/* internal ticket */}
        <GateItem
          kind="Internal ticket"
          decision={state.ticket}
          onApprove={() => onDecide("ticket", "approved")}
          onReject={() => onDecide("ticket", "rejected")}
        >
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                color: SEV_COLOR[ticket.severity],
                border: `1px solid color-mix(in srgb, ${SEV_COLOR[ticket.severity]} 45%, transparent)`,
                borderRadius: 999,
                padding: "2px 9px",
              }}
            >
              {ticket.severity}
            </span>
            <code style={{ fontSize: 12 }}>{ticket.owner}</code>
            {ticket.dueHint && <span style={{ color: "var(--muted)" }}>· due {ticket.dueHint}</span>}
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.5 }}>{ticket.action}</p>
        </GateItem>
      </div>

      {published && (
        <div
          style={{
            marginTop: 14,
            padding: "10px 14px",
            borderRadius: 10,
            fontSize: 13,
            color: "var(--accent)",
            border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)",
            background: "color-mix(in srgb, var(--accent) 8%, transparent)",
          }}
        >
          ✓ Approved — reply queued to the customer and the ticket routed to ops. (Demo: nothing actually sends.)
        </div>
      )}
      {anyRejected && !published && (
        <div style={{ marginTop: 14, fontSize: 13, color: "var(--danger)" }}>
          Rejected — sent back to the Writer for another pass. Nothing left the building.
        </div>
      )}
    </section>
  );
}

function GateItem({
  kind,
  decision,
  onApprove,
  onReject,
  children,
}: {
  kind: string;
  decision: HitlDecision;
  onApprove: () => void;
  onReject: () => void;
  children: React.ReactNode;
}) {
  const settled = decision !== "pending";
  return (
    <div
      style={{
        ...panel,
        padding: 14,
        borderColor:
          decision === "approved"
            ? "color-mix(in srgb, var(--accent) 45%, var(--border))"
            : decision === "rejected"
              ? "color-mix(in srgb, var(--danger) 45%, var(--border))"
              : "var(--border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.7, fontWeight: 700 }}>
          {kind}
        </span>
        {settled && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: 12,
              fontWeight: 700,
              color: decision === "approved" ? "var(--accent)" : "var(--danger)",
            }}
          >
            {decision === "approved" ? "✅ Approved" : "❌ Rejected"}
          </span>
        )}
      </div>

      {children}

      {!settled && (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={onApprove} style={btn("var(--accent)", "var(--accent-fg)")}>
            Approve
          </button>
          <button onClick={onReject} style={btn("transparent", "var(--danger)", "var(--danger)")}>
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

function btn(bg: string, fg: string, border?: string): CSSProperties {
  return {
    background: bg,
    color: fg,
    border: border ? `1px solid ${border}` : 0,
    borderRadius: 8,
    padding: "7px 16px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}
