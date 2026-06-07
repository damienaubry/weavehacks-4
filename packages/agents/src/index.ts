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
  REVIEW_TOOLS,
  reviewStatsTool,
  getReviewsTool,
  reviewStats,
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

// GROUNDING eval — the judged headline, measured mechanically (no LLM judge). Producer emits
// structured claims; checkGrounding verifies each against captured tool results; the Critic is
// the only difference between the solo and team runs.
export {
  checkGrounding,
  runGroundingScenario,
  CONTENT_PRODUCER,
  PREP_PRODUCER,
  type ProducerConfig,
  type Claim,
  type ClaimCheck,
  type GroundingScore,
  type GroundingRun,
  type PipelineResult,
  type Budget,
  type GroundingComparison,
} from "./grounding";

// RECOVERY (hero pivot) — contracts the recovery workstreams code against. Implementations
// (recovery-stations / recovery-score) land in WS-B and WS-C; these types are the Phase-0 socle.
export type {
  RecoveryVariant,
  RecoveryOutput,
  CaseScore,
  RecoveryRunResult,
  RecoveryReport,
} from "./recovery-contract";

// FAILURE-CARD MEMORY (Layer 2) — in-memory stub; WS-D promotes to packages/memory + Redis.
export {
  writeFailureCard,
  retrieveFailureCards,
  __resetMemory,
  type FailureCard,
  type RetrieveQuery,
} from "./memory";
