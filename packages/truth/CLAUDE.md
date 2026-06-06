# packages/truth — CANON

This package is the **single source of truth** for Le Kyoto (menu, prices, hours). Conflicts
between agents resolve TOWARD this. A claim is "grounded" only if it traces to a value here or
to a real data source in `@weavehacks/seed`.

- **Never write generated/derived output back into here.** Agents read canon; they don't author it.
- The values are **demo placeholders** — the operator swaps in the real menu/prices/hours. Keep
  the SHAPE stable (other packages key off `MenuItem.id`); change the VALUES.
- This is the only `packages/*` (besides `seed`/`agents`) allowed to hold restaurant concepts.
  Keep them OUT of `orchestration`/`observability`.
