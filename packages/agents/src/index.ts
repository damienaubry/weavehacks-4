/**
 * @weavehacks/agents — the Brigade roster (DOMAIN code lives here, not in the core).
 *
 * Starting team: Chef (orchestrator) + Historian (past patterns) + Scout (today's conditions)
 * + Prep (reconciler). They coordinate in `runFridayPrep()` — the Historian's baseline and the
 * Scout's read of today disagree, and Prep reconciles. Built on the resolved direct-call
 * orchestrator + W&B Inference runtime; every agent call and tool call is a Weave op.
 *
 * Content / Critic / Promo / Reviews / Forge are next, additive, and cuttable.
 */

export {
  AGENT_ROLES,
  assertEveryRoleHasConflict,
  role,
  type RoleManifest,
  type Station,
} from "./roles";

export { STATIONS, runStation, type StationConfig, type StationRun } from "./stations";
export {
  runFridayPrep,
  type DiscussionResult,
  type DiscussionTurn,
  type DiscussionOptions,
} from "./discussion";

export {
  HISTORY_TOOLS,
  REALTIME_TOOLS,
  MENU_TOOLS,
  getWeatherTool,
  getGamesTool,
  getHolidaysTool,
  getEventsTool,
  getMenuTool,
  demandBaselineTool,
  demandByConditionTool,
  ordersOnTool,
  demandBaseline,
  demandByCondition,
  ordersOn,
} from "./tools";

// PREP station: deterministic forecasters + backtest. naiveForecast = the SOLO demand baseline;
// contextForecast = the TEAM lens that conditions on knowable signals (weather/holiday/football/…).
export {
  naiveForecast,
  contextForecast,
  backtest,
  type Forecaster,
  type ForecastQuery,
  type ForecastConditions,
  type Forecast,
  type ProductPrediction,
  type BacktestMetrics,
} from "./prep";
