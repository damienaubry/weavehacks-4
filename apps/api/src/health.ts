import { fileURLToPath } from "node:url";
import { createRedis, loadRootEnv } from "@weavehacks/shared";
import { initWeave, traced } from "@weavehacks/observability";
import { describeRuntime } from "@weavehacks/runtime";

loadRootEnv();

export interface HealthReport {
  ok: boolean;
  redis: { ok: boolean; pong?: string; error?: string };
  weave: { ok: boolean; skipped?: boolean; traced?: boolean; msg?: string; note?: string; error?: string };
  runtime: ReturnType<typeof describeRuntime>;
}

/** Redis ping + Weave hello-world. `ok` is gated on Redis (core infra); a missing
 *  WANDB key degrades Weave to a warning so a mid-setup teammate isn't blocked. */
export async function healthReport(): Promise<HealthReport> {
  const report: HealthReport = {
    ok: true,
    redis: { ok: false },
    weave: { ok: false },
    runtime: describeRuntime(),
  };

  // ── Redis ──
  try {
    const r = createRedis();
    const pong = await r.ping();
    report.redis = { ok: pong === "PONG", pong };
    if (pong !== "PONG") report.ok = false;
    await r.quit();
  } catch (e) {
    report.redis = { ok: false, error: (e as Error).message };
    report.ok = false;
  }

  // ── Weave hello-world ──
  try {
    const client = await initWeave();
    if (!client) {
      report.weave = { ok: false, skipped: true, note: "WANDB_API_KEY not set — tracing disabled" };
    } else {
      const hello = traced("health.hello", async (name: string) => `hello, ${name}`);
      const msg = await hello("weave");
      report.weave = { ok: true, traced: true, msg };
    }
  } catch (e) {
    report.weave = { ok: false, error: (e as Error).message };
  }

  return report;
}

// Run directly: `pnpm --filter @weavehacks/api health`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  healthReport()
    .then((r) => {
      console.log("\n=== HEALTH ===");
      console.log(JSON.stringify(r, null, 2));
      console.log(
        `\nredis: ${r.redis.ok ? "OK" : "FAIL"} · weave: ${
          r.weave.ok ? "OK" : r.weave.skipped ? "skipped (no key)" : "FAIL"
        } · runtime: ${r.runtime.openaiConfigured ? "openai key set" : "no openai key"}`,
      );
      process.exit(r.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error("[health] unexpected error:", e);
      process.exit(1);
    });
}
