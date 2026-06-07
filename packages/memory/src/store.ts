/**
 * FAILURE-CARD STORE — three graceful tiers behind one async API. It NEVER throws to the caller
 * (mirrors `createSharedState`): the recovery demo must run offline, on plain Redis, or on Redis
 * Stack without code changes.
 *
 *   tier "redisearch" — RediSearch module present → real `FT.CREATE` VECTOR index + `FT.SEARCH`
 *                       KNN with a TAG pre-filter (the literal "Redis vector search").
 *   tier "redis"      — plain Redis (e.g. the demo's redis:7-alpine, which has no search module)
 *                       → cards persisted as hashes + per-tag SETs; tag pre-filter via Redis, then
 *                       exact cosine ranked in JS. Cross-run persistence — the team+memory story.
 *   tier "memory"     — Redis unreachable → process-local mirror (lost between runs) so the demo
 *                       degrades instead of failing.
 *
 * The Redis keyspace AND the FT index are namespaced by `embedderSignature()` (mode+dim), so a run
 * on one embedder can never read another's incompatible-dimension vectors. A process-local `mirror`
 * always holds cards written this run, so retrieval is correct even if a Redis write flaps mid-run;
 * retrieval unions the mirror with what Redis returns, dedupes by id, and only cosine-compares
 * vectors of matching dimension.
 */
import { createRedis, type Redis } from "@weavehacks/shared";
import { embed, cosine, embedderInfo, embedderSignature } from "./embeddings";
import type { FailureCard, RetrieveQuery } from "./types";

type Tier = "redisearch" | "redis" | "memory";

const BASE_NS = process.env.MEMORY_NAMESPACE ?? "wh:fc";

/** Bound a possibly-hanging Redis call so init never blocks the demo. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${label} timed out`)), ms)),
  ]);
}

function cardText(card: FailureCard): string {
  return [card.bad_pattern, card.missing_evidence, card.patch_exemplar, card.failure_tags.join(" ")]
    .filter(Boolean)
    .join(" • ");
}

function toHash(card: FailureCard, seq: number): Record<string, string> {
  return {
    id: card.id,
    caseId: card.caseId,
    failure_tags: card.failure_tags.join(","),
    missing_evidence: card.missing_evidence,
    bad_pattern: card.bad_pattern,
    patch_exemplar: card.patch_exemplar,
    emb_json: JSON.stringify(card.embedding ?? []),
    seq: String(seq),
  };
}

function fromHash(h: Record<string, string>): FailureCard | null {
  if (!h || !h.id) return null;
  let embedding: number[] | undefined;
  try {
    embedding = h.emb_json ? (JSON.parse(h.emb_json) as number[]) : undefined;
  } catch {
    embedding = undefined;
  }
  return {
    id: h.id,
    caseId: h.caseId ?? "",
    failure_tags: h.failure_tags ? h.failure_tags.split(",").filter(Boolean) : [],
    missing_evidence: h.missing_evidence ?? "",
    bad_pattern: h.bad_pattern ?? "",
    patch_exemplar: h.patch_exemplar ?? "",
    embedding,
  };
}

/** Float32 little-endian blob for a RediSearch VECTOR field / KNN query param. */
function floatBlob(v: number[]): Buffer {
  return Buffer.from(Float32Array.from(v).buffer);
}

export class FailureCardStore {
  private redis: Redis | null = null;
  private tier: Tier = "memory";
  private useFt = false;
  private ftReady = false;
  private seq = 0;
  private mirror: FailureCard[] = [];
  private initOnce: Promise<void> | null = null;

  // ── keyspace — namespaced by embedder signature so dims can never mix across runs ──
  private ns(): string {
    return `${BASE_NS}:${embedderSignature()}`;
  }
  private cardKey(id: string): string {
    return `${this.ns()}:card:${id}`;
  }
  private idsKey(): string {
    return `${this.ns()}:ids`;
  }
  private tagKey(t: string): string {
    return `${this.ns()}:tag:${t}`;
  }
  private indexName(): string {
    return `${this.ns()}:idx`;
  }
  private cardPrefix(): string {
    return `${this.ns()}:card:`;
  }

  /** Lazy, idempotent. Picks the best available tier; logs it once for the demo. */
  private init(): Promise<void> {
    if (!this.initOnce) this.initOnce = this.doInit();
    return this.initOnce;
  }

  private async doInit(): Promise<void> {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    try {
      const redis = createRedis(url);
      // ioredis would otherwise emit an unhandled 'error' on an offline server.
      redis.on("error", () => {});
      await withTimeout(redis.ping(), 2500, "redis ping");
      this.redis = redis;
      this.tier = "redis";
      if ((process.env.MEMORY_REDISEARCH ?? "").toLowerCase() !== "off") {
        try {
          await withTimeout(redis.call("FT._LIST") as Promise<unknown>, 1500, "FT._LIST");
          this.tier = "redisearch";
          this.useFt = true;
        } catch {
          // No search module (e.g. redis:7-alpine) — portable cosine path. Expected, not an error.
        }
      }
    } catch (e) {
      console.warn(
        `[memory] Redis unavailable (${(e as Error).message}) — failure-cards live in-memory (lost between runs).`,
      );
      this.tier = "memory";
      this.redis = null;
    }
    const emb = embedderInfo();
    console.log(
      `[memory] failure-card store ready — tier=${this.tier}, embeddings=${emb.mode}` +
        (this.tier === "redisearch" ? " (FT.SEARCH KNN)" : this.tier === "redis" ? " (cosine in JS)" : ""),
    );
  }

