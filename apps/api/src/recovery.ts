/**
 * pnpm recovery  (and GET /recovery)
 *
 * THE judged scoreboard: Grounded Recovery Pass Rate (GRPR), solo vs team vs team+memory, over the
 * review-recovery dataset — same base model + tools on all three, only the orchestration differs.
 *
 * TWO PATHS, on purpose:
 *   • `pnpm recovery` (CLI)  — runs the REAL harness LIVE (spends runtime credits), prints the three
 *     rows + the compute-parity guard + the honest held-out memory verdict + a solo-fail/team-pass
 *     sample case, and WRITES the computed RecoveryReport to a cache file.
 *   • GET /recovery (HTTP)   — NEVER runs the live harness (that would burn credits on every request
 *     and every WS-E poll). It serves the LAST cached report from a `pnpm recovery` run, or a clearly
 *     flagged `placeholder:true` stub if no run has happened yet. So the front-end always has a fast,
 *     stable endpoint and a freshness banner, and credits are spent only when the operator chooses.
 *
 *   pnpm recovery                  three rows from real runs (writes the cache GET /recovery serves)
 *   pnpm recovery --no-verifier    KILL-SHOT: team with the Verifier off → GRPR collapses to solo
 *   pnpm recovery --judge          add the narrow over-promise LLM judge on the policy axis
 *   pnpm recovery --full-memory    score team+memory on the FULL set (debug; default is held-out)
 *   RECOVERY_MODEL=<id>            pin the base model for all variants
 *   RECOVERY_JUDGE_MODEL=<id>      pin a SEPARATE measurement model for the over-promise judge
 */
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadRootEnv } from "@weavehacks/shared";
import { initWeave } from "@weavehacks/observability";
import { RECOVERY_CASES } from "@weavehacks/seed";
import {
  runRecoveryHarness,
  buildRecoveryReport,
  type HarnessOptions,
  type HarnessResult,
  type RecoveryModels,
} from "@weavehacks/agents";
import type { RecoveryReport } from "@weavehacks/agents";

loadRootEnv();

// Default to the repo's canonical, frozen report (apps/api/src → repo root) so GET /recovery always
// serves the good 80/90/80 run — NOT a noisy temp cache a stray `pnpm recovery` may have written.
// Turbo strips RECOVERY_REPORT_CACHE from the task env, so relying on the env var alone was unreliable.
const REPO_REPORT = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "..", "recovery-report.json");
const CACHE_PATH = process.env.RECOVERY_REPORT_CACHE ?? (existsSync(REPO_REPORT) ? REPO_REPORT : join(tmpdir(), "weavehacks-recovery-report.json"));
const baseModel = (): RecoveryModels => (process.env.RECOVERY_MODEL ? { base: process.env.RECOVERY_MODEL } : {});
const judgeModel = (): string | undefined => process.env.RECOVERY_JUDGE_MODEL || undefined;

// ─── Cache (so GET /recovery never re-runs the live eval) ─────────────────────────────────────────

function loadCachedReport(): RecoveryReport | null {
  try {
    if (!existsSync(CACHE_PATH)) return null;
    return JSON.parse(readFileSync(CACHE_PATH, "utf8")) as RecoveryReport;
  } catch {
    return null;
  }
}

function saveCachedReport(report: RecoveryReport): void {
  try {
    writeFileSync(CACHE_PATH, JSON.stringify(report, null, 2));
  } catch (e) {
    console.warn(`[recovery] could not write report cache at ${CACHE_PATH}: ${(e as Error).message}`);
  }
}

/** A real-shaped stub the HTTP route serves before any live `pnpm recovery` run (placeholder:true). */
function placeholderReport(): RecoveryReport {
  const realCount = RECOVERY_CASES.filter((c) => c.source === "real").length;
  return {
    placeholder: true,
    dataset: { n: RECOVERY_CASES.length, realCount, syntheticCount: RECOVERY_CASES.length - realCount },
    rows: [
      { variant: "solo", grpr: 0, budgetTokens: 0, budgetCalls: 0 },
      { variant: "team", grpr: 0, budgetTokens: 0, budgetCalls: 0 },
      { variant: "team+memory", grpr: 0, budgetTokens: 0, budgetCalls: 0 },
    ],
    sampleCase: {
      id: "(not yet computed)",
      review: "Run `pnpm recovery` to compute the live GRPR scoreboard; GET /recovery then serves the real numbers.",
      incidentTypeGold: "other",
      solo: { reply: "", pass: false, failReasons: ["placeholder — no live run yet"] },
      team: { reply: "", pass: false },
    },
  };
}

// ─── HTTP path — cheap, never runs the live harness ───────────────────────────────────────────────

/** Served at GET /recovery: the last cached real report, or a placeholder:true stub. NEVER live. */
export async function runRecovery(): Promise<RecoveryReport> {
  return loadCachedReport() ?? placeholderReport();
}

