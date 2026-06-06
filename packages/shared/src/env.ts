import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Load the monorepo-root .env regardless of which package the script runs from.
 * Walks up from cwd looking for pnpm-workspace.yaml, then loads the .env beside it.
 */
export function loadRootEnv(): void {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) {
      config({ path: join(dir, ".env") });
      return;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  config(); // fallback: cwd/.env
}