  /** Create the RediSearch VECTOR index once, sized to the active embedding dim. */
  private async ensureFtIndex(dim: number): Promise<void> {
    if (this.ftReady || !this.redis) return;
    try {
      await this.redis.call(
        "FT.CREATE", this.indexName(), "ON", "HASH", "PREFIX", "1", this.cardPrefix(),
        "SCHEMA",
        "caseId", "TAG",
        "failure_tags", "TAG", "SEPARATOR", ",",
        "missing_evidence", "TEXT",
        "bad_pattern", "TEXT",
        "patch_exemplar", "TEXT",
        "seq", "NUMERIC", "SORTABLE",
        "emb", "VECTOR", "FLAT", "6", "TYPE", "FLOAT32", "DIM", String(dim), "DISTANCE_METRIC", "COSINE",
      );
      this.ftReady = true;
    } catch (e) {
      const msg = (e as Error).message ?? "";
      // The index name carries the embedder signature (incl. dim), so an existing index always
      // matches the active dim — reusing it is correct.
      if (/index already exists/i.test(msg)) {
        this.ftReady = true;
      } else {
        console.warn(`[memory] FT.CREATE failed (${msg}) — falling back to cosine in JS.`);
        this.useFt = false;
        this.tier = this.redis ? "redis" : "memory";
      }
    }
  }

  /** Persist + index a card. Computes the embedding if the caller didn't supply one. */
  async write(card: FailureCard): Promise<void> {
    await this.init();
    const withEmb: FailureCard = {
      ...card,
      embedding: card.embedding ?? (await embed(cardText(card))),
    };
    // Mirror first — guarantees this-process retrieval even if Redis writes fail.
    this.mirror = this.mirror.filter((c) => c.id !== withEmb.id);
    this.mirror.push(withEmb);

    if (!this.redis) return; // memory tier
    const seq = this.seq++;
    try {
      const pipe = this.redis.multi();
      pipe.hset(this.cardKey(withEmb.id), toHash(withEmb, seq));
      pipe.sadd(this.idsKey(), withEmb.id);
      for (const t of withEmb.failure_tags) pipe.sadd(this.tagKey(t), withEmb.id);
      await pipe.exec();
      if (this.useFt) {
        await this.ensureFtIndex((withEmb.embedding ?? []).length || embedderInfo().dim);
        if (this.useFt) {
          // Binary VECTOR field, written separately so the string fields stay UTF-8 clean.
          await this.redis.hset(this.cardKey(withEmb.id), "emb", floatBlob(withEmb.embedding ?? []));
        }
      }
    } catch (e) {
      console.warn(`[memory] Redis write failed (${(e as Error).message}) — kept in the in-memory mirror.`);
    }
  }

  /** Retrieve top-k cards by embedding similarity, hard-filtered to ANY of `tags` when given. */
  async retrieve(query: RetrieveQuery): Promise<FailureCard[]> {
    await this.init();
    const k = query.k ?? 3;
    const qvec = await embed(query.text);

    let candidates: FailureCard[] = [];
    if (this.redis) {
      try {
        if (this.useFt && this.ftReady) {
          try {
            candidates = await this.ftSearch(qvec, query.tags, Math.max(k * 4, 20));
          } catch (ftErr) {
            // KNN failed — drop FT for this process and read the same hashes via the portable path.
            console.warn(`[memory] FT.SEARCH failed (${(ftErr as Error).message}) — falling back to cosine in JS.`);
            this.useFt = false;
            this.tier = "redis";
            candidates = await this.portableLoad(query.tags);
          }
        } else {
          candidates = await this.portableLoad(query.tags);
        }
      } catch (e) {
        console.warn(`[memory] Redis read failed (${(e as Error).message}) — using the in-memory mirror.`);
        candidates = [];
      }
    }
    // Union with the process mirror (covers degraded writes + the memory tier), dedupe by id.
    const byId = new Map<string, FailureCard>();
    for (const c of candidates) byId.set(c.id, c);
    for (const c of this.mirror) if (!byId.has(c.id)) byId.set(c.id, c);

    return this.rank(qvec, [...byId.values()], query.tags, k);
  }

  /** Plain-Redis candidate load: tag pre-filter via SETs (or all ids), then hydrate the hashes. */
  private async portableLoad(tags?: string[]): Promise<FailureCard[]> {
    if (!this.redis) return [];
    const ids =
      tags && tags.length
        ? await this.redis.sunion(...tags.map((t) => this.tagKey(t)))
        : await this.redis.smembers(this.idsKey());
    if (!ids.length) return [];
    const pipe = this.redis.multi();
    for (const id of ids) pipe.hgetall(this.cardKey(id));
    const res = await pipe.exec();
    const out: FailureCard[] = [];
    for (const [, h] of res ?? []) {
      const card = fromHash(h as Record<string, string>);
      if (card) out.push(card);
    }
    return out;
  }

