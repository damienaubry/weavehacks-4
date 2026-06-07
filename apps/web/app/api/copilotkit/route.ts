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

const ENDPOINT = "/api/copilotkit";

export async function POST(req: NextRequest): Promise<Response> {
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
