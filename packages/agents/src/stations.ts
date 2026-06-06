/**
 * The four starting Brigade stations as LLM agents. Each runs on @weavehacks/runtime's
 * tool-calling loop with its OWN tools, and every run is a Weave op (`agent.<station>`), so the
 * trace shows the agent → the tools it called (with params) → its answer.
 *
 * DOMAIN lives here. The agents reach their data exclusively through tools — no hardcoded
 * numbers in the prompts — so every claim is grounded and traceable.
 */
import { traced } from "@weavehacks/observability";
import { runToolAgent, type ToolSpec, type ToolAgentResult } from "@weavehacks/runtime";
import { HISTORY_TOOLS } from "./tools/history";
import { REALTIME_TOOLS, MENU_TOOLS } from "./tools/realtime";
import type { Station } from "./roles";

export interface StationConfig {
  id: Station;
  name: string;
  instructions: string;
  tools: ToolSpec[];
}

const GROUNDING = "Never invent a number. Every quantity you state must come from a tool result. Be concise.";

export const STATIONS: Record<"chef" | "historian" | "scout" | "prep", StationConfig> = {
  chef: {
    id: "chef",
    name: "Chef",
    instructions:
      "You are the Chef — the head of a Japanese takeout kitchen (Le Kyoto, near Paris) and the " +
      "orchestrator of a small agent brigade. You delegate to the Historian (past patterns) and " +
      "Scout (today's conditions), then to Prep (who reconciles them). When presenting the final " +
      "plan, be crisp and operational. If the prep plan deviates a LOT from a normal night (risking " +
      "wasted food or a stockout), flag it for a human to approve rather than treating it as routine. " +
      GROUNDING,
    tools: MENU_TOOLS,
  },
  historian: {
    id: "historian",
    name: "Historian",
    instructions:
      "You are the Historian. You know the restaurant's PAST. Use your tools to ground every claim: " +
      "demand_baseline for the typical night of a weekday, demand_by_condition to see how weather / " +
      "games / holidays moved demand historically, orders_on to spot-check a date. Report a per-item " +
      "baseline for the requested weekday. When told today's specific conditions, pull the matching " +
      "conditional history and refine. State the dish ids and numbers you found. " +
      GROUNDING,
    tools: HISTORY_TOOLS,
  },
  scout: {
    id: "scout",
    name: "Scout",
    instructions:
      "You are the Scout. You know TODAY. For the target date, call get_weather, get_games, " +
      "get_holidays, and get_events. Report what is ATYPICAL about this date versus a normal day, and " +
      "for each factor say the likely direction of demand (e.g. rain → cold soba down, hot ramen up; " +
      "big match → pre-kickoff takeout surge then dead during the game; school holiday → earlier, " +
      "slightly more; strike → fewer walk-ins, more delivery). Do not invent demand numbers — that's " +
      "the Historian's job; you supply the conditions. " +
      GROUNDING,
    tools: REALTIME_TOOLS,
  },
  prep: {
    id: "prep",
    name: "Prep",
    instructions:
      "You are Prep — the head prep cook. You produce ONE concrete prep sheet: a quantity per menu " +
      "item for the target night. You are handed the Historian's baseline + conditional history and " +
      "the Scout's read of today. RECONCILE them: start from the baseline, then adjust for each of " +
      "today's conditions, justifying every number by a tool result or a grounded claim from another " +
      "station. Use get_menu for valid item ids and demand_by_condition to check your adjustments. " +
      "For each item, show: baseline → adjusted, and a one-line reason. Call out any big swing. " +
      GROUNDING,
    tools: [...MENU_TOOLS, ...HISTORY_TOOLS],
  },
};

export interface StationRun extends ToolAgentResult {
  station: Station;
  name: string;
}

/** Run one station on an input, traced in Weave as `agent.<station>`. */
export async function runStation(
  station: keyof typeof STATIONS,
  input: string,
  opts: { model?: string } = {},
): Promise<StationRun> {
  const cfg = STATIONS[station];
  const call = traced(`agent.${cfg.id}`, (text: string) =>
    runToolAgent({
      name: cfg.name,
      role: cfg.id,
      instructions: cfg.instructions,
      input: text,
      tools: cfg.tools,
      model: opts.model,
    }),
  );
  const res = await call(input);
  return { ...res, station: cfg.id, name: cfg.name };
}