  /** RediSearch KNN with a TAG pre-filter — the engine narrows by tag before the vector compare. */
  private async ftSearch(qvec: number[], tags: string[] | undefined, n: number): Promise<FailureCard[]> {
    if (!this.redis) return [];
    const filter = tags && tags.length ? `@failure_tags:{${tags.map(escapeTag).join("|")}}` : "*";
    const q = `(${filter})=>[KNN ${n} @emb $BLOB AS score]`;
    const reply = (await this.redis.call(
      "FT.SEARCH", this.indexName(), q,
      "PARAMS", "2", "BLOB", floatBlob(qvec),
      "SORTBY", "score", "ASC",
      "RETURN", "7", "id", "caseId", "failure_tags", "missing_evidence", "bad_pattern", "patch_exemplar", "emb_json",
      "LIMIT", "0", String(n),
      "DIALECT", "2",
    )) as unknown[];
    return parseFtReply(reply);
  }

  /**
   * Tag pre-filter (hard) then exact cosine sort. The single ranking path for every tier. Cards
   * whose embedding dimension doesn't match the query (e.g. a stale-dim mirror entry) are ranked
   * last rather than scored a misleading 0 — so a dim mismatch degrades gracefully, not silently.
   */
  private rank(qvec: number[], cards: FailureCard[], tags: string[] | undefined, k: number): FailureCard[] {
    const filtered =
      tags && tags.length
        ? cards.filter((c) => c.failure_tags.some((t) => tags.includes(t)))
        : cards;
    return filtered
      .map((c) => ({
        c,
        sim: c.embedding && c.embedding.length === qvec.length ? cosine(qvec, c.embedding) : -1,
      }))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, k)
      .map((s) => s.c);
  }

  /** Full async reset — clears every signature's Redis keys + drops FT indexes + the mirror. */
  async resetAsync(): Promise<void> {
    await this.init();
    this.mirror = [];
    this.seq = 0;
    this.ftReady = false;
    if (!this.redis) return;
    try {
      // Drop any FT indexes under our base namespace (across embedder signatures).
      try {
        const list = (await this.redis.call("FT._LIST")) as string[];
        for (const idx of list ?? []) {
          if (typeof idx === "string" && idx.startsWith(`${BASE_NS}:`)) {
            await this.redis.call("FT.DROPINDEX", idx).catch(() => {});
          }
        }
      } catch {
        /* no FT module — nothing to drop */
      }
      // Delete every key under the base namespace (cards, id sets, tag sets, all signatures).
      const keys: string[] = [];
      const stream = this.redis.scanStream({ match: `${BASE_NS}:*`, count: 200 });
      await new Promise<void>((resolve) => {
        stream.on("data", (batch: string[]) => keys.push(...batch));
        stream.on("end", () => resolve());
        stream.on("error", () => resolve());
      });
      if (keys.length) await this.redis.del(...keys);
    } catch (e) {
      console.warn(`[memory] reset (Redis) failed: ${(e as Error).message}`);
    }
  }

  /** Sync reset for the stable `__resetMemory()` signature: clears the mirror now, Redis async. */
  resetSync(): void {
    this.mirror = [];
    this.seq = 0;
    void this.resetAsync();
  }

  async close(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch {
        /* ignore */
      }
      this.redis = null;
    }
  }

  describe(): { tier: Tier; useFt: boolean; cards: number } {
    return { tier: this.tier, useFt: this.useFt, cards: this.mirror.length };
  }
}

function escapeTag(t: string): string {
  // RediSearch TAG special chars — escape so machine tags with punctuation still parse.
  return t.replace(/[\s,.<>{}\[\]"':;!@#$%^&*()\-+=~|/\\]/g, "\\$&");
}

/** Parse the array reply of FT.SEARCH (DIALECT 2): [count, key1, [f1,v1,...], key2, [...], ...]. */
function parseFtReply(reply: unknown[]): FailureCard[] {
  const out: FailureCard[] = [];
  if (!Array.isArray(reply) || reply.length < 2) return out;
  for (let i = 1; i < reply.length; i += 2) {
    const fields = reply[i + 1];
    if (!Array.isArray(fields)) continue;
    const h: Record<string, string> = {};
    for (let j = 0; j + 1 < fields.length; j += 2) {
      h[String(fields[j])] = String(fields[j + 1]);
    }
    const card = fromHash(h);
    if (card) out.push(card);
  }
  return out;
}

/** Process-singleton store + a reset that swaps it (used by tests / chronological splits). */
let store = new FailureCardStore();
export function getStore(): FailureCardStore {
  return store;
}
export function replaceStore(): FailureCardStore {
  store = new FailureCardStore();
  return store;
}
