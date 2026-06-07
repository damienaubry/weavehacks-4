"use client";

/**
 * CopilotKit layer for /recovery — FRONT-END ONLY (resolved decision: a UI framework must never
 * touch the proof engine or the judged GRPR number). It mounts the CopilotKit provider + chat
 * sidebar, exposes the recovery state to the assistant via `useCopilotReadable`, drives the live
 * brigade replay via an action, and offers the HITL approve/reject as a copilot action — all
 * resolving the SAME lifted state the on-page buttons use.
 *
 * Degrades gracefully: the provider mounts WITHOUT a reachable runtime (it only calls the LLM when
 * the user sends a chat message — see app/api/copilotkit/route.ts), so the page renders fully even
 * with no backend key. The headline GRPR numbers always come from `GET /recovery`, never the LLM.
 */
import type { CSSProperties, ReactNode } from "react";
import { CopilotKit, useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { pct, ticketFor, type RecoveryReport } from "../lib/recovery";
import type { HitlDecision, HitlState, HitlTarget } from "../components/RecoveryHITL";
import type { RecoveryStage } from "./page";

export interface CopilotLayerProps {
  report: RecoveryReport;
  stage: RecoveryStage | null;
  hitl: HitlState;
  decide: (target: HitlTarget, decision: HitlDecision) => void;
  replay: () => void;
  children: ReactNode;
}

export function CopilotLayer(props: CopilotLayerProps) {
  return (
    // showDevConsole={false} disables CopilotKit's CopilotDevConsole. CopilotKit ALSO injects a
    // separate <cpk-web-inspector> web component that shows a "🪁 Big update: …" marketing banner in
    // dev — not gated by that prop. Both live at the document root (the inspector in a shadow DOM, so
    // we hide its light-DOM HOST element), hence GLOBAL selectors. Keeps the demo clean on a projector;
    // the chat sidebar (copilotKitButton / CopilotSidebar) is a different element and stays.
    <CopilotKit runtimeUrl="/api/copilotkit" showDevConsole={false}>
      <style>{`.copilotKitDevConsole,cpk-web-inspector{display:none !important;}`}</style>
      <CopilotBridge {...props} />
      {props.children}
      <CopilotSidebar
        defaultOpen={false}
        clickOutsideToClose
        instructions={
          "You are the Grounded Recovery Copilot for Le Kyoto, a small Japanese takeout near Paris. " +
          "Answer ONLY from the provided recovery state (the GRPR scoreboard and the sample case). " +
          "The headline metric is GRPR — Grounded Recovery Pass Rate — solo < team < team+memory at matched compute. " +
          "When the user wants to see the pipeline, call the replayBrigade action. When they want to publish the " +
          "recovery package, call approveRecoveryPackage so a human can approve or reject. Never invent restaurant " +
          "facts; nothing publishes without human approval."
        }
        labels={{
          title: "Recovery Copilot",
          initial:
            "I turn one review into a grounded recovery package. Try: “explain the GRPR gap”, “run the brigade”, or “approve the package”.",
        }}
      />
    </CopilotKit>
  );
}

/** Registers the readable state + actions. Renders nothing; must live inside <CopilotKit>. */
function CopilotBridge({ report, stage, hitl, decide, replay }: Omit<CopilotLayerProps, "children">) {
  const sc = report.sampleCase;
  const ticket = ticketFor(sc.incidentTypeGold);
  const row = (v: string) => report.rows.find((r) => r.variant === v);

  useCopilotReadable({
    description:
      "The Grounded Recovery Copilot's live state: the GRPR leaderboard (solo vs team vs team+memory, " +
      "with matched compute budgets), the illustrative case (review, gold triage, solo failure vs team pass, " +
      "memory reuse), where the live brigade replay is, and the human-approval decisions.",
    value: {
      metric: "GRPR — Grounded Recovery Pass Rate (binary, conjunctive, mechanical)",
      dataset: report.dataset,
      leaderboard: report.rows.map((r) => ({
        variant: r.variant,
        grpr: pct(r.grpr),
        budgetTokens: r.budgetTokens,
        budgetCalls: r.budgetCalls,
      })),
      gaps: {
        solo_to_team: row("solo") && row("team") ? `${Math.round((row("team")!.grpr - row("solo")!.grpr) * 100)} pts` : null,
        team_to_memory:
          row("team") && row("team+memory")
            ? `${Math.round((row("team+memory")!.grpr - row("team")!.grpr) * 100)} pts`
            : null,
      },
      sampleCase: {
        id: sc.id,
        review: sc.review,
        goldIncidentType: sc.incidentTypeGold,
        solo: { reply: sc.solo.reply, passed: sc.solo.pass, failReasons: sc.solo.failReasons },
        team: { reply: sc.team.reply, passed: sc.team.pass },
        memoryReuse: sc.memoryReuse ?? null,
        internalTicket: ticket,
      },
      brigadeReplay: stage ? { step: stage.index, of: stage.total, caption: stage.caption, done: stage.done } : "idle",
      humanApproval: hitl,
      note: report.placeholder ? "Numbers are placeholder until the live GRPR harness (WS-C) is wired." : "Live from GET /recovery.",
    },
  });

  // Action: replay the live brigade theater (Curator → Analyst → Writer → Verifier).
  useCopilotAction({
    name: "replayBrigade",
    description: "Replay the live agent theater: the Curator→Analyst→Writer→Verifier pipeline, including the Verifier blocking the over-promising v1 draft and the Writer's grounded v2 rewrite.",
    parameters: [],
    handler: async () => {
      replay();
      return "Replaying the brigade — watch the Verifier block the over-promise, then the v2 rewrite pass.";
    },
  });

  // HITL: approve/reject the public reply + the internal ticket before anything publishes.
  useCopilotAction({
    name: "approveRecoveryPackage",
    description: "Ask the human to APPROVE or REJECT the public reply and the internal ticket before publishing. Nothing publishes without this human sign-off.",
    parameters: [],
    renderAndWaitForResponse: (rp: {
      status: "inProgress" | "executing" | "complete";
      respond?: (result: string) => void;
      result?: unknown;
    }) => {
      if (rp.status === "complete") {
        return <ChatNote>Decision recorded: {String(rp.result ?? "")}</ChatNote>;
      }
      const ready = rp.status === "executing";
      return (
        <InlineApproval
          ready={ready}
          reply={sc.team.reply}
          ticket={`${ticket.severity.toUpperCase()} · ${ticket.owner} — ${ticket.action}`}
          onApprove={() => {
            decide("reply", "approved");
            decide("ticket", "approved");
            rp.respond?.("APPROVED — public reply queued + ticket routed to ops (demo: nothing actually sends).");
          }}
          onReject={() => {
            decide("reply", "rejected");
            decide("ticket", "rejected");
            rp.respond?.("REJECTED — sent back to the Writer for another pass. Nothing left the building.");
          }}
        />
      );
    },
  });

  return null;
}

// ── tiny in-chat UI ─────────────────────────────────────────────────────────────────────────────

function ChatNote({ children }: { children: ReactNode }) {
  return (
    <div style={{ ...card, fontSize: 13, color: "var(--accent)" }}>{children}</div>
  );
}

function InlineApproval({
  ready,
  reply,
  ticket,
  onApprove,
  onReject,
}: {
  ready: boolean;
  reply: string;
  ticket: string;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div style={card}>
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--warn)", marginBottom: 8 }}>
        ⚠ Human approval required
      </div>
      <div style={{ fontSize: 12.5, marginBottom: 8 }}>
        <strong>Public reply</strong>
        <div style={{ color: "var(--muted)", marginTop: 2, lineHeight: 1.45 }}>{reply}</div>
      </div>
      <div style={{ fontSize: 12.5, marginBottom: 10 }}>
        <strong>Internal ticket</strong>
        <div style={{ color: "var(--muted)", marginTop: 2, lineHeight: 1.45 }}>{ticket}</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button disabled={!ready} onClick={onApprove} style={btn("var(--accent)", "var(--accent-fg)", undefined, ready)}>
          Approve
        </button>
        <button disabled={!ready} onClick={onReject} style={btn("transparent", "var(--danger)", "var(--danger)", ready)}>
          Reject
        </button>
      </div>
    </div>
  );
}

const card: CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: 12,
  margin: "4px 0",
};

function btn(bg: string, fg: string, border: string | undefined, enabled: boolean): CSSProperties {
  return {
    background: bg,
    color: fg,
    border: border ? `1px solid ${border}` : 0,
    borderRadius: 8,
    padding: "6px 14px",
    fontSize: 12.5,
    fontWeight: 700,
    cursor: enabled ? "pointer" : "default",
    opacity: enabled ? 1 : 0.5,
    whiteSpace: "nowrap",
  };
}
