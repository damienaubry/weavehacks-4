import { fileURLToPath } from "node:url";
import { loadRootEnv } from "@weavehacks/shared";
import { initWeave } from "@weavehacks/observability";
import { describeRuntime } from "@weavehacks/runtime";
import { runFridayPrep, type DiscussionTurn } from "@weavehacks/agents";

loadRootEnv();

/**
 * Watch the Brigade starting team discuss a "prep for Friday" turn, live.
 * Chef -> Historian + Scout -> Historian refines -> Prep reconciles -> Chef presents.
 * Spends W&B Inference credit (real LLM agents). Every turn + tool call is traced in Weave.
 */
export async function runPrep(date?: string): Promise<void> {
  await initWeave();
  const rt = describeRuntime();
  if (rt.default === "wandb" && !rt.wandbConfigured) {
    console.log("[prep] WANDB_API_KEY not set — add it to .env (https://wandb.ai/authorize).");
    process.exit(1);
  }
  console.log(`(${rt.default} · ${rt.wandbModel})`);

  const printTurn = (t: DiscussionTurn) => {
    console.log(`\n──────── ${t.speaker} — ${t.note} ────────`);
    for (const c of t.toolCalls) console.log(`  ↳ ${c.name}(${JSON.stringify(c.args)})`);
    console.log(t.text.trim());
  };

  console.log("\n══════════════════════════════════════════════════════════");
  console.log(" Brigade · Friday prep discussion (starting team)");
  console.log("══════════════════════════════════════════════════════════");

  const result = await runFridayPrep({ date, onTurn: printTurn });

  console.log("\n══════════════════════════════════════════════════════════");
  console.log(` Final plan for ${result.weekday} ${result.date}`);
  console.log("══════════════════════════════════════════════════════════");
  console.log(result.presentation.trim());
  console.log("\n(full trace in Weave)\n");
}

// Run directly: `pnpm prep [YYYY-MM-DD]`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const date = process.argv[2];
  runPrep(date)
    .then(() => process.exit(0))
    .catch((e) => {
      console.error("[prep] error:", e);
      process.exit(1);
    });
}
