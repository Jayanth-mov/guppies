export const WEEKLY_ARCHIVE_START_DATE = "2026-07-19";

export interface CountSnapshot {
  t: string;
  counts: Record<string, number>;
}

export interface WeeklySnapshot {
  /** Sunday 12:00am in the configured timezone, stored as an ISO instant. */
  weekStart: string;
  /** Actual snapshot selected: the first successful refresh that Sunday. */
  capturedAt: string;
  counts: Record<string, number>;
}

export interface WeeklyHistoryPayload {
  timezone: string;
  startsOn: string;
  weeks: WeeklySnapshot[];
}

function tzOffsetMs(tz: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const p = Object.fromEntries(
    dtf
      .formatToParts(at)
      .filter((x) => x.type !== "literal")
      .map((x) => [x.type, x.value]),
  ) as Record<string, string>;
  const asUTC = Date.UTC(
    +p.year,
    +p.month - 1,
    +p.day,
    +p.hour % 24,
    +p.minute,
    +p.second,
  );
  // Intl exposes whole seconds, so remove the input's millisecond remainder
  // before calculating the offset. Otherwise every source snapshot's random
  // milliseconds leak into its computed Sunday boundary and create duplicate
  // week keys.
  const atWholeSecond = Math.floor(at.getTime() / 1000) * 1000;
  return asUTC - atWholeSecond;
}

/** Sunday 12:00am in `tz`, returned as the corresponding ISO instant. */
export function weekStartISO(now: Date, tz: string): string {
  const offset = tzOffsetMs(tz, now);
  const wall = new Date(now.getTime() + offset); // wall clock as pseudo-UTC
  const sundayWall = Date.UTC(
    wall.getUTCFullYear(),
    wall.getUTCMonth(),
    wall.getUTCDate() - wall.getUTCDay(),
  );
  // Convert wall midnight back to a real instant; the second pass corrects
  // for a DST transition between `now` and the Sunday boundary.
  let utc = sundayWall - offset;
  utc = sundayWall - tzOffsetMs(tz, new Date(utc));
  return new Date(utc).toISOString();
}

function archiveStartISO(tz: string): string {
  // Noon UTC is safely inside July 19 for America/Chicago; weekStartISO turns
  // it into that Sunday's exact local-midnight instant (05:00Z during CDT).
  return weekStartISO(new Date("2026-07-19T12:00:00.000Z"), tz);
}

/**
 * Adds the first successful snapshot in every Sunday-anchored week. Existing
 * entries always win, which makes archived weeks immutable once preserved.
 */
export function buildWeeklyArchive(
  existing: WeeklySnapshot[],
  history: CountSnapshot[],
  timezone: string,
): WeeklySnapshot[] {
  const startsAt = archiveStartISO(timezone);
  const byWeek = new Map<string, WeeklySnapshot>();

  for (const snapshot of existing) {
    if (snapshot.weekStart >= startsAt) {
      byWeek.set(snapshot.weekStart, snapshot);
    }
  }

  const chronological = history
    .filter((snapshot) => Number.isFinite(new Date(snapshot.t).getTime()))
    .slice()
    .sort((a, b) => a.t.localeCompare(b.t));

  for (const snapshot of chronological) {
    const weekStart = weekStartISO(new Date(snapshot.t), timezone);
    if (weekStart < startsAt || byWeek.has(weekStart)) continue;
    byWeek.set(weekStart, {
      weekStart,
      capturedAt: snapshot.t,
      counts: { ...snapshot.counts },
    });
  }

  return [...byWeek.values()].sort((a, b) =>
    a.weekStart.localeCompare(b.weekStart),
  );
}
