/**
 * Scout's tools — read TODAY's real-world conditions for a date. Granular on purpose so the
 * Scout calls several ("reaches out" for weather, then games, then holidays, then events) and
 * the Weave trace shows each. Plus a shared menu tool both stations can use.
 */
import { traced } from "@weavehacks/observability";
import type { ToolSpec } from "@weavehacks/runtime";
import { WEATHER, FIXTURES, HOLIDAYS, EVENTS } from "@weavehacks/seed";
import { TRUTH } from "@weavehacks/truth";

const dateParam = {
  type: "object",
  properties: { date: { type: "string", description: "ISO date YYYY-MM-DD" } },
  required: ["date"],
  additionalProperties: false,
} as const;

export const getWeatherTool: ToolSpec = {
  name: "get_weather",
  description: "Weather (condition + temperature) for a date. Rain suppresses cold dishes, lifts hot ones.",
  parameters: dateParam as Record<string, unknown>,
  execute: traced("tool.get_weather", ({ date }: { date: string }) => WEATHER.find((w) => w.date === date) ?? { date, note: "no weather on file" }),
};

export const getGamesTool: ToolSpec = {
  name: "get_games",
  description: "Sports fixtures on a date (competition, match, kickoff, importance 1–5). A big match drives a pre-kickoff takeout surge then a dead room during the game.",
  parameters: dateParam as Record<string, unknown>,
  execute: traced("tool.get_games", ({ date }: { date: string }) => FIXTURES.filter((f) => f.date === date)),
};

export const getHolidaysTool: ToolSpec = {
  name: "get_holidays",
  description: "Public/school holidays on a date. Shift baseline demand and which dayparts are busy.",
  parameters: dateParam as Record<string, unknown>,
  execute: traced("tool.get_holidays", ({ date }: { date: string }) => HOLIDAYS.filter((h) => h.date === date)),
};

export const getEventsTool: ToolSpec = {
  name: "get_events",
  description: "Local events on a date (concerts, transport strikes, markets) that boost or suppress orders.",
  parameters: dateParam as Record<string, unknown>,
  execute: traced("tool.get_events", ({ date }: { date: string }) => EVENTS.filter((e) => e.date === date)),
};

export const getMenuTool: ToolSpec = {
  name: "get_menu",
  description: "The canonical menu (item id, name, price, category, availability). The source of truth for what can be prepped.",
  parameters: { type: "object", properties: {}, additionalProperties: false },
  execute: traced("tool.get_menu", () => TRUTH.menu),
};

export const REALTIME_TOOLS: ToolSpec[] = [getWeatherTool, getGamesTool, getHolidaysTool, getEventsTool];
export const MENU_TOOLS: ToolSpec[] = [getMenuTool];
