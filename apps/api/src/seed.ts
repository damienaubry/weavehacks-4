import { fileURLToPath } from "node:url";
import { loadRootEnv } from "@weavehacks/shared";
import { TRUTH } from "@weavehacks/truth";
import { seedSummary } from "@weavehacks/seed";

loadRootEnv();

/**
 * Load + validate the curated seed slice and canon. No LLM, no credits — this is the
 * "is our demo data present and well-shaped?" check that start.sh runs. The grounding
 * stat it prints (% of 5★ reviews mentioning the broth) is the number the Critic loop
 * leans on in the hero demo.
 */
export function checkSeed() {
  const s = seedSummary();
  const menuItems = TRUTH.menu.length;
  const availableItems = TRUTH.menu.filter((m) => m.available).length;
  return { menuItems, availableItems, ...s };
}

// Run directly: `pnpm seed`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = checkSeed();
  console.log("\n=== SEED SLICE · Le Kyoto (curated demo data) ===");
  console.log(`canon menu items : ${r.menuItems} (${r.availableItems} available)`);
  console.log(`POS orders       : ${r.orders}`);
  console.log(`reviews          : ${r.reviews}`);
  console.log(`weather days     : ${r.weatherDays}`);
  console.log(`grounding stat   : ${r.pctFiveStarMentionBroth}% of 5★ reviews mention the broth`);
  const ok = r.menuItems > 0 && r.orders > 0 && r.reviews > 0;
  console.log(ok ? "\n✓ seed slice loaded" : "\n✗ seed slice incomplete — fill packages/seed + packages/truth");
  process.exit(ok ? 0 : 1);
}
