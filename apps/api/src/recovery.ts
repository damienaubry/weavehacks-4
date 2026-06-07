/**
 * pnpm recovery  (and GET /recovery)
 *
 * THE judged scoreboard for the pivot: Grounded Recovery Pass Rate (GRPR), solo vs team vs
 * team+memory, over the review-recovery dataset — same model + tools on all three, only the
 * orchestration differs.
 *
 * ⚠️ PHASE 0 STUB. This returns a typed `RecoveryReport` with PLACEHOLDER numbers so the API,
 * the CLI and the front-end (WS-E) all have a real, stable endpoint to build against from minute
 * one. WS-C replaces `runRecovery()` with the real harness:
 *   • run each variant over RECOVERY_CASES (WS-A dataset, WS-B agents)
 *   • score each case with scoreCase() → CaseScore (mechanical grounding via checkGrounding)
 *   • assert COMPUTE PARITY (reuse the Budget guards from grounding.ts)
 *   • trace every case + check as a Weave op
 * Keep the RETURN SHAPE (`RecoveryReport`) identical — the front-end depends on it.
 */
import { fileURLToPath } from "node:url";
import { loadRootEnv } from "@weavehacks/shared";
import { RECOVERY_CASES } from "@weavehacks/seed";
import type { RecoveryReport } from "@weavehacks/agents";

loadRootEnv();

export async function runRecovery(): Promise<RecoveryReport> {
  const realCount = RECOVERY_CASES.filter((c) => c.source === "real").length;
  const syntheticCount = RECOVERY_CASES.length - realCount;

  // PLACEHOLDER numbers — shaped like the real result so the front-end renders correctly.
  // WS-C overwrites this whole body with the live harness.
  return {
    placeholder: true,
    dataset: { n: RECOVERY_CASES.length, realCount, syntheticCount },
    rows: [
      { variant: "solo", grpr: 0.38, budgetTokens: 18400, budgetCalls: 11 },
      { variant: "team", grpr: 0.71, budgetTokens: 17900, budgetCalls: 10 },
      { variant: "team+memory", grpr: 0.83, budgetTokens: 18050, budgetCalls: 10 },
    ],
    sampleCase: {
      id: "rc-demo-1",
      review:
        "Commande livrée 50 min en retard et le ramen tonkotsu était froid à l'arrivée. Dommage, d'habitude c'est très bon.",
      incidentTypeGold: "delivery_late",
      solo: {
        reply:
          "Navrés ! Nos livreurs sont chez vous en moins de 20 min en moyenne. Pour nous faire pardonner : remboursement intégral + un repas offert.",
        pass: false,
        failReasons: [
          "triage: 'other' (≠ delivery_late)",
          "claim non soutenue: « < 20 min en moyenne »",
          "politique: sur-promesse 'repas offert'",
          "ticket interne: absent",
        ],
      },
      team: {
        reply:
          "Désolés pour ce retard de livraison et le ramen tiède — ce n'est pas notre standard. On vous applique un avoir de 15% sur votre prochaine commande, conforme à notre politique. Merci pour votre fidélité.",
        pass: true,
      },
      memoryReuse: { failureCardId: "FC-07", tag: "over_promise_refund" },
    },
  };
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

// Run directly: `pnpm recovery`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runRecovery()
    .then((r) => {
      console.log(`\n=== GRPR SCOREBOARD · review-recovery ${r.placeholder ? "(PLACEHOLDER — WS-C wires the real harness)" : ""} ===`);
      console.log(`dataset : ${r.dataset.n} cases (${r.dataset.realCount} real · ${r.dataset.syntheticCount} synthetic)\n`);
      for (const row of r.rows) {
        console.log(`  ${row.variant.padEnd(13)} GRPR ${pct(row.grpr).padStart(4)}   budget ${row.budgetTokens} tok · ${row.budgetCalls} calls`);
      }
      console.log(`\n  parity: same model + tools on all three; only the orchestration (Verifier / memory) differs.`);
      process.exit(0);
    })
    .catch((e) => {
      console.error("[recovery] error:", e);
      process.exit(1);
    });
}
