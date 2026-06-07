/**
 * CopilotKit self-hosted runtime — the ONLY server code the web layer needs, and it's a Next.js
 * route handler (pure front-end-app concern), NOT the proof engine. The judged GRPR harness lives
 * in `apps/api` on the direct-call orchestrator and is never touched here.
 *
 * The OpenAI client is built LAZILY inside the handler: with no key configured the page + the
 * CopilotKit provider still render (the provider only calls this route when the user sends a chat
 * message). With a key, the live assistant works. Point it at W&B Inference (OpenAI-compatible) or
 * any OpenAI-compatible endpoint via OPENAI_BASE_URL + COPILOT_MODEL.
 */
import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import OpenAI from "openai";
import type { NextRequest } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ENDPOINT = "/api/copilotkit";

/**
 * Next doesn't auto-load the monorepo-root `.env` (it only reads apps/web/.env*), so the runtime
 * key the rest of the project configures there is invisible here — which makes CopilotKit's runtime
 * probe 503 and spam the console. Pull the relevant keys from the root `.env` once, WITHOUT a new
 * dependency or coupling to a server package, and only if they aren't already set. No `.env` / no
 * key ⇒ we fall through to the graceful 503 below and the page still renders.
 */
let rootEnvLoaded = false;
function ensureRootEnv(): void {
  if (rootEnvLoaded) return;
  rootEnvLoaded = true;
  if (process.env.OPENAI_API_KEY || process.env.COPILOT_API_KEY) return;
  const WANTED = ["OPENAI_API_KEY", "COPILOT_API_KEY", "OPENAI_BASE_URL", "COPILOT_MODEL"];
  const here = (() => {
    try {
      return dirname(fileURLToPath(import.meta.url));
    } catch {
      return process.cwd();
    }
  })();
  const candidates = [
    join(here, "../../../../../.env"), // repo root from app/api/copilotkit/route.ts
    join(process.cwd(), ".env"),
    join(process.cwd(), "../../.env"),
  ];
  for (const p of candidates) {
    try {
      if (!existsSync(p)) continue;
      for (const line of readFileSync(p, "utf8").split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
        if (!m || !WANTED.includes(m[1]) || process.env[m[1]]) continue;
        let v = m[2];
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        if (v) process.env[m[1]] = v;
      }
      if (process.env.OPENAI_API_KEY || process.env.COPILOT_API_KEY) break;
    } catch {
      // ignore — graceful 503 path handles a missing/unreadable .env
    }
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  ensureRootEnv();
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.COPILOT_API_KEY;
  if (!apiKey) {
    // No LLM key configured — the page + readable/HITL actions still work; only live chat needs this.
    return new Response(
      JSON.stringify({
        error: "copilot_runtime_unconfigured",
        hint: "Set OPENAI_API_KEY (or COPILOT_API_KEY) to enable the live assistant. The /recovery demo works without it.",
      }),
      { status: 503, headers: { "content-type": "application/json" } },
    );
  }

  try {
    const openai = new OpenAI({
      apiKey,
      ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}),
    });
    const serviceAdapter = new OpenAIAdapter({
      openai,
      model: process.env.COPILOT_MODEL ?? "gpt-4o-mini",
    });
    const runtime = new CopilotRuntime();

    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
      runtime,
      serviceAdapter,
      endpoint: ENDPOINT,
    });
    return handleRequest(req);
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "copilot_runtime_error", detail: (e as Error).message }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
}
