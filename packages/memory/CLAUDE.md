# packages/memory — Redis agent memory

Persistence for self-improvement **Layer 2** (scores + Critic feedback across runs) and
**Layer 3** (Forge's gap log + blueprints), plus the **review vector index** for the Reviews
agent.

- All keys live under the `wh:mem` namespace → reset a demo take with `clearMemory()`.
- This package makes **no clock and no LLM calls** — pass timestamps in. Keep it thin.
- Vector search: build the index with the `redis-vector-search` skill when the Reviews agent
  lands; the `reviewVec` key prefix is reserved for it.
- Layer 1 (the hero Critic-rewrite loop) does NOT need this — it's in-session. Don't block the
  hero loop on memory.
