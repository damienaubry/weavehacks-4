import { fileURLToPath } from "node:url";
import { loadRootEnv } from "@weavehacks/shared";
import { compareSoloVsTeam } from "@weavehacks/observability";
import type { Scoreboard } from "@weavehacks/shared";
import { soloRun, teamRun } from "./runners";

loadRootEnv();

/** Run the scoreboard: same scenario, solo vs team, numeric delta — traced in Weave. */
export async function runCompare(): Promise<Scoreboard> {
  return compareSoloVsTeam({ name: "brigade-standin", solo: soloRun, team: teamRun });
}

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

// Run directly: `pnpm compare`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCompare()
    .then((b) => {
      console.log("\n=== SCOREBOARD · solo vs team ===");
      console.log(`scenario : ${b.name}  (deterministic stand-in — swap in the Content → Critic hero loop)`);
      console.log(`solo     : ${pct(b.solo)}`);
      console.log(`team     : ${pct(b.team)}`);
      console.log(`delta    : ${b.delta >= 0 ? "+" : ""}${(b.delta * 100).toFixed(0)} points (team − solo)`);
      process.exit(0);
    })
    .catch((e) => {
      console.error("[compare] error:", e);
      process.exit(1);
    });
}
