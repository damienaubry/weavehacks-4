import { fileURLToPath } from "node:url";
import { loadRootEnv } from "@weavehacks/shared";
import { runToolAgent, describeRuntime, type ToolSpec } from "@weavehacks/runtime";

loadRootEnv();

/**
 * Smoke test: does the configured runtime model actually do PARAMETERIZED tool-calling
 * over W&B Inference? Defines one trivial tool and checks the agent calls it with the
 * right args and uses the result. Run before building the real Brigade agents on top.
 * Spends a tiny bit of credit.
 */
async function main() {
  const rt = describeRuntime();
  if (rt.default === "wandb" && !rt.wandbConfigured) {
    console.log("[tool-check] WANDB_API_KEY not set — add it to .env.");
    process.exit(1);
  }
  console.log(`[tool-check] provider=${rt.default} model=${rt.wandbModel}\n`);

  const fakeOrders: ToolSpec = {
    name: "get_friday_orders",
    description: "Return the historical order count for a given dish on Fridays.",
    parameters: {
      type: "object",
      properties: {
        dish: { type: "string", description: "dish name, e.g. 'gyoza'" },
      },
      required: ["dish"],
      additionalProperties: false,
    },
    execute: ({ dish }: { dish: string }) => {
      const table: Record<string, number> = { gyoza: 31, "shoyu ramen": 15, "tonkotsu ramen": 23 };
      return { dish, avgFridayQty: table[dish.toLowerCase()] ?? 0 };
    },
  };

  const res = await runToolAgent({
    name: "ToolSmokeTest",
    role: "historian",
    instructions:
      "You are a restaurant demand analyst. Use the provided tool to fetch real numbers. " +
      "Never guess a quantity — always call the tool. Answer in one sentence.",
    input: "How many gyoza do we usually sell on a Friday?",
    tools: [fakeOrders],
    onToolCall: (rec) => console.log(`  ↳ tool ${rec.name}(${JSON.stringify(rec.args)}) → ${JSON.stringify(rec.result)}`),
  });

  console.log(`\nfinal answer: ${res.text}`);
  console.log(`tool calls  : ${res.toolCalls.length} (steps: ${res.steps})`);
  const ok = res.toolCalls.some((c) => c.name === "get_friday_orders");
  console.log(ok ? "\n✓ tool-calling works on this model" : "\n✗ model did NOT call the tool — try another model id");
  process.exit(ok ? 0 : 2);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error("[tool-check] error:", e);
    process.exit(1);
  });
}
