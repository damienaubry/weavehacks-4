import { fileURLToPath } from "node:url";
import { loadRootEnv } from "@weavehacks/shared";
import { initWeave } from "@weavehacks/observability";
import { soloRun, teamRun } from "./runners";

loadRootEnv();

const pct = (n: number) => `${((n as number) * 100).toFixed(0)}%`;

/**
 * The 3-minute demo, in text. The star is the moment the team CATCHES a contradiction
 * and resolves/escalates it — and the scoreboard proves it with a number.
 * (Deterministic stand-in scenario; gets swapped for the real Content → Critic hero
 * loop next — the harness stays identical.)
 */
export async function runDemo(): Promise<void> {
  await initWeave();

  console.log("\n──────────────────────────────────────────────────────────");
  console.log(" Brigade · multi-agent spine · stand-in demo scenario");
  console.log("──────────────────────────────────────────────────────────");

  const solo = await soloRun();
  console.log(`\n[1] SOLO agent (no roles, last-write-wins)`);
  console.log(`    score: ${pct(solo.score)}`);
  for (const [k, v] of Object.entries(solo.breakdown as Record<string, string>)) {
    if (v.startsWith("WRONG")) console.log(`    ✗ ${k}: ${v}`);
  }

  const team = await teamRun();
  console.log(`\n[2] AGENT TEAM (distinct roles + verifier + conflict resolution)`);
  const resolutions = (team.resolutions ?? []) as Array<Record<string, unknown>>;
  for (const r of resolutions) {
    if (r.status === "resolved") {
      console.log(`    ✔ conflict on ${r.key}: resolved → '${r.value}' (${r.reason})`);
    } else {
      console.log(`    ⚠ conflict on ${r.key}: ESCALATED to human — ${r.reason}`);
    }
  }
  console.log(`    score: ${pct(team.score)}`);

  const delta = (team.score as number) - (solo.score as number);
  console.log(`\n[3] THE NUMBER`);
  console.log(`    solo ${pct(solo.score)}  →  team ${pct(team.score)}   (delta ${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(0)} pts)`);
  console.log("    ^ this is what gets judged. Swap in the real Content → Critic hero");
  console.log("      loop next — the harness (compareSoloVsTeam) stays identical.\n");
}

// Run directly: `pnpm demo`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runDemo()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error("[demo] error:", e);
      process.exit(1);
    });
}