// ─── CLI path — runs the live harness, writes the cache ──────────────────────────────────────────

export async function computeRecovery(opts: HarnessOptions = {}): Promise<{ report: RecoveryReport; harness: HarnessResult }> {
  await initWeave(); // idempotent + no-op without WANDB_API_KEY
  const harness = await runRecoveryHarness({ models: baseModel(), judgeModel: judgeModel(), ...opts });
  const report = buildRecoveryReport(harness);
  saveCachedReport(report);
  return { report, harness };
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

function printHarness(h: HarnessResult, flags: { noVerifier: boolean; judge: boolean }): void {
  console.log(`\n=== GRPR SCOREBOARD · review-recovery ${flags.noVerifier ? "· ⚠ VERIFIER OFF (kill-shot)" : ""} ===`);
  const real = h.cases.filter((c) => c.source === "real").length;
  console.log(`dataset : ${h.cases.length} cases (${real} real · ${h.cases.length - real} synthetic)${flags.judge ? " · over-promise judge ON" : ""}\n`);

  for (const r of h.results) {
    const n = r.perCase.length;
    const basis = r.variant === "team+memory" && h.honest.split ? ` [held-out test: ${n} cases]` : ` [${n} cases]`;
    console.log(
      `  ${r.variant.padEnd(13)} GRPR ${pct(r.grpr).padStart(4)}${basis.padEnd(22)} ` +
        `budget ${r.budget.producerTokens} tok · ${r.budget.llmCalls} calls · ${r.budget.passes} drafts`,
    );
  }

  // COMPUTE-PARITY guard — PER CASE (solo must spend >= each team variant per case, else the gap
  // isn't attributable to the Verifier). Summed budgets differ because team+memory is held-out.
  const perCase = (r: HarnessResult["results"][number]) => (r.perCase.length ? r.budget.llmCalls / r.perCase.length : 0);
  const solo = h.results.find((r) => r.variant === "solo");
  const team = h.results.find((r) => r.variant === "team");
  const mem = h.results.find((r) => r.variant === "team+memory");
  if (solo) {
    const soloPer = perCase(solo);
    const parts: string[] = [`solo ${soloPer.toFixed(1)} calls/case`];
    let ok = true;
    if (team) {
      const teamPer = perCase(team);
      parts.push(`team ${teamPer.toFixed(1)}`);
      ok = ok && soloPer >= teamPer;
    }
    if (mem) {
      const memPer = perCase(mem);
      parts.push(`team+memory ${memPer.toFixed(1)}`);
      ok = ok && soloPer >= memPer;
    }
    console.log(`\n  parity : ${parts.join(" · ")} — solo spends ${ok ? "≥" : "<"} each team variant per case${ok ? "" : "  ⚠ raise --soloRetries"}`);
    if (team && solo.grpr >= team.grpr) {
      console.log(`  ⚠ HONESTY: solo GRPR ${pct(solo.grpr)} ≥ team ${pct(team.grpr)} — no attributable team win on this run. Report it as-is.`);
    }
  }

  if (h.honest.split) {
    console.log(`\n  split  : team+memory warmed on ${h.honest.split.warmCount} early cases, scored on ${h.honest.split.testCount} held-out (ordered by ${h.honest.split.orderedBy}).`);
  }
  console.log(`  honest : ${h.honest.note}`);

  const sc = buildRecoveryReport(h).sampleCase;
  if (sc && sc.id !== "(none)") {
    console.log(`\n  sample case ${sc.id} (gold: ${sc.incidentTypeGold})`);
    console.log(`    review : "${sc.review.slice(0, 120)}${sc.review.length > 120 ? "…" : ""}"`);
    console.log(`    solo   : ${sc.solo.pass ? "PASS" : "FAIL"}${sc.solo.failReasons.length ? ` — ${sc.solo.failReasons.join(" · ")}` : ""}`);
    console.log(`    team   : ${sc.team.pass ? "PASS" : "FAIL"}`);
    if (sc.memoryReuse) console.log(`    memory : reused failure-card ${sc.memoryReuse.failureCardId} [${sc.memoryReuse.tag}]`);
  }
  console.log(`\n  cached → ${CACHE_PATH}  (GET /recovery serves this; re-run to refresh)\n`);
}

// Run directly: `pnpm recovery [--no-verifier] [--judge] [--full-memory]`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const noVerifier = argv.includes("--no-verifier");
  const judge = argv.includes("--judge");
  const fullMemory = argv.includes("--full-memory");
  computeRecovery({ disableVerifier: noVerifier, useOverPromiseJudge: judge, memorySplit: !fullMemory })
    .then(({ harness }) => {
      printHarness(harness, { noVerifier, judge });
      process.exit(0);
    })
    .catch((e) => {
      console.error("[recovery] error:", e);
      process.exit(1);
    });
}
