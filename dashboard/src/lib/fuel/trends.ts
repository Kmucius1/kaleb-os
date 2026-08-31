// Trends, not verdicts.
//
// The brief is explicit: use trends to provide insight rather than obsessing
// over individual-day numbers. So nothing here reports a single day as good or
// bad. Weight is a seven-day average because daily weight is mostly water;
// protein is a hit-rate across the week; training is a count against the
// policy, not a streak that a scheduled rest day can break.
//
// Pure module — the caller supplies the rows.

export type DayFuel = {
  date: string;
  /** Confirmed meals only. An unconfirmed estimate is not a fact. */
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  produce_servings: number;
  meals: number;
  /** From habit_logs, when present. */
  weight_lb: number | null;
  water_oz: number | null;
  sleep_h: number | null;
  /** Did the gym actually happen? Null on a scheduled rest day. */
  trained: boolean | null;
};

export type Trend = {
  /** Seven-day mean, or null when there is not enough data to mean anything. */
  avg: number | null;
  /** Change vs the previous seven days. */
  change: number | null;
  /** How many of the seven days actually had a number. */
  samples: number;
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round = (n: number | null, dp = 1) => (n === null ? null : Math.round(n * 10 ** dp) / 10 ** dp);

/**
 * A rolling average over the last `window` days, and how it moved against the
 * window before it.
 *
 * `minSamples` exists so three weigh-ins in a fortnight do not get presented as
 * a trend. Below it, everything is null and the UI says "not enough data yet"
 * instead of drawing a confident line through noise.
 */
export function trendOf(
  days: DayFuel[],
  pick: (d: DayFuel) => number | null,
  opts: { window?: number; minSamples?: number; dp?: number } = {},
): Trend {
  const window = opts.window ?? 7;
  const minSamples = opts.minSamples ?? 3;
  const dp = opts.dp ?? 1;

  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const recent = sorted.slice(-window);
  const prior = sorted.slice(-window * 2, -window);

  const rv = recent.map(pick).filter((v): v is number => v !== null && Number.isFinite(v));
  const pv = prior.map(pick).filter((v): v is number => v !== null && Number.isFinite(v));

  if (rv.length < minSamples) return { avg: null, change: null, samples: rv.length };

  const avg = mean(rv)!;
  const prevAvg = pv.length >= minSamples ? mean(pv) : null;
  return {
    avg: round(avg, dp),
    change: prevAvg === null ? null : round(avg - prevAvg, dp),
    samples: rv.length,
  };
}

/** How often a daily target was actually met, across the days that have data. */
export function hitRate(days: DayFuel[], pick: (d: DayFuel) => number | null, target: number) {
  const withData = days.filter(d => pick(d) !== null)
  const hits = withData.filter(d => (pick(d) as number) >= target).length
  return { hits, of: withData.length, pct: withData.length ? Math.round((hits / withData.length) * 100) : null }
}

/**
 * Did this day show any sign of the system being used at all?
 *
 * Without this, a stretch of days before Kaleb started tracking reads as a
 * stretch of failures. The schedule asks for four sessions a week whether or
 * not anyone is listening, and "you trained 0 of 21" on the day you open the
 * app is both false and discouraging.
 */
export const hasSignal = (d: DayFuel) =>
  d.meals > 0 || d.weight_lb !== null || d.water_oz !== null || d.sleep_h !== null || d.trained === true

/** Sessions actually trained, against the days the rhythm asked for one —
 *  counting only days he was actually using the system. */
export function trainingFrequency(days: DayFuel[]) {
  const active = days.filter(hasSignal)
  const asked = active.filter(d => d.trained !== null)
  const done = asked.filter(d => d.trained === true).length
  return { done, asked: asked.length }
}

export type Insight = { text: string; tone: 'good' | 'watch' | 'neutral' }

/**
 * Plain-language reads on the trend.
 *
 * Two rules, both deliberate:
 *   1. Never comment on a single day. "You ate 1,200 calories yesterday" is
 *      noise and invites the wrong behaviour.
 *   2. Say nothing rather than say something thin. An insight built on two
 *      data points is worse than an empty state, because it will be believed.
 */
export function insightsFor(days: DayFuel[], targets: { protein: number; weightGoal?: number }): Insight[] {
  const out: Insight[] = []

  const weight = trendOf(days, d => d.weight_lb, { minSamples: 3 })
  if (weight.avg !== null) {
    if (weight.change === null) {
      out.push({ text: `Weight is averaging ${weight.avg} lb over ${weight.samples} weigh-ins. One more week and this becomes a trend.`, tone: 'neutral' })
    } else if (Math.abs(weight.change) < 0.3) {
      out.push({ text: `Weight is holding at ${weight.avg} lb on a 7-day average. Flat is flat — nothing to react to.`, tone: 'neutral' })
    } else if (weight.change > 0) {
      out.push({ text: `Weight is up ${weight.change} lb on a 7-day average, at ${weight.avg} lb. That is the direction you want on a lifting block.`, tone: 'good' })
    } else {
      out.push({ text: `Weight is down ${Math.abs(weight.change)} lb on a 7-day average, at ${weight.avg} lb. If you are trying to add muscle, eat more.`, tone: 'watch' })
    }
  }

  const protein = hitRate(days, d => (d.meals > 0 ? d.protein_g : null), targets.protein)
  if (protein.of >= 3) {
    const tone: Insight['tone'] = protein.pct! >= 70 ? 'good' : 'watch'
    out.push({
      text: `Protein hit ${targets.protein}g on ${protein.hits} of ${protein.of} logged days. ${
        protein.pct! >= 70 ? 'That consistency is what builds the muscle.' : 'Consistency here matters more than any single day.'
      }`,
      tone,
    })
  }

  // Named window, so "3 of 4" cannot be mistaken for a month.
  const week = days.slice(-7)
  const training = trainingFrequency(week)
  if (training.asked >= 3) {
    out.push({
      text: `Trained ${training.done} of the ${training.asked} sessions this week's schedule asked for. Rest days are not counted against you.`,
      tone: training.done >= training.asked - 1 ? 'good' : 'watch',
    })
  }

  const sleep = trendOf(days, d => d.sleep_h, { minSamples: 3 })
  if (sleep.avg !== null && sleep.avg < 7.5) {
    out.push({ text: `Sleep is averaging ${sleep.avg}h. Recovery is where the training actually turns into muscle.`, tone: 'watch' })
  }

  return out
}
