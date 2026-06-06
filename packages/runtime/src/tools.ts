import OpenAI from "openai";
import { createClient } from "./client";
import { defaultProvider, getProviders, providerForRole, type ProviderName } from "./providers";

/**
 * Tool-calling agent loop over raw chat completions.
 *
 * We drive function-calling ourselves (rather than via the Agents SDK) so it works on ANY
 * OpenAI-compatible endpoint — W&B Inference included — and so every tool call is observable
 * and wrappable in Weave. An agent is: instructions + a set of ToolSpecs. The model decides
 * which tools to call and with what PARAMETERS; we execute them, feed results back, and loop
 * until it produces a final answer (or hits maxSteps).
 */

export interface ToolSpec {
  name: string;
  description: string;
  /** JSON Schema for the parameters the model fills in (OpenAI tool format). */
  parameters: Record<string, unknown>;
  /** Runs the tool with the model-provided args; returns any JSON-serializable result. */
  execute: (args: any) => Promise<unknown> | unknown;
}

export interface ToolCallRecord {
  name: string;
  args: unknown;
  result: unknown;
}

export interface ToolAgentOptions {
  /** agent name (label) */
  name: string;
  /** system prompt — the role this agent plays */
  instructions: string;
  /** the user turn for this agent */
  input: string;
  /** tools the agent may call (with parameters) */
  tools: ToolSpec[];
  /** role → provider routing */
  role?: string;
  provider?: ProviderName;
  model?: string;
  temperature?: number;
  /** max tool-call rounds before forcing a final answer */
  maxSteps?: number;
  /** observe each tool call (use to trace in Weave) */
  onToolCall?: (rec: ToolCallRecord) => void;
}

export interface ToolAgentResult {
  text: string;
  toolCalls: ToolCallRecord[];
  steps: number;
}

export async function runToolAgent(opts: ToolAgentOptions): Promise<ToolAgentResult> {
  const provider = opts.provider ?? (opts.role ? providerForRole(opts.role) : defaultProvider());
  const cfg = getProviders()[provider];
  const client = createClient(provider);
  const model = opts.model ?? cfg.defaultModel;
  const maxSteps = opts.maxSteps ?? 6;

  const toolDefs: OpenAI.Chat.ChatCompletionTool[] = opts.tools.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters as Record<string, unknown> },
  }));
  const byName = new Map(opts.tools.map((t) => [t.name, t]));

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: opts.instructions },
    { role: "user", content: opts.input },
  ];

  const toolCalls: ToolCallRecord[] = [];
  for (let step = 0; step < maxSteps; step++) {
    const res = await client.chat.completions.create({
      model,
      temperature: opts.temperature ?? 0.2,
      messages,
      tools: toolDefs.length ? toolDefs : undefined,
      tool_choice: toolDefs.length ? "auto" : undefined,
    });
    const msg = res.choices[0]?.message;
    if (!msg) break;

    const calls = msg.tool_calls ?? [];
    if (calls.length === 0) {
      return { text: msg.content ?? "", toolCalls, steps: step + 1 };
    }

    // Record the assistant turn (must precede its tool results), then execute each call.
    messages.push({ role: "assistant", content: msg.content ?? "", tool_calls: calls });
    for (const tc of calls) {
      if (tc.type !== "function") continue;
      const spec = byName.get(tc.function.name);
      let args: unknown = {};
      try {
        args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
      } catch {
        /* leave args as {} */
      }
      let result: unknown;
      if (!spec) {
        result = { error: `unknown tool: ${tc.function.name}` };
      } else {
        try {
          result = await spec.execute(args);
        } catch (e) {
          result = { error: (e as Error).message };
        }
      }
      const rec: ToolCallRecord = { name: tc.function.name, args, result };
      toolCalls.push(rec);
      opts.onToolCall?.(rec);
      messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
    }
  }

  // Out of steps → force a final answer with no tools.
  const final = await client.chat.completions.create({
    model,
    temperature: opts.temperature ?? 0.2,
    messages,
  });
  return { text: final.choices[0]?.message?.content ?? "", toolCalls, steps: maxSteps };
}
