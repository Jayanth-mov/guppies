// Data helpers for the growth chart. Pure functions over the snapshot history,
// unit-testable like lib/species.ts.

export interface Snapshot {
  t: string; // ISO timestamp
  counts: Record<string, number>;
}

export interface SeriesPoint {
  t: number; // ms
  v: number; // metric value (followers or % growth)
}

export interface Series {
  handle: string;
  color: string;
  latest: number; // latest follower count (for legend ordering/label)
  points: SeriesPoint[];
}

export type ChartRange = "day" | "week" | "month" | "all";
export type ChartMetric = "growth" | "followers";

export const CHART_RANGES: ChartRange[] = ["day", "week", "month", "all"];

export const RANGE_LABEL: Record<ChartRange, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  all: "All",
};

const RANGE_MS: Record<Exclude<ChartRange, "all">, number> = {
  day: 24 * 3_600_000,
  week: 7 * 24 * 3_600_000,
  month: 30 * 24 * 3_600_000,
};

// distinct, dark-background-friendly line colors (cool-leaning to fit the sea)
export const LINE_COLORS = [
  "#6cf5e2",
  "#5fb0e2",
  "#a78bfa",
  "#f0a35e",
  "#ff8a7a",
  "#5ee0a0",
  "#f2c14e",
  "#7cc6ff",
  "#ff9ec4",
  "#b6e36b",
  "#4dd6f0",
  "#ff7b9c",
  "#78e6c0",
  "#e8c65a",
  "#8fa3ff",
  "#ff6f5e",
  "#63d2b0",
  "#c58bff",
];

export function colorFor(i: number): string {
  return LINE_COLORS[i % LINE_COLORS.length];
}

/** Snapshots within the range (always at least the last two, so a line exists). */
export function sliceHistory(history: Snapshot[], range: ChartRange): Snapshot[] {
  if (range === "all" || history.length < 3) return history;
  const cutoff = Date.now() - RANGE_MS[range];
  const sliced = history.filter((s) => new Date(s.t).getTime() >= cutoff);
  return sliced.length >= 2 ? sliced : history.slice(-2);
}

/** Cap the number of points per series so drawing stays cheap. */
function downsample(points: SeriesPoint[], max = 240): SeriesPoint[] {
  if (points.length <= max) return points;
  const step = points.length / max;
  const out: SeriesPoint[] = [];
  for (let i = 0; i < max; i++) out.push(points[Math.floor(i * step)]);
  out.push(points[points.length - 1]);
  return out;
}

/**
 * Build one series per handle. metric "followers" = raw counts; "growth" =
 * percent change from each handle's first value in the slice (everyone at 0%).
 * Handles are ordered by latest followers (deepest fish first) so colors and
 * legend order are stable.
 */
export function buildSeries(
  history: Snapshot[],
  metric: ChartMetric,
): Series[] {
  if (!history.length) return [];
  const handles = Object.keys(history[history.length - 1].counts);
  handles.sort(
    (a, b) =>
      (history[history.length - 1].counts[b] ?? 0) -
      (history[history.length - 1].counts[a] ?? 0),
  );

  return handles.map((handle, i) => {
    const raw: SeriesPoint[] = [];
    for (const s of history) {
      const c = s.counts[handle];
      if (c === undefined) continue;
      raw.push({ t: new Date(s.t).getTime(), v: c });
    }
    const base = raw.length ? raw[0].v : 0;
    const points =
      metric === "growth" && base > 0
        ? raw.map((p) => ({ t: p.t, v: ((p.v - base) / base) * 100 }))
        : raw;
    return {
      handle,
      color: colorFor(i),
      latest: raw.length ? raw[raw.length - 1].v : 0,
      points: downsample(points),
    };
  });
}

/** "nice" tick values covering [min, max] for a linear axis. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (min === max) return [min];
  const span = max - min;
  const step0 = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.001; v += step) ticks.push(v);
  return ticks;
}
