# Backup demo — when the live run or page fails on stage

> One rule: **never go silent and never fake a number.** If the laptop, network, or page dies, you
> switch to captured artifacts and *say so*. "We iterated on gpt-4o-mini and judged on W&B Inference —
> same harness, same three variants; here are the captured numbers and the live Weave trace." Honesty
> is part of the pitch (see [qa-defense.md](docs/qa-defense.md)).

---

## 0. Fast decision tree (what failed → what to open)

| What broke | Do this |
|---|---|
| Web `/recovery` page won't load | Open the JSON artifacts (§1) + a captured screenshot (§2); read the rows aloud. |
| `pnpm recovery` errors / no network / out of credits | Don't run live. Use the **already-captured** JSON in §1 — they're real, cached runs. |
| Weave won't load | Show a Weave **screenshot** (§2); describe the trace tree verbally (§3 line). |
| Everything is dead (no laptop) | Deliver the 20-second verbal script (§4) from memory. |

---

## 1. Captured numbers (real, on disk — read these off the file, not from memory)

These are committed/staged artifacts you can `cat` or open in the editor at any time. **All N=16 runs
share the same 9-real / 7-synthetic slice.** They disagree because N is small and generation is
stochastic — narrate that, don't hide it.

**Served-style run** — [recovery-report.json](recovery-report.json):

| variant | GRPR | producer tokens | calls |
|---|---|---|---|
| solo | 80% | 224,794 | 129 |
| team | **90%** | 150,975 | 100 |
| team+memory | 80% | 90,804 | 61 |

Drill-down `rc-real-025` (real 1★-style review, _"…il manque la moitié de la commande…"_, gold =
`wrong_or_missing_item`): **solo FAIL** (ungrounded claim "missing items in the order") · **team PASS**
(grounded ledger + 10 € credit within policy).

**Judged run** — [recovery-report.judged.json](recovery-report.judged.json) **(team loses here — be
ready, a judge may open it):**

| variant | GRPR | producer tokens | calls |
|---|---|---|---|
| solo | 80% | 553,595 | 164 |
| team | **60%** | 475,467 | 145 |
| team+memory | 80% | 254,641 | 83 |

On this run `rc-real-025`: **solo FAIL · team FAIL**. If asked: _"Yes — that's our judged run and the
team loses on it. At N=16 the spread is wider than the gap, so we sell the **mechanism**, not the rate.
Solo still spent the most compute (553k vs 475k tokens), and our harness itself printed_
`⚠ HONESTY: solo ≥ team — no attributable team win on this run`_."

**The kill-shot number** — [recovery-report-killshot.json](recovery-report-killshot.json)
(`pnpm recovery --no-verifier`, separate 8-case slice): **solo 100% · team 60% · team+memory 60%.**
Line to say: _"Remove only the Verifier and the team's grounding pass rate drops to 60% — same model,
same tools, the orchestration is the only change. (Separate, easier 8-case slice — own it.)"_

**The one robust line that holds in every run:** _"Solo spent the most compute in all three runs and
the score is mechanical — wherever the team matched or beat solo it did so on less compute, never more."_

> Quote `rescued X/Y team case(s)` (the within-session v1→v2 rescue) **only off the live CLI** `honest:`
> line — it is **not** stored in any JSON. Never invent the count.

---

## 2. Screenshots — capture these in the FS-3 dry run (not yet committed)

⚠ **No screenshots are committed yet.** During the pre-flight dry run, capture the five below into
`docs/screenshots/` so the presenter can open a file instead of going live. Until then, §1's JSON
artifacts are the real fallback. Suggested filenames (open in this order if the page is down):

1. `docs/screenshots/01-leaderboard.png` — the web `/recovery` 3-row GRPR leaderboard (with the budget
   column visible, so the parity point is on screen).
2. `docs/screenshots/02-drilldown-rc-real-025.png` — the `rc-real-025` drill-down: solo FAIL reason vs
   team PASS, **including the v1 → v2 rewrite panel** (the money shot).
3. `docs/screenshots/03-weave-case-trace.png` — one `recovery.case` Weave trace showing
   `agent.recovery.*` per station and a claim linked to the tool query that grounds it.
4. `docs/screenshots/04-cli-scoreboard.png` — the `pnpm recovery` terminal output: the three rows, the
   `parity:` line, the `honest:` note (incl. the `⚠ HONESTY` line if solo ≥ team).
5. `docs/screenshots/05-killshot.png` — the `pnpm recovery --no-verifier` terminal output (team
   collapses to 60%).

**Capture commands (run during pre-flight):**
```bash
# regenerate the artifacts so the screenshots match the live numbers
RECOVERY_REPORT_CACHE=recovery-report.json            pnpm recovery            # leaderboard + drill-down
RECOVERY_REPORT_CACHE=recovery-report-killshot.json   pnpm recovery --no-verifier
pnpm dev    # screenshot http://localhost:3000/recovery, then the Weave trace it links to
```

---

## 3. The fallback line (say it verbatim when you switch to captured material)

> _"We iterated on gpt-4o-mini and judged on W&B Inference — same harness, same three variants. The
> page is down, so here are the **captured numbers** and the **live Weave trace**. The headline isn't a
> rate we're defending — it's the **mechanism**: GRPR is mechanical, compute is matched (solo spent the
> most), and the Verifier forces a grounded rewrite you can watch claim-by-claim in Weave. Honesty is
> part of the pitch — including the judged run where the team loses."_

---

## 4. The 20-second "everything is dead" verbal script

Deliver this from memory if there is no laptop, no slides, nothing:

> _"We turn one real customer review into a recovery package — triage, a grounded public reply, an
> internal ticket — for a real restaurant we run, Le Kyoto, off our real Google reviews. The judged
> number, GRPR, is **mechanical**: every claim in the reply must trace to a real tool result, the
> policy check is canon rules, no LLM scores it. The point isn't a leaderboard rate — at 16 cases that's
> noisy and we say so; one of our own judged runs even has the team losing. The point is the
> **Verifier**: same model, same tools, the solo agent ships an ungrounded or over-promising reply, and
> an independent Verifier **blocks** it and forces a grounded rewrite — and solo, with **more** compute,
> still can't match that discipline. Toggle the Verifier off and the grounding collapses. That's the
> unfakeable part, and every claim links to the query that proves it in Weave."_

Land it: **mechanical metric · matched compute · the Verifier is load-bearing · honest about the
variance.** Those four survive any failure on stage.

---

## Pre-flight (do before going on stage)

- [ ] Decide which run `/tmp` (or `RECOVERY_REPORT_CACHE`) serves for the live page; re-warm it.
- [ ] Capture the five screenshots in §2 into `docs/screenshots/`.
- [ ] Read the live `honest:` line and write down the real `rescued X/Y` count for the v1→v2 claim.
- [ ] Rehearse the §4 verbal script once, cold.
- [ ] Be ready for a judge to open `recovery-report.judged.json` (team 60%) — the §1 rebuttal handles it.
