/**
 * Reviews tools — the grounding source for the Content agent's review claims. Every call is a
 * Weave op, so a post's "X% of 5★ mention the broth" traces to the exact computed stat.
 *
 * ⚠️ Reads the CURATED seed reviews (not a live pull) — credibility for the pitch, per
 * packages/seed/CLAUDE.md. The mechanical grounding still holds: a claim is grounded iff its
 * number appears in THIS tool's result.
 */
import { traced } from "@weavehacks/observability";
import type { ToolSpec } from "@weavehacks/runtime";
import { REVIEWS } from "@weavehacks/seed";

/** Computed review stats — the numbers a Content claim can be grounded against. */
export function reviewStats(keyword = "broth", item?: string) {
  const total = REVIEWS.length;
  const byStars: Record<string, number> = {};
  for (const r of REVIEWS) byStars[r.stars] = (byStars[r.stars] ?? 0) + 1;
  const avgStars = Math.round((REVIEWS.reduce((s, r) => s + r.stars, 0) / total) * 10) / 10;
  const fiveStar = REVIEWS.filter((r) => r.stars === 5);
  const kw = keyword.toLowerCase();
  const inText = REVIEWS.filter((r) => r.text.toLowerCase().includes(kw));
  const fiveStarInText = fiveStar.filter((r) => r.text.toLowerCase().includes(kw));
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

  const out: Record<string, unknown> = {
    totalReviews: total,
    avgStars,
    byStars,
    fiveStarCount: fiveStar.length,
    keyword,
    keywordMentions: inText.length,
    keywordPct: pct(inText.length, total),
    fiveStarKeywordMentions: fiveStarInText.length,
    fiveStarKeywordPct: pct(fiveStarInText.length, fiveStar.length),
  };
  if (item) {
    const m = REVIEWS.filter((r) => r.mentions?.includes(item));
    out.item = item;
    out.itemMentions = m.length;
    out.itemMentionPct = pct(m.length, total);
  }
  return out;
}

export const reviewStatsTool: ToolSpec = {
  name: "review_stats",
  description:
    "Computed customer-review stats to ground a marketing claim: total reviews, avg stars, star " +
    "breakdown, and how many reviews (overall and among 5★) whose TEXT mentions a keyword (e.g. " +
    "'broth'). Optionally pass an item id to get how many reviews mention it. Use these EXACT numbers.",
  parameters: {
    type: "object",
    properties: {
      keyword: { type: "string", description: "text keyword to count, e.g. 'broth' (default 'broth')" },
      item: { type: "string", description: "optional menu item id, e.g. 'tonkotsu_ramen'" },
    },
    additionalProperties: false,
  },
  execute: traced("tool.review_stats", ({ keyword, item }: { keyword?: string; item?: string }) =>
    reviewStats(keyword ?? "broth", item),
  ),
};

export const getReviewsTool: ToolSpec = {
  name: "get_reviews",
  description: "Raw customer reviews (stars + text + which items they mention). Optionally filter by minimum stars.",
  parameters: {
    type: "object",
    properties: { minStars: { type: "integer", minimum: 1, maximum: 5, description: "only reviews with at least this many stars" } },
    additionalProperties: false,
  },
  execute: traced("tool.get_reviews", ({ minStars }: { minStars?: number }) =>
    REVIEWS.filter((r) => r.stars >= (minStars ?? 1)),
  ),
};

export const REVIEW_TOOLS: ToolSpec[] = [reviewStatsTool, getReviewsTool];
