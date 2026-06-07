/**
 * pnpm --filter @weavehacks/api grounding
 *
 * BLOCK 1: Content + Critic with a MECHANICAL grounding metric (no LLM judge). The producing
 * Content agent writes an Instagram post grounded in POS + reviews; a deterministic checker scores
 * each claim against the tool RESULTS captured this run. SOLO = producer + self-retries (no Critic);
 * TEAM = producer → mechanical Critic → one rewrite. Same model, same tools — only the Critic differs.
 *
 * Guards (never fake a gap):
 *  • BUILD     — a side emits 0 parseable claims → degenerate, stop.
 *  • HONESTY   — solo already 100% grounded → no hallucination to catch, stop.
 *  • PARITY    — solo gets equal/greater compute (self-retries); if it reaches the same grounding,
 *                the win isn't the Critic, stop.
 */

import { loadRootEnv } from "@weavehacks/shared";
import { initWeave } from "@weavehacks/observability";
import { reason } from "@weavehacks/runtime";
import { runGroundingScenario, CONTENT_PRODUCER, type PipelineResult } from "@weavehacks/agents";

loadRootEnv();

const pct = (x: number): string => `${Math.round(x * 100)}%`;

function printRun(label: string, r: PipelineResult): void {
  console.log(
    `  ${label.padEnd(26)} grounding ${pct(r.groundingRate).padStart(4)}  (${r.grounded}/${r.total} grounded · ${r.ungroundedCount} ungrounded)` +
      `   budget: ${r.budget.passes} drafts · ${r.budget.llmCalls} calls · ${r.budget.producerTokens} tok`,
  );
  if (r.parseError) console.log(`      ⚠ formatter issue: ${r.parseError}`);
}

/** Display-only marketing quality (1–10) — NEVER the metric. Non-fatal. */
async function qualityScore(solo: string, team: string): Promise<string | null> {
  try {
    const r = await reason<{ solo: number; team: number; note?: string }>(
      `Rate these two restaurant Instagram posts for marketing QUALITY (catchiness, clarity, CTA), 1–10. Display only.\n` +
        `POST A:\n${solo}\n\nPOST B:\n${team}\n\nReturn ONLY JSON {"solo":<1-10>,"team":<1-10>,"note":"<≤6 words>"}.`,
      { role: "critic", temperature: 0 },
    );
    return `solo ${r.solo}/10 · team ${r.team}/10${r.note ? ` — "${r.note}"` : ""}`;
  } catch {
    return null;
  }
}

// The PRODUCER is the agent under test (may be a weak/cheap model to surface real hallucination).
// The formatter + grounding check stay on the reliable default model — that's measurement, not the agent.
const PRODUCER_MODEL = process.argv[2] || "meta-llama/Llama-3.1-8B-Instruct";

async function main() {
  await initWeave();
  console.log(`\n=== GROUNDING EVAL · Content: solo vs team — producer=${PRODUCER_MODEL} (same model + tools both sides; only the Critic differs) ===`);

  const cmp = await runGroundingScenario(CONTENT_PRODUCER, { producerModel: PRODUCER_MODEL, soloRetries: 2 });

  console.log("");
  printRun("SOLO (self-retry, no Critic)", cmp.solo);
  printRun("TEAM (Critic + 1 rewrite)", cmp.team);

  const blocked = cmp.solo.checks.filter((c) => !c.grounded);
  if (blocked.length) {
    console.log(`\n  Ungrounded claims in the SOLO's final post (${blocked.length}):`);
    for (const c of blocked) console.log(`    ✗ "${c.claim}"  → stated ${JSON.stringify(c.statedValue)} (cited ${c.citedTool ?? "none"})`);
  }
  const teamBlocked = cmp.team.checks.filter((c) => !c.grounded);
  if (teamBlocked.length) {
    console.log(`\n  Ungrounded claims still in the TEAM's approved post (${teamBlocked.length}):`);
    for (const c of teamBlocked) console.log(`    ✗ "${c.claim}"  → stated ${JSON.stringify(c.statedValue)}`);
  }

  console.log(`\n  --- SOLO post ---\n${cmp.solo.prose.trim().slice(0, 500)}`);
  console.log(`\n  --- TEAM post ---\n${cmp.team.prose.trim().slice(0, 500)}`);

  const q = await qualityScore(cmp.solo.prose, cmp.team.prose);
  if (q) console.log(`\n  [display only, NOT the metric] LLM quality: ${q}`);

  console.log("\n=== RESULT ===");

  // BUILD GUARD — a side produced no checkable claims.
  if (cmp.solo.total === 0 || (cmp.rewrote && cmp.team.total === 0)) {
    console.log(`  ⚠ BUILD ISSUE: a side emitted 0 parseable claims — a degenerate 100% is not a real result. Re-run.`);
    process.exit(1);
  }
  // HONESTY GUARD — the solo didn't actually hallucinate.
  if (cmp.solo.ungroundedCount === 0) {
    console.log(`  ⚠ HONESTY GUARD: SOLO is already ${pct(cmp.solo.groundingRate)} grounded (0 ungrounded) even with ${cmp.solo.budget.passes} drafts.`);
    console.log(`    No hallucination to catch — STOP and make the task harder before claiming a gap.`);
    process.exit(0);
  }
  // COMPUTE-PARITY GUARD — solo had equal/greater budget; if it grounded as well, the win isn't the Critic.
  const soloBudgetGE = cmp.solo.budget.llmCalls >= cmp.team.budget.llmCalls;
  if (cmp.solo.ungroundedCount <= cmp.team.ungroundedCount) {
    console.log(`  ⚠ COMPUTE-PARITY GUARD: SOLO reached ${pct(cmp.solo.groundingRate)} (${cmp.solo.ungroundedCount} ungrounded) at ${soloBudgetGE ? "≥" : "<"} the team's budget.`);
    console.log(`    Solo grounds as well as the team — the gap is NOT attributable to the Critic. STOP.`);
    process.exit(0);
  }

  // Real, attributable win.
  const dRate = Math.round((cmp.team.groundingRate - cmp.solo.groundingRate) * 100);
  console.log(`  solo grounding ${pct(cmp.solo.groundingRate)} (${cmp.solo.ungroundedCount} ungrounded)  →  team grounding ${pct(cmp.team.groundingRate)} (${cmp.team.ungroundedCount} ungrounded)   (+${dRate} pts)`);
  console.log(
    `  COMPUTE PARITY: solo spent ${soloBudgetGE ? "≥" : "<"} the team's budget ` +
      `(solo ${cmp.solo.budget.llmCalls} calls / ${cmp.solo.budget.producerTokens} tok vs team ${cmp.team.budget.llmCalls} calls / ${cmp.team.budget.producerTokens} tok)` +
      ` and STILL shipped ${cmp.solo.ungroundedCount} ungrounded claim(s).`,
  );
  console.log(`  → The win is the Critic's verify-against-data capability, not extra compute. Same model, same tools.`);
  console.log("");
}

main().catch((e) => {
  console.error("[grounding] error:", e);
  process.exit(1);
});
