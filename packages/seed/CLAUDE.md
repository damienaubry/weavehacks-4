# packages/seed — curated demo slice (NOT canon)

A small, hardcoded slice of real-shaped data (orders, reviews, weather) so the demo never
depends on a live integration. This is **pitch credibility, not a source of truth.**

- **Edit freely to stage the demo.** These arrays are the knobs we turn before going on stage.
- Agents cite these as **grounding sources**; the Critic checks every approved claim traces
  back to one of them (or to `@weavehacks/truth`).
- Values are placeholders — replace with Le Kyoto's real curated slice (~50 orders, ~20
  reviews, one weekend's weather). Keep the SHAPE so downstream code keeps working.
- `pnpm seed` validates this loads and prints the counts (incl. the demo's "% of 5★ reviews
  that mention the broth" grounding stat). No LLM, no credits.
- **Do NOT** turn this into a data pipeline. No fetchers, no scrapers — that's explicitly out
  of scope for the 48h build.
