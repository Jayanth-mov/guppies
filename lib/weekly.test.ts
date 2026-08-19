import { describe, expect, it } from "vitest";
import {
  buildOriginRecords,
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
    expect(weekStartISO(new Date("2026-08-17T21:03:42.963Z"), TZ)).toBe(
      "2026-08-16T05:00:00.000Z",
    );
  });

  it("starts on July 19 and selects the first snapshot in each week", () => {
    const history: CountSnapshot[] = [
      { t: "2026-07-17T04:26:20Z", counts: { alpha: 10 } },
      { t: "2026-07-19T05:02:00Z", counts: { alpha: 11 } },
      { t: "2026-07-19T06:02:00Z", counts: { alpha: 12 } },
      { t: "2026-07-26T05:03:00Z", counts: { alpha: 15 } },
    ];

    const origins = buildOriginRecords({}, history);
    expect(buildWeeklyArchive([], history, TZ, origins)).toEqual([
      expect.objectContaining({
        weekStart: "2026-07-19T05:00:00.000Z",
        capturedAt: "2026-07-19T05:02:00Z",
        counts: { alpha: 11 },
      }),
      expect.objectContaining({
        weekStart: "2026-07-26T05:00:00.000Z",
        capturedAt: "2026-07-26T05:03:00Z",
        counts: { alpha: 15 },
      }),
    ]);
    const archive = buildWeeklyArchive([], history, TZ, origins);
    expect(archive[0].stats?.alpha.all?.change).toBe(1);
    expect(archive[1].stats?.alpha.all?.change).toBe(5);
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

    const [archived] = buildWeeklyArchive(
      existing,
      history,
      TZ,
      buildOriginRecords({}, history),
    );
    expect(archived.capturedAt).toBe("2026-07-19T05:10:00Z");
    expect(archived.counts).toEqual({ alpha: 10 });
  });

  it("keeps first-seen origins after detailed history rolls forward", () => {
    const first = buildOriginRecords({}, [
      { t: "2026-07-17T04:26:20Z", counts: { alpha: 10 } },
    ]);
    expect(
      buildOriginRecords(first, [
        { t: "2026-08-17T04:26:20Z", counts: { alpha: 99, beta: 20 } },
      ]),
    ).toEqual({
      alpha: { t: "2026-07-17T04:26:20Z", count: 10 },
      beta: { t: "2026-08-17T04:26:20Z", count: 20 },
    });
  });

  it("calculates every historical range with the selected week as its endpoint", () => {
    const history: CountSnapshot[] = [
      { t: "2026-07-17T05:01:00Z", counts: { alpha: 100 } },
      { t: "2026-07-19T05:01:00Z", counts: { alpha: 110 } },
      { t: "2026-07-25T05:01:00Z", counts: { alpha: 120 } },
      { t: "2026-08-01T05:01:00Z", counts: { alpha: 130 } },
      { t: "2026-08-02T05:01:00Z", counts: { alpha: 135 } },
      { t: "2026-08-03T05:01:00Z", counts: { alpha: 999 } },
    ];
    const archive = buildWeeklyArchive(
      [],
      history,
      TZ,
      buildOriginRecords({}, history),
    );
    const augustSecond = archive.find((week) =>
      week.weekStart.startsWith("2026-08-02"),
    );

    expect(augustSecond?.stats?.alpha.latest?.change).toBe(5);
    expect(augustSecond?.stats?.alpha.day?.change).toBe(5);
    expect(augustSecond?.stats?.alpha.week?.change).toBe(15);
    expect(augustSecond?.stats?.alpha.month?.change).toBe(35);
    expect(augustSecond?.stats?.alpha.all?.change).toBe(35);
  });
});
