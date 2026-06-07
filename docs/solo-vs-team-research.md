# Solo vs Team on Le Kyoto — Research Findings

**Date:** 2026-06-06 · **Data:** real Hiboutik POS, `packages/seed/data/pos.json` (1475 open services, 2023-06-01 → 2026-06-05) · **Method:** ~30 AI agents (parallel exploration + 9 adversarial verifiers across 2 workflows) backtesting on a hidden holdout.

> **The question we had to answer honestly before building:** does a multi-agent *team* beat a *solo* agent **by a big, defensible margin** on Le Kyoto demand forecasting / prep — provable with a number?

---

## TL;DR

1. **On prediction ACCURACY, there is no honest, big solo-vs-team gap.** We tested 6 forecasters and 6 operational framings. Every "team win" collapsed under adversarial verification to **1–2 scalars a single agent already owns** (a growth term + a cost buffer). The headline gaps (7–10%) became **−1.5% to −2.1%** once the solo was allowed the obvious one-line fix. A judge who knows undergraduate inventory theory sinks the accuracy demo with one question.
2. **Why:** the predictable structure in this data is ~2 numbers (growth +23%/yr, asymmetric prep cost). The high-variance "spike" nights are **irreducible noise** — they carry no advance flag. Context signals (weather/football/events) are either noise or move the **product mix**, not the total.
3. **Where the big honest gap DOES live:** **grounding / hallucination of a composite operations output** (the prep brief and weekly operator recommendations). A solo LLM emits *plausible-but-wrong* operational claims; a **Critic that checks every claim against the real POS data** drives ungrounded claims from a majority to ~zero. This is **big, visible, honest, and operational** (not marketing). It is the CLAUDE.md Critic mechanism pointed at the **prep brief** instead of an Instagram post.

The forecasting analysis is **not wasted** — it becomes the **ground-truth fact-base** the Critic enforces.

---

## 1. What we tested, and what it actually scored (the negative result)

### 1a. Forecaster leaderboard — sMAPE on per-service total items (hidden holdout, lower = better)

| Forecaster | sMAPE | Type | Note |
|---|---|---|---|
| naive (day×service mean) | 41.5% | solo (weak) | sanity anchor |
| season (day×service×season) | 42.1% | solo | season **hurts** — flips out-of-sample |
| **trend (mean × growth)** | **39.6%** | **best honest solo** | growth is the only big total effect |
| fair-solo (season+trend+recency) | 40.7% | solo | extra tricks backfire |
| team-context (+foot/events/météo) | 39.6% | team | context adds nothing |
| team-mix (+weather mix reshape) | 39.5% | team | mix is invisible to a totals metric |

**Team edge over the best honest solo = 0.15 pt** — invisible, within noise, and shown by 3 verifiers to be a **growth-cap artifact, not context**. Turning the context signals *on* in the total forecast makes it **0.11 pt worse** (learned factors are noise).

### 1b. Signal-importance ablation (leave-one-out, across targets)

Removing a signal and measuring the error change. Positive = the signal helps; negative = it is noise the model is better without.

| Signal | Importance on total sMAPE | Verdict |
|---|---|---|
| **trend (growth)** | **+2.02** | the only real lever — KEEP |
| rain | +0.14 | marginal |
| school_break | +0.02 | flat |
| temp | −0.05 | noise |
| commercial | −0.06 | noise |
| **football_count** | **−0.14** | **noise — model is better without it** |
| season | −0.22 | noise (worst) |

### 1c. The 6 "big-gap" operational framings — claimed vs honest (after adversarial verification)

| Framing | Claimed gap | Honest gap | Why it collapsed |
|---|---|---|---|
| newsvendor (stockout+waste €) | 7.8% | **−1.5%** | a solo scaling its forecast by **one** learned factor beats the team |
| horizon (week-ahead prep €) | 10.1% | **−1.8%** | a solo with a newsvendor buffer beats the team; "compounding" is false (solo bias ≈ 0) |
| per-product prep € | 7.6% | **~0%** | half is the growth scalar; team **loses** on raw items mis-prepped |
| spikes (top-decile nights) | 0.8% | ~0% | only **3 of 112** spikes carry any flag — they're the regular weekend rush, not events |
| tail (big-miss days) | −1.9% | −1.9% | **worse**; the € win is all safety-stock (solo-ownable) |
| multi-lens max-regret | −2.1% | −2.1% | a single **recency** lens ties/beats the team; worst-case = irreducible spikes |

