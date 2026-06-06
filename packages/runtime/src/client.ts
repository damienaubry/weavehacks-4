import OpenAI from "openai";
import { getProviders, providerForRole, type ProviderName } from "./providers";

/** Construct an OpenAI-compatible client for a given provider. */
export function createClient(provider: ProviderName = "openai"): OpenAI {
  const cfg = getProviders()[provider];
  if (!cfg.apiKey) {
    throw new Error(`[runtime] missing API key for provider '${provider}' — set it in .env`);
  }
  return new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL });
}

export interface GenerateOptions {
  /** the calling agent's role — drives provider routing (OPEN DECISION #3) */
  role?: string;
  model?: string;
  system?: string;
  temperature?: number;
}

/**
 * Single-shot text generation. The unit of work for a runtime agent.
 * Wrap calls to this with observability.traced() so every agent call lands in Weave.
 */
export async function generate(prompt: string, opts: GenerateOptions = {}): Promise<string> {
  const provider = opts.role ? providerForRole(opts.role) : "openai";
  const cfg = getProviders()[provider];
  const client = createClient(provider);

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: prompt });

  const res = await client.chat.completions.create({
    model: opts.model ?? cfg.defaultModel,
    temperature: opts.temperature ?? 0.2,
    messages,
  });
  return res.choices[0]?.message?.content ?? "";
}

/** Describe runtime config WITHOUT making an API call (so health checks don't burn credits). */
export function describeRuntime() {
  const p = getProviders();
  return {
    default: "openai" as const,
    openaiConfigured: Boolean(p.openai.apiKey),
    wandbConfigured: Boolean(p.wandb.apiKey),
    wandbBaseURL: p.wandb.baseURL,
    note: "OpenAI only, day one. W&B Inference as a second, role-routed provider is OPEN DECISION #3.",
  };
}
