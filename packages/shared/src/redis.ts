import Redis, { type RedisOptions } from "ioredis";

/**
 * Create an ioredis client. Used for shared agent state + pub/sub.
 * Defaults to the local docker Redis that start.sh launches.
 */
export function createRedis(
  url: string = process.env.REDIS_URL ?? "redis://localhost:6379",
  opts: RedisOptions = {},
): Redis {
  return new Redis(url, {
    maxRetriesPerRequest: 2,
    // Fail fast in health checks / offline runs instead of hanging.
    connectTimeout: 2000,
    retryStrategy: (times) => (times > 2 ? null : Math.min(times * 200, 1000)),
    ...opts,
  });
}

export { Redis };