**The recurring pattern:** every apparent team win is either (a) the **growth** correction or (b) the **cost buffer** — both of which a *single* cost-aware agent computes in one line. Deny the solo those one-liners and you have a **strawman**; grant them and the gap **vanishes or reverses**.

---

## 2. Why accuracy can't separate solo from team here

- **Irreducible per-service noise** is ±10–15 items on a ~25-item service. Any method floors out around ~40% sMAPE. The space *between* methods is tiny.
- **The predictable part is ~2 scalars.** Growth (+23%/yr) is a global level shift; asymmetric cost is one quantile. A single agent holds both. Multi-agent coordination buys nothing a scalar doesn't.
- **The spikes are unpredictable from these signals.** The top-decile nights are mostly the weekend dinner rush amplified by growth; they carry **no advance flag** (events arrays empty, football is noise). No lens-reconciling team can win on what no lens can see.
- **Context signals move the MIX, not the total** — real but small in absolute items, and invisible to a totals metric.

---

## 3. What IS real in the data (the grounding fact-base)

These are **true, verified facts** — the gold the demo should stand on. They are also exactly the claims a naive solo gets *wrong*.

| # | Fact (verified on real data) | Number |
|---|---|---|
| 1 | **Growth** — the restaurant is growing | 20.0 → 23.8 → 25.8 → 26.7 items/service (2023→2026, **+33%**) |
| 2 | **Day×service structure** — nights are NOT similar | Friday dinner **36.9** vs Tuesday dinner **24.7** (1.5×); Sat dinner 31.9 |
| 3 | **Top dinner products** are hot/shareable, **not sushi** | Nems, Gyozas, Ramen Bœuf, Brochettes Bœuf, Soupe Miso, Yakisoba |
| 4 | **Weather reshapes the MIX** | hot-dish share **40.3%** cold/rainy vs **33.2%** warm/sunny (**+7.1pp**) |
| 5 | **Saint-Valentin** — the one real, repeating spike | dinner **+61 / +72 / +30** items over a normal same-weekday dinner (2024/25/26) |
| 6 | **football_count is noise** | corr(football, dinner items) = **0.09** ≈ 0; 18 "matches" on a dead Wednesday = 19 covers |

---

## 4. The honest big-gap reframe: grounding, not accuracy

**Move the contest from "predict the number" to "produce a prep brief whose every claim is grounded in real data."**

A composite operations output (the Friday prep brief; the weekly operator recommendations) is **rich**: quantities + *which* dishes + *why* + risk flags. A **solo LLM** asked "what should I prep Friday?" anchors on priors and intuition and emits **plausible-but-wrong** claims. A **team with a Critic** that checks each claim against the POS data drives ungrounded claims to ~zero — the CLAUDE.md target of **0 ungrounded claims in approved output**.

**The metric** (named in CLAUDE.md): **% of claims grounded in a real data source**, plus the Critic's quality score. This is where solo and team separate **visibly and honestly** — because the solo genuinely makes the mistakes below.

### Grounding test cases — the naive claim vs the data truth (the demo's spine)

| A naive SOLO will say… | …the data says (Critic blocks) |
|---|---|
| "All nights are similar, prep the average." | Friday dinner is **1.5×** Tuesday dinner. Prep per night. |
| "Last year's Friday average is fine." | You've grown **+33%**; year-1 average **under-preps ~5 items/service** → chronic stockouts. |
| "It's a sushi spot — prep sushi & maki." | Top dinner sellers are **Nems, Gyozas, Ramen, Brochettes, Miso** (hot/shareable), not sushi. |
| "Rainy Friday → cold soba drops, skip it." *(the current CLAUDE.md narrative)* | Cold-dish share is **flat** in rain (21.4%→20.8%); it's **hot dishes that rise +2.4pp**. The intuition is wrong. |
| "Big football night → prep way more." | football_count correlation ≈ **0**. Not a usable signal. |
| "Valentine's is just another Friday." | Valentine's dinner is **+30 to +72 items**. The one spike worth pre-prepping for. |

