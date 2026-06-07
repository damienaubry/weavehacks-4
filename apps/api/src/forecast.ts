/**
 * pnpm --filter @weavehacks/api forecast            → backtest the naive baseline
 * pnpm --filter @weavehacks/api forecast friday dinner ["Maki Saumon (6 pièces)"]
 *                                                    → one-off "how many of X?" prediction
 *
 * Deterministic, NO LLM, NO credits. Loads the operator's POS JSON, splits year-1 (visible)
 * from years 2–3 (hidden), and reports the error of the SOLO baseline on the hidden future.
 * That error is the number the coordinated team must beat.
 */

import { loadServiceRecords, splitTrainHoldout } from "@weavehacks/seed";
import { naiveForecast, contextForecast, backtest } from "@weavehacks/agents";

const [, , dayArg, serviceArg, productArg] = process.argv;

const { records, path, found } = loadServiceRecords();

if (!found || records.length === 0) {
  console.log("\n=== FORECAST ===");
  console.log(found ? `Loaded 0 usable records from ${path}.` : `No POS data file at ${path}.`);
  console.log("Drop the operator's JSON (an array of service records) there, or set POS_DATA_PATH.\n");
  process.exit(0);
}

const { train, holdout, splitDate } = splitTrainHoldout(records);
console.log("\n=== FORECAST DATA ===");
console.log(`source:   ${path}`);
console.log(`records:  ${records.length}  (${records[0].date} → ${records[records.length - 1].date})`);
console.log(`split:    train < ${splitDate} ≤ holdout   →   train ${train.length} · holdout ${holdout.length}`);

// One-off prediction mode: `forecast friday dinner ["product"]`
if (dayArg && serviceArg) {
  const f = naiveForecast(train, { day: dayArg.toLowerCase(), service: serviceArg.toLowerCase(), product: productArg });
  console.log(`\n=== PREDICTION — ${dayArg} ${serviceArg}${productArg ? ` · ${productArg}` : ""} ===`);
  for (const p of f.predictions.slice(0, productArg ? 1 : 15)) {
    console.log(`  ${String(p.predicted).padStart(5)}  ${p.product}`);
  }
  console.log(`\nwhy: ${f.why}\n`);
  process.exit(0);
}

// Backtest mode: score the baseline on the hidden holdout.
if (holdout.length === 0) {
  console.log("\nNo holdout services yet (need >1 year of data to score the future).\n");
  process.exit(0);
}

const solo = backtest(train, holdout, naiveForecast, "naive (solo)");
const team = backtest(train, holdout, contextForecast, "contextual (team)");

const dSmape = solo.totalItemsSMAPE - team.totalItemsSMAPE; // >0 = team better
const dMae = Math.round((solo.totalItemsMAE - team.totalItemsMAE) * 10) / 10;
const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

console.log("\n=== BACKTEST — solo vs team on the hidden future (same split, same scoring) ===");
console.log(`  holdout services:  ${solo.holdoutServices}   (train ${solo.trainServices})`);
console.log("");
console.log("  forecaster              sMAPE      total-MAE     product-MAE");
console.log(`  naive   (SOLO)          ${String(solo.totalItemsSMAPE).padStart(3)}%        ${String(solo.totalItemsMAE).padStart(5)}         ${solo.productMAE}`);
console.log(`  context (TEAM)          ${String(team.totalItemsSMAPE).padStart(3)}%        ${String(team.totalItemsMAE).padStart(5)}         ${team.productMAE}`);
console.log("");
console.log(`  delta (solo − team):    sMAPE ${sign(dSmape)} pts    ·    total-MAE ${sign(dMae)}`);
console.log(
  dSmape > 0
    ? `  → TEAM beats SOLO by ${dSmape} sMAPE pts.`
    : dSmape === 0
      ? `  → TIE on sMAPE (check total-MAE for sub-point movement).`
      : `  → TEAM is WORSE than SOLO by ${-dSmape} sMAPE pts.`,
);
console.log("");
