import { createRedis } from "@weavehacks/shared";
import type { SharedState } from "./types";

/** In-memory SharedState. Always available; used as the offline fallback. */
export function createMemoryState(): SharedState {
  const m = new Map<string, string>();
  return {
    async get(k) {
      return m.get(k) ?? null;
    },
    async set(k, v) {
      m.set(k, v);
    },
    async all() {
      return Object.fromEntries(m);
    },
    async publish() {
      /* no-op in memory */
    },
    async clear() {
      m.clear();
    },
    async close() {
      /* nothing to release */
    },
  };
}

export interface SharedStateOptions {
  redisUrl?: string;
  /** Redis hash namespace, also isolates concurrent runs (e.g. solo vs team). */
  namespace?: string;
}

/**
 * Real shared state. Uses Redis (sponsor: shared agent state + pub/sub) when
 * reachable; transparently falls back to in-memory so the scoreboard is runnable
 * at all times, including offline / in CI / before start.sh has run.
 */
export async function createSharedState(opts: SharedStateOptions = {}): Promise<SharedState> {
  const url = opts.redisUrl ?? process.env.REDIS_URL;
  const ns = opts.namespace ?? "wh:state";
  if (!url) return createMemoryState();

  try {
    const redis = createRedis(url);
    await redis.ping();
    return {
      async get(k) {
        return redis.hget(ns, k);
      },
      async set(k, v) {
        await redis.hset(ns, k, v);
      },
      async all() {
        return (await redis.hgetall(ns)) ?? {};
      },
      async publish(channel, message) {
        await redis.publish(channel, message);
      },
      async clear() {
        await redis.del(ns);
      },
      async close() {
        await redis.quit();
      },
    };
  } catch (e) {
    console.warn(
      `[orchestration] Redis unavailable (${(e as Error).message}) — using in-memory state.`,
    );
    return createMemoryState();
  }
}
