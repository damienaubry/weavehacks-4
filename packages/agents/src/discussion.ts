/**
 * The Brigade discussion — the starting team coordinating on a "prep for Friday" turn.
 *
 * This is the multi-agent moment: the Historian's baseline and the Scout's read of today
 * genuinely DISAGREE (an average Friday vs a rain + derby + school-holiday + strike Friday).
 * They don't just run in parallel — the Historian REACTS to the Scout's conditions and pulls
 * the matching conditional history, then Prep is forced to reconcile both into one prep sheet,
 * and the Chef escalates a big swing instead of auto-confirming.
 *
 * The whole turn is one Weave span (`brigade.friday_prep`); each station is its own op; each
 * tool call is its own op. That tree IS the demo.
 */
import { traced } from "@weavehacks/observability";
import { TARGET_DATE } from "@weavehacks/seed";
import { runStation, type StationRun } from "./stations";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface DiscussionTurn {
  speaker: string;
  /** who the turn is addressed to / its purpose */
  note: string;
  text: string;
  toolCalls: { name: string; args: unknown }[];
}

export interface DiscussionResult {
  date: string;
  weekday: string;
  turns: DiscussionTurn[];
  prepSheet: string;
  presentation: string;
}

function turnOf(run: StationRun, note: string): DiscussionTurn {
  return {
    speaker: run.name,
    note,
    text: run.text,
    toolCalls: run.toolCalls.map((t) => ({ name: t.name, args: t.args })),
  };
}

export interface DiscussionOptions {
  date?: string;
  model?: string;
  /** called after each turn so a CLI/UI can stream the discussion live */
  onTurn?: (turn: DiscussionTurn) => void;
}

async function runFridayPrepInner(opts: DiscussionOptions): Promise<DiscussionResult> {
  const date = opts.date ?? TARGET_DATE;
  const dow = new Date(`${date}T12:00:00`).getDay();
  const weekday = WEEKDAYS[dow];
  const turns: DiscussionTurn[] = [];
  const record = (run: StationRun, note: string) => {
    const t = turnOf(run, note);
    turns.push(t);
    opts.onTurn?.(t);
    return run;
  };

  // 0 — Chef frames the task and delegates.
  record(
    await runStation(
      "chef",
      `A customer request just came in: "Prep for ${weekday} dinner (${date})." In 2–3 sentences, state your plan: what you'll ask the Historian (past patterns) and the Scout (today's conditions), and that Prep will reconcile them into the prep sheet.`,
      opts,
    ),
    "delegates to Historian + Scout, then Prep",
  );

  // 1 — Historian: the naive baseline for this weekday.
  const hist = record(
    await runStation(
      "historian",
      `Give the per-item baseline for a typical ${weekday} (day-of-week ${dow}). Use demand_baseline (and orders_on to spot-check if useful). List dish ids and the average quantities you found.`,
      opts,
    ),
    "baseline for a typical " + weekday,
  );

  // 2 — Scout: what's atypical about today.
  const scout = record(
    await runStation(
      "scout",
      `For ${date}, call your tools and report what is ATYPICAL versus a normal ${weekday}, with the likely demand direction for each factor. Do not give demand numbers — just the conditions and their direction.`,
      opts,
    ),
    "today's real-world conditions",
  );

  // 3 — Historian REACTS: refine against the Scout's conditions (the discussion beat).
  const histRefine = record(
    await runStation(
      "historian",
      `The Scout reports for ${date}:\n\n${scout.text}\n\nNow pull the MATCHING conditional history with demand_by_condition (e.g. rainy ${weekday}s, past match nights) and refine your per-item expectation for THIS night. Explicitly note where it differs from your naive baseline above.`,
      opts,
    ),
    "refines baseline using Scout's conditions",
  );

  // 4 — Prep reconciles everything into one prep sheet.
  const prep = record(
    await runStation(
      "prep",
      `Target night: ${weekday} ${date}.\n\nHISTORIAN — naive baseline:\n${hist.text}\n\nHISTORIAN — refined with today's conditions:\n${histRefine.text}\n\nSCOUT — today's conditions:\n${scout.text}\n\nProduce the reconciled prep sheet. For each menu item show: baseline → adjusted quantity, and a one-line reason tied to a tool result or a station's grounded claim. Call out any BIG swing (waste or stockout risk).`,
      opts,
    ),
    "reconciles into the prep sheet",
  );

  // 5 — Chef presents + escalates big swings (HITL).
  const chef = record(
    await runStation(
      "chef",
      `Prep's sheet for ${date}:\n\n${prep.text}\n\nPresent the final plan to the owner in a few crisp lines. If any item is a big swing from a normal ${weekday} (waste/stockout risk), explicitly mark it "⚠ NEEDS OWNER OK" rather than auto-confirming.`,
      opts,
    ),
    "presents plan, flags big swings for approval",
  );

  return { date, weekday, turns, prepSheet: prep.text, presentation: chef.text };
}

/** Run the full Brigade prep discussion (one Weave span). */
export function runFridayPrep(opts: DiscussionOptions = {}): Promise<DiscussionResult> {
  return traced("brigade.friday_prep", (o: DiscussionOptions) => runFridayPrepInner(o))(opts);
}
