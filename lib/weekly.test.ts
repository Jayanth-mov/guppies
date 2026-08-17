import { describe, expect, it } from "vitest";
import {
  buildWeeklyArchive,
  weekStartISO,
  type CountSnapshot,
  type WeeklySnapshot,
} from "./weekly";

const TZ = "America/Chicago";

describe("weekly archive", () => {
  it("anchors weeks to Sunday midnight in Chicago", () => {
    expect(weekStartISO(new Date("2026-07-22T18:00:00Z"), TZ)).toBe(
      "2026-07-19T05:00:00.000Z",
    );
    expect(weekStartISO(new Date("2026-11-04T18:00:00Z"), TZ)).toBe(
      "2026-11-01T05:00:00.000Z",
    );
    expect(weekStartISO(new Date("2026-11-08T18:00:00Z"), TZ)).toBe(
      "2026-11-08T06:00:00.000Z",
    );
  });

  it("starts on July 19 and selects the first snapshot in each week", () => {
    const history: CountSnapshot[] = [
      { t: "2026-07-17T04:26:20Z", counts: { alpha: 10 } },
      { t: "2026-07-19T05:02:00Z", counts: { alpha: 11 } },
      { t: "2026-07-19T06:02:00Z", counts: { alpha: 12 } },
      { t: "2026-07-26T05:03:00Z", counts: { alpha: 15 } },
    ];

    expect(buildWeeklyArchive([], history, TZ)).toEqual([
      {
        weekStart: "2026-07-19T05:00:00.000Z",
        capturedAt: "2026-07-19T05:02:00Z",
        counts: { alpha: 11 },
      },
      {
        weekStart: "2026-07-26T05:00:00.000Z",
        capturedAt: "2026-07-26T05:03:00Z",
        counts: { alpha: 15 },
      },
    ]);
  });

  it("never rewrites a week that is already archived", () => {
    const existing: WeeklySnapshot[] = [
      {
        weekStart: "2026-07-19T05:00:00.000Z",
        capturedAt: "2026-07-19T05:10:00Z",
        counts: { alpha: 10 },
      },
    ];
    const history: CountSnapshot[] = [
      { t: "2026-07-19T05:01:00Z", counts: { alpha: 999 } },
    ];

    expect(buildWeeklyArchive(existing, history, TZ)).toEqual(existing);
  });
});
