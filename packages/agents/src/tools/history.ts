/**
 * Historian's tools — read PAST patterns from the POS slice. Every call is a Weave op, so the
 * trace shows exactly which numbers the Historian grounded its claims in (and with what params).
 */
import { traced } from "@weavehacks/observability";
import type { ToolSpec } from "@weavehacks/runtime";
import { demandBaseline, demandByCondition, ordersOn } from "./analytics";

export const demandBaselineTool: ToolSpec = {
  name: "demand_baseline",
  description:
    "Average nightly quantity per menu item across recent days of a given weekday. This is the " +
    "NAIVE 'typical day' — it does NOT account for weather, games, or holidays.",
  parameters: {
    type: "object",
    properties: {
      dow: { type: "integer", minimum: 0, maximum: 6, description: "day of week, 0=Sun … 5=Fri … 6=Sat" },
      lastN: { type: "integer", description: "how many recent matching days to average (default 8)" },
    },
    required: ["dow"],
    additionalProperties: false,
  },
  execute: traced("tool.demand_baseline", ({ dow, lastN }: { dow: number; lastN?: number }) =>
    demandBaseline(dow, lastN ?? 8),
  ),
};

export const demandByConditionTool: ToolSpec = {
  name: "demand_by_condition",
  description:
    "Average nightly quantity per item across PAST days matching conditions (weather, whether " +
    "there was a game, whether it was a holiday). Use this to ground how specific conditions " +
    "moved demand historically — e.g. rainy Fridays, or past match nights.",
  parameters: {
    type: "object",
    properties: {
      dow: { type: "integer", minimum: 0, maximum: 6, description: "optional day-of-week filter" },
      condition: { type: "string", enum: ["clear", "cloud", "rain"], description: "optional weather filter" },
      gameDay: { type: "boolean", description: "optional: only days that did/didn't have a fixture" },
      holiday: { type: "boolean", description: "optional: only days that were/weren't a holiday" },
    },
    additionalProperties: false,
  },
  execute: traced("tool.demand_by_condition", (f: Record<string, unknown>) => demandByCondition(f)),
};

export const ordersOnTool: ToolSpec = {
  name: "orders_on",
  description: "Raw order lines (item, hour, qty) for one date. Use to spot-check a specific day.",
  parameters: {
    type: "object",
    properties: { date: { type: "string", description: "ISO date YYYY-MM-DD" } },
    required: ["date"],
    additionalProperties: false,
  },
  execute: traced("tool.orders_on", ({ date }: { date: string }) => ordersOn(date)),
};

export const HISTORY_TOOLS: ToolSpec[] = [demandBaselineTool, demandByConditionTool, ordersOnTool];