> **Demo line:** *"The solo's prep brief had 6 confident claims; the Critic traced them to the POS and 4 were wrong — it even refuted our own folklore about rain and soba. The team's brief: every claim grounded, 0 ungrounded. Here's the Weave trace."*

This is **operations, not marketing**; it revives the **one mechanism that yields a big honest gap** (solo hallucinates → Critic grounds → visible jump); and it **uses everything** the forecasting research produced as the ground truth.

---

## 5. Recommendation & open decision

1. **Do NOT stage forecast-accuracy as the solo-vs-team thesis.** It has no honest big gap and collapses under one judge question. (Keep the trend-corrected forecast + weather-mix as the *content* of the prep brief — it's genuinely useful for the operator and `apps/web`, just not the thesis metric.)
2. **Stage the GROUNDING gap** on the prep brief / weekly recommendations: solo's ungrounded/hallucinated claims vs the Critic-grounded team. Metric = **% claims grounded** (+ Critic quality score). Big, visible, honest, operational.
3. **The 6 grounding test cases above are the ready-made Critic scenarios.**

**Open question for the team (touches the scoreboard definition — founder call):** adopt the grounding-of-prep-brief framing as the thesis metric? It is the CLAUDE.md Critic mechanism applied to operations rather than marketing. Note: unlike the backtests above, the grounding gap is measured by running the actual LLM agents (the product) — it is not a deterministic backtest — but it is where the multi-agent setup genuinely earns its place on this data.

---

### Reproduce

Deterministic scripts (no LLM, no credits): `/tmp/strat_*.mjs` (forecasters), `/tmp/effect_*.mjs` (signal effects), `/tmp/ablation.mjs` (signal importance), `/tmp/gap_*.mjs` (the 6 framings), `/tmp/grounding.mjs` (the fact-base above). Split: train `< 2024-06-01` (478 services, visible) / holdout `>=` (997, hidden).

---

## ADDENDUM 2026-06-07-bis — re-point to review-recovery + GRPR (the current headline)

The grounding-on-a-marketing-post framing (above) was the right *mechanism* but the wrong *surface*: it rested on a SINGLE post where a strong solo is often already grounded (hence the `HONESTY GUARD` that stops us claiming a fake gap). Two fixes, one move — **re-point the same mechanism at a sharper task.**

**The task:** turn one real customer review into a recovery package — incident **triage**, a **grounded public reply**, and an **internal action ticket**. This is open generation *under a truth constraint*, which is exactly where the literature says multi-agent gains are real (generation → grounding → independent critique), and where a hallucination is obviously costly (wrong hours/ingredient, an over-promised refund) — so an independent Verifier has a genuine reason to exist.

**The metric — GRPR (Grounded Recovery Pass Rate):** a hard **binary conjunctive pass rate over ~50 cases**, not a 1-shot % and not a /10 score. Per case, `pass` = triage correct ∧ all ledger claims grounded (mechanical, via the SAME `checkGrounding`) ∧ policy OK (disclosures present, no forbidden claim / over-promise) ∧ ticket valid. Three rows: `solo` < `team` < `team+memory`, same model + tools, only the Verifier (then memory) differs.

**Why this is the unfakeable proof, where the post wasn't:**
- A **rate over N held-out cases** is far more robust than a delta on one output — and it gives the gap room to appear honestly.
- The headline stays **mechanical** (no LLM judge): grounding reuses `checkGrounding`, triage/ticket are deterministic, policy is rules + a narrow over-promise judge only.
- **Toggle the Verifier off → GRPR collapses.** A judge can run that live.
- **Self-improvement is visible twice:** within session (v1→v2 rewrites) and across runs (Redis failure-cards → `team+memory`), tested with a chronological split (no leakage). Honest guard: if `team+memory` doesn't beat `team` cleanly, fall back to the v1→v2 beat and report it.

**What we keep from the prior work:** ~80% of the engine — the domain-agnostic spine, `checkGrounding`, the compute-parity guards, and the Critic-rewrite loop — plus the on-stage *theater* (specialized context agents + the live v1→v2 rewrite), now run on the recovery task. The forecast stays as honest operator-facing content for `apps/web`, NOT the thesis. See `CLAUDE.md` → RESOLVED DECISIONS 2026-06-07-bis, and `docs/demo-script.md`.
