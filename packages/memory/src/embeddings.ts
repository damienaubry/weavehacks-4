/**
 * EMBEDDINGS for the failure-card store.
 *
 * Primary path: the configured runtime (`createClient().embeddings.create`) — W&B Inference or
 * OpenAI, whichever `RUNTIME_PROVIDER` selects. This is a runtime credit, so we keep it cheap:
 * results are cached per text and the corpus is tiny.
 *
 * Fallback path: a FREE, deterministic, offline hashing embedder. W&B Inference does not always
 * expose an `/embeddings` endpoint, and the demo must never hard-fail (no key / no network / 404).
 *
 * DIMENSION IS LOCKED ONCE PER PROCESS. The mode (runtime vs local) and its dimension are resolved
 * on the first embed and never change afterwards — runtime is 1536-ish, local is 256, and silently
 * mixing the two makes cosine() compare different-length vectors (which would score 0 and corrupt
 * ranking). If the runtime endpoint flaps AFTER we've locked onto it, we return a zero vector of the
 * locked dimension rather than switching dim, so every vector this process produces is comparable.
 * Cross-run mixing is handled separately by the store, which namespaces Redis by `embedderSignature()`.
 *
 * Both paths return L2-NORMALIZED vectors, so cosine reduces to a dot product and RediSearch's
 * `COSINE` metric stays consistent with the JS fallback.
 */
import { createClient, defaultProvider, getProviders } from "@weavehacks/runtime";
import { traced } from "@weavehacks/observability";

export type EmbedMode = "runtime" | "local";

/** Dimensionality of the local hashing embedder. Small on purpose — the corpus is tiny. */
const LOCAL_DIM = 256;

/** Locked on the first embed; never changes for the life of the process. */
let lockedMode: EmbedMode | null = null;
let lockedDim = LOCAL_DIM;
let warnedBroken = false;
let warnedProbe = false;

/** Cache keyed by mode+dim+text so a (hypothetical) mode change can never serve a stale-dim vector. */
const cache = new Map<string, number[]>();

/** What the caller asked for via env; "auto" resolves to runtime iff a provider key is present. */
function configuredMode(): EmbedMode {
  const m = (process.env.MEMORY_EMBEDDINGS ?? "").trim().toLowerCase();
  if (m === "local") return "local";
  if (m === "runtime") return "runtime";
  // auto (default): prefer the runtime only if its key exists, else go straight to the free path.
  const providers = getProviders();
  const hasKey = Boolean(providers[defaultProvider()].apiKey);
  return hasKey ? "runtime" : "local";
}

function embeddingModel(): string {
  return (
    process.env.MEMORY_EMBEDDING_MODEL ??
    process.env.EMBEDDING_MODEL ??
    "text-embedding-3-small"
  );
}

/** FNV-1a 32-bit — stable, fast, dependency-free. */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function l2normalize(v: number[]): number[] {
  let sum = 0;
  for (const x of v) sum += x * x;
  const norm = Math.sqrt(sum);
  if (norm === 0) return v; // zero vector → leave as-is (cosine with it is 0)
  return v.map((x) => x / norm);
}

/**
 * Deterministic bag-of-features embedder: word tokens + character trigrams hashed into a fixed
 * vector. Cross-lingual enough for fr/en reviews (trigrams catch shared roots) and good enough to
 * rank a handful of failure-cards by textual overlap. Exact, free, and offline.
 */
function localEmbed(text: string): number[] {
  const v = new Array(LOCAL_DIM).fill(0);
  const norm = text.toLowerCase().normalize("NFKD");
  const tokens = norm.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  for (const t of tokens) {
    v[fnv1a("w:" + t) % LOCAL_DIM] += 1;
  }
  const squashed = tokens.join(" ");
  for (let i = 0; i + 3 <= squashed.length; i++) {
    v[fnv1a("g:" + squashed.slice(i, i + 3)) % LOCAL_DIM] += 0.5;
  }
  return l2normalize(v);
}

async function runtimeEmbed(text: string): Promise<number[]> {
  const client = createClient();
  const res = await client.embeddings.create({ model: embeddingModel(), input: text });
  const vec = res.data?.[0]?.embedding as number[] | undefined;
  if (!Array.isArray(vec) || vec.length === 0) throw new Error("empty embedding payload");
  return l2normalize(vec);
}

/** Resolve + lock the embedder mode/dim ONCE. Probes the runtime so the dim is known up front. */
async function resolveEmbedder(): Promise<void> {
  if (lockedMode) return;
  if (configuredMode() === "local") {
    lockedMode = "local";
    lockedDim = LOCAL_DIM;
    return;
  }
  try {
    const probe = await runtimeEmbed("le kyoto recovery memory probe");
    lockedMode = "runtime";
    lockedDim = probe.length;
  } catch (e) {
    if (!warnedProbe) {
      warnedProbe = true;
      console.warn(
        `[memory] runtime embeddings unavailable (${(e as Error).message}) — using the free local embedder.`,
      );
    }
    lockedMode = "local";
    lockedDim = LOCAL_DIM;
  }
}

/**
 * Embed `text` to an L2-normalized vector of the LOCKED dimension. Never throws and never changes
 * dimension: a post-lock runtime failure yields a zero vector of the locked dim (it just won't rank
 * well) rather than a different-length vector that would corrupt cosine. Traced for Weave.
 */
export const embed = traced(
  "memory.embed",
  async function embed(text: string): Promise<number[]> {
    await resolveEmbedder();
    const key = `${lockedMode}:${lockedDim}:${text.slice(0, 1024)}`;
    const cached = cache.get(key);
    if (cached) return cached;

    let vec: number[];
    if (lockedMode === "local") {
      vec = localEmbed(text);
    } else {
      try {
        const out = await runtimeEmbed(text);
        // Dimension is locked — a provider that suddenly changes width can't poison the store.
        vec = out.length === lockedDim ? out : new Array(lockedDim).fill(0);
      } catch (e) {
        if (!warnedBroken) {
          warnedBroken = true;
          console.warn(
            `[memory] a runtime embedding failed mid-run (${(e as Error).message}) — degrading that vector (dim stays ${lockedDim}).`,
          );
        }
        vec = new Array(lockedDim).fill(0); // keep dim invariant
      }
    }
    cache.set(key, vec);
    return vec;
  },
);

/** Cosine similarity of two (already L2-normalized) vectors. Returns 0 if shapes are incomparable. */
export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

/** Diagnostics for the store's tier log / health output. Dim is known only after the first embed. */
export function embedderInfo(): { mode: EmbedMode; dim: number; resolved: boolean } {
  return { mode: lockedMode ?? configuredMode(), dim: lockedDim, resolved: lockedMode !== null };
}

/**
 * Stable identity of the active embedder, e.g. "runtime-1536" / "local-256". The store namespaces
 * Redis keys + the FT index by this so a run on one embedder never reads another's (incompatible)
 * vectors. Before the first embed it reflects the configured mode with an unknown ("u") dim.
 */
export function embedderSignature(): string {
  if (!lockedMode) return `${configuredMode()}-u`;
  return `${lockedMode}-${lockedDim}`;
}

/** Test helper — drop the embedding cache + reset the lock so a new mode can be probed. */
export function __resetEmbeddings(): void {
  cache.clear();
  lockedMode = null;
  lockedDim = LOCAL_DIM;
  warnedBroken = false;
  warnedProbe = false;
}
