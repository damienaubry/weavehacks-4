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
  /** /recovery's Audit Copilot toggle (default ON). false unmounts the chat sidebar entirely. */
  auditMode: boolean;
  children: ReactNode;
}

/**
 * Audit Copilot system prompt — the owner's ADVISOR, not a gatekeeper. It proactively audits the
 * recovery package (gesture vs policy, claim grounding, forbidden gestures, ticket completeness) and
 * reasons about "what if I do X instead?" WITHOUT ever blocking — the owner has final authority. The
 * policy numbers here mirror packages/truth POLICY.gesture (15% / 10€ / forbidden gestures). Front-end
 * only; this prompt never touches the judged GRPR number.
 */
const AUDIT_COPILOT_INSTRUCTIONS = `You are the Audit Copilot for Le Kyoto, a Japanese restaurant near Paris.

ROLE: You are the restaurant owner's trusted advisor. You help them understand the recovery package BEFORE they approve it. You are NOT a gatekeeper — the owner has final authority. Your job is to inform, not to block.

WHEN RECOVERY DATA IS AVAILABLE, proactively audit the package:
1. Check the reply's gesture (credit %) against policy (max 15% or 10€ max)
2. Verify each claim in the reply is backed by evidence from the report
3. Confirm no forbidden gestures (free meals, full refunds, cash refunds, unlimited free delivery)
4. Verify the internal ticket is complete (severity + owner + action)

Present your audit as a short checklist with ✓ or ⚠️ for each point.

WHEN THE OWNER ASKS "what if I do X instead?":
- Explain the consequences (cost, policy compliance, grounding status)
- If it's outside policy: explain WHY it's outside, what the cost/risk is, and offer the closest policy-compliant alternative
- NEVER say "I can't let you do that" or "I can't approve that" — the owner is your boss
- Instead say: "That's outside the automated policy, here's what it means: [consequences]. Your call — want me to flag it as a manual override?"

TONE: Direct, concise, data-driven. Reference specific numbers from the policy and evidence. No fluff, no corporate speak. You're a smart colleague, not a customer service bot.

LANGUAGE: Respond in the same language the owner uses (English or French).

IMPORTANT: You only reference data from the recovery report exposed to you. Never invent facts, prices, or policy rules.`;

export function CopilotLayer(props: CopilotLayerProps) {
  return (
    // showDevConsole={false} disables CopilotKit's CopilotDevConsole. CopilotKit ALSO injects a
    // separate <cpk-web-inspector> web component that shows a "🪁 Big update: …" marketing banner in
    // dev — not gated by that prop. Both live at the document root (the inspector in a shadow DOM, so
    // we hide its light-DOM HOST element), hence GLOBAL selectors. Keeps the demo clean on a projector;
    // the chat sidebar (copilotKitButton / CopilotSidebar) is a different element and stays.
    <CopilotKit runtimeUrl="/api/copilotkit" showDevConsole={false}>
      <style>{`
        .copilotKitDevConsole, cpk-web-inspector { display: none !important; }

        /* Theme the CopilotKit chat to the /recovery dashboard palette: remap CopilotKit's own
           variables onto the dashboard's THEME-AWARE tokens (var(--panel)/--accent/…) so the chat
           tracks the dark/light toggle automatically — no duplicated light/dark blocks. Declared on
           the CopilotKit root containers, so they win over the library's :root defaults by
           inheritance proximity (not selector specificity / source order). */
        .copilotKitButton, .copilotKitSidebar, .copilotKitPopup, .copilotKitWindow {
          --copilot-kit-primary-color: var(--accent);
          --copilot-kit-contrast-color: var(--accent-fg);
          --copilot-kit-background-color: var(--panel);
          --copilot-kit-secondary-color: var(--chip);
          --copilot-kit-secondary-contrast-color: var(--text);
          --copilot-kit-separator-color: var(--border);
          --copilot-kit-muted-color: var(--muted);
          --copilot-kit-input-background-color: var(--chip);
          --copilot-kit-error-text: var(--danger);
        }
      `}</style>
      <CopilotBridge {...props} />
      {props.children}
      {/* Audit Copilot — gated behind the /recovery toggle (default ON). OFF unmounts the whole
          sidebar (button + panel) so the page is a clean fallback if the copilot misbehaves on stage.
          CopilotBridge's readable state + actions stay registered regardless; only the chat UI toggles. */}
      {props.auditMode && (
        <CopilotSidebar
          defaultOpen={false}
          clickOutsideToClose
          instructions={AUDIT_COPILOT_INSTRUCTIONS}
          labels={{
            title: "Audit Copilot",
            initial:
              "I audit the recovery package before you approve it. Try: “audit this package”, “what if I offer a free meal?”, or “run the brigade”.",
          }}
        />
      )}
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
