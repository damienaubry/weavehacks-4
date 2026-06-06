import { fileURLToPath } from "node:url";
import { loadRootEnv } from "@weavehacks/shared";
import { soloRun } from "./runners";

loadRootEnv();

// Run directly: `pnpm baseline` — the SOLO agent alone, so you can see it fail.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  soloRun()
    .then((r) => {
      console.log("\n=== BASELINE · solo agent ===");
      console.log(`score: ${(r.score * 100).toFixed(0)}%`);
      console.log("breakdown:");
      console.log(JSON.stringify(r.breakdown, null, 2));
      process.exit(0);
    })
    .catch((e) => {
      console.error("[baseline] error:", e);
      process.exit(1);
    });
}
