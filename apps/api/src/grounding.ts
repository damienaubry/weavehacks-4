/**
 * pnpm --filter @weavehacks/api grounding
 *
 * STEP 1 of the grounding eval: run the SAME producer with the SAME tools twice — solo (alone)
 * vs team (producer → mechanical Critic → one rewrite) — and report the grounding rate of each,
 * measured MECHANICALLY (claim values checked against captured tool results, no LLM judge).
 *
 * Spends a little W&B Inference credit (two producer runs). Traced in Weave.
 *
 * HONESTY GUARD: if the solo does not actually hallucinate (already 0 ungrounded claims), we STOP
 * and say so — the gap must be real, never faked.
 */

import { loadRootEnv } from "@weavehacks/shared";
import { initWeave } from "@weavehacks/observability";
import { runGroundingScenario, type GroundingRun } from "@weavehacks/agents";

loadRootEnv();

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

function printRun(label: string, r: GroundingRun): void {
  console.log(`  ${label.padEnd(14)} grounding ${pct(r.groundingRate).padStart(4)}   (${r.grounded}/${r.total} claims grounded · ${r.ungroundedCount} ungrounded)`);
  if (r.parseError) console.log(`      ⚠ producer JSON parse issue: ${r.parseError}`);
}

async function main() {
  await initWeave();

  console.log("\n=== GROUNDING EVAL · solo vs team (same model, same tools — only the Critic differs) ===");
  const cmp = await runGroundingScenario();

  console.log("");
  printRun("SOLO (alone)", cmp.solo);
  printRun("TEAM (+Critic)", cmp.team);

  // The blocked claims — what the Critic caught in the solo's draft.
  const blocked = cmp.solo.checks.filter((c) => !c.grounded);
  if (blocked.length) {
    console.log(`\n  Claims the mechanical Critic BLOCKED in the solo draft (${blocked.length}):`);
    for (const c of blocked) {
      console.log(`    ✗ "${c.claim}"  → stated ${JSON.stringify(c.statedValue)} (cited ${c.citedTool ?? "none"}); not in any tool result`);
    }
  }
  // What survived in the team output.
  const teamBlocked = cmp.team.checks.filter((c) => !c.grounded);
  if (cmp.rewrote) {
    console.log(`\n  After the rewrite, the team has ${teamBlocked.length} ungrounded claim(s).`);
    for (const c of teamBlocked) {
      console.log(`    ✗ "${c.claim}"  → stated ${JSON.stringify(c.statedValue)}`);
    }
  }

  const dRate = cmp.team.groundingRate - cmp.solo.groundingRate;
  const dUng = cmp.solo.ungroundedCount - cmp.team.ungroundedCount;
  console.log("\n=== RESULT ===");

  // BUILD GUARD — a side emitted no checkable claims (parse/format/transient failure, not a result).
  if (cmp.solo.total === 0 || (cmp.rewrote && cmp.team.total === 0)) {
    const which = cmp.solo.total === 0 ? "SOLO" : "TEAM (rewrite)";
    console.log(`  ⚠ BUILD ISSUE: ${which} emitted 0 parseable claims — a degenerate 100% is NOT a real result.`);
    if (cmp.team.parseError) console.log(`    team formatter error: ${cmp.team.parseError}`);
    console.log(`    Re-run; if it persists, fix the producer/formatter before interpreting.`);
    process.exit(1);
  }

  // HONESTY GUARD — the solo did not actually hallucinate (real claims, all grounded).
  if (cmp.solo.ungroundedCount === 0) {
    console.log(`  ⚠ HONESTY GUARD TRIPPED: the SOLO is already ${pct(cmp.solo.groundingRate)} grounded (0 ungrounded).`);
    console.log(`    There is NO real hallucination to catch on this task. STOP — make the task harder before claiming a gap.`);
    console.log("");
    process.exit(0);
  }

  console.log(`  solo grounding ${pct(cmp.solo.groundingRate)} (${cmp.solo.ungroundedCount} ungrounded)  →  team grounding ${pct(cmp.team.groundingRate)} (${cmp.team.ungroundedCount} ungrounded)`);
  console.log(`  delta: +${Math.round(dRate * 100)} grounding pts · ${dUng} fewer ungrounded claim(s)`);
  console.log(
    cmp.team.ungroundedCount === 0
      ? `  → TEAM grounds every claim — 0 hallucinations in approved output. Same model, same tools; the Critic is the only difference.`
      : `  → TEAM cuts ungrounded claims ${cmp.solo.ungroundedCount} → ${cmp.team.ungroundedCount}.`,
  );
  console.log("");
}

main().catch((e) => {
  console.error("[grounding] error:", e);
  process.exit(1);
});
