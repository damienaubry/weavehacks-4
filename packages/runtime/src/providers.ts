/**
 * Runtime provider config.
 *
 * Day one: OpenAI for ALL runtime agents (one provider, simplest path).
 *
 * OPEN DECISION #3 — a second provider (W&B Inference) is scaffolded but NOT active.
 * Both are OpenAI-compatible (one client, two base URLs). It is only worth enabling
 * if it maps to ROLES (cheap/fast for high-frequency agents; stronger for
 * verifier/orchestrator). Do not flip `providerForRole` off OpenAI without team sign-off.
 *
 * NOTE: these keys fund RUNTIME PRODUCT AGENTS — not build tooling / codegen.
 */

export type ProviderName = "openai" | "wandb";

export interface ProviderConfig {
  name: ProviderName;
  apiKey?: string;
  /** undefined for OpenAI's default endpoint */
  baseURL?: string;
  defaultModel: string;
}

export function getProviders(): Record<ProviderName, ProviderConfig> {
  return {
    openai: {
      name: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      defaultModel: "gpt-4o-mini",
    },
    wandb: {
      name: "wandb",
      apiKey: process.env.WANDB_API_KEY,
      baseURL: process.env.WANDB_INFERENCE_BASE_URL ?? "https://api.inference.wandb.ai/v1",
      defaultModel: "meta-llama/Llama-3.1-8B-Instruct",
    },
  };
}

/**
 * Map a role to a provider. Today: everything is OpenAI (OPEN DECISION #3 unresolved).
 * When/if the team enables W&B Inference, this is the ONE place role-based routing lives.
 */
export function providerForRole(_role: string): ProviderName {
  return "openai";
}
