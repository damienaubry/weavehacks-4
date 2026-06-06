/**
 * Redis-backed agent memory — the substrate for self-improvement Layers 2 & 3.
 *
 *   Layer 2 (across runs): scores + Critic feedback persist so agents stop repeating mistakes.
 *   Layer 3 (lifetime):    Forge's capability-gap log + agent blueprints.
 *   Reviews agent:          vector search over review embeddings (see redis-vector-search skill).
 *
 * Keys live under a single namespace so a demo reset is one `clearMemory()`. This module is
 * intentionally thin and framework-neutral — it depends only on @weavehacks/shared's Redis
 * client. The vector-search index is left as a TODO until the Reviews agent lands.
 */

import { createRedis, type Redis } from "@weavehacks/shared";

const NS = "wh:mem";
export const KEYS = {
  /** hash: agentId → latest score (0–10) */
  scores: `${NS}:scores`,
  /** list per agent: rolling Critic feedback, newest first */
  feedback: (agentId: string) => `${NS}:feedback:${agentId}`,
  /** list: capability gaps Forge has detected */
  gapLog: `${NS}:gaps`,
  /** hash: blueprintId → serialized agent blueprint Forge produced */
  blueprints: `${NS}:blueprints`,
  /** prefix for the review vector index (RediSearch / redis-vector-search skill) */
  reviewVec: `${NS}:reviews`,
};

export interface ScoreEntry {
  agentId: string;
  score: number;
  /** ISO timestamp — pass in; this package makes no clock calls */
  at: string;
}

/** Persist a Critic score for an agent (Layer 2). */
export async function recordScore(redis: Redis, e: ScoreEntry): Promise<void> {
  await redis.hset(KEYS.scores, e.agentId, JSON.stringify(e));
}

/** Append Critic feedback for an agent so future runs can read past mistakes (Layer 2). */
export async function recordFeedback(redis: Redis, agentId: string, feedback: string): Promise<void> {
  await redis.lpush(KEYS.feedback(agentId), feedback);
  await redis.ltrim(KEYS.feedback(agentId), 0, 49); // keep the last 50
}

/** Read recent feedback for an agent (newest first). */
export async function recentFeedback(redis: Redis, agentId: string, n = 5): Promise<string[]> {
  return redis.lrange(KEYS.feedback(agentId), 0, n - 1);
}

/** Log a capability gap Forge found (Layer 3, coda). */
export async function logGap(redis: Redis, gap: string): Promise<void> {
  await redis.lpush(KEYS.gapLog, gap);
}

/** Wipe all agent memory — used to reset between demo takes. */
export async function clearMemory(redis: Redis): Promise<void> {
  const keys = await redis.keys(`${NS}:*`);
  if (keys.length) await redis.del(...keys);
}

export { createRedis };
