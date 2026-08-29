import { describe, expect, it } from "vitest";
import { baselineCountForRange } from "./pipeline";
import type { CountSnapshot, OriginRecords } from "./weekly";

describe("pipeline range baselines", () => {
  it("skips snapshots that omit a temporarily missing account", () => {
    const history: CountSnapshot[] = [
      {
        t: "2026-07-17T04:26:20.000Z",
        counts: { "mann.ascends": 12_015 },
      },
      {
        t: "2026-07-19T04:00:00.000Z",
        counts: { alpha: 100 },
      },
      {
        t: "2026-08-18T20:00:00.000Z",
        counts: { "mann.ascends": 76_000, alpha: 150 },
      },
    ];
    const origins: OriginRecords = {
      "mann.ascends": {
        t: "2026-07-17T04:26:20.000Z",
        count: 12_015,
      },
    };

    expect(
      baselineCountForRange(
        history,
        origins,
        "mann.ascends",
        "month",
        new Date("2026-08-19T20:00:00.000Z").getTime(),
      ),
    ).toBe(12_015);
  });

  it("uses a new account's origin when the selected window predates it", () => {
    const history: CountSnapshot[] = [
      { t: "2026-08-18T20:00:00.000Z", counts: { newcomer: 500 } },
    ];
    const origins: OriginRecords = {
      newcomer: { t: "2026-08-18T20:00:00.000Z", count: 500 },
    };

    expect(
      baselineCountForRange(
        history,
        origins,
        "newcomer",
        "month",
        new Date("2026-08-19T20:00:00.000Z").getTime(),
      ),
    ).toBe(500);
  });

  it("keeps range baselines continuous across a renamed handle", () => {
    const history: CountSnapshot[] = [
      {
        t: "2026-07-20T20:00:00.000Z",
        counts: { "aryan.builds07": 599 },
      },
      {
        t: "2026-08-27T20:00:00.000Z",
        counts: { "aryan.builds07": 610 },
      },
    ];
    const origins: OriginRecords = {
      "aryan.builds07": {
        t: "2026-07-20T20:00:00.000Z",
        count: 599,
      },
    };

    expect(
      baselineCountForRange(
        history,
        origins,
        "aryan_builds07",
        "all",
        new Date("2026-08-28T20:00:00.000Z").getTime(),
        ["aryan.builds07"],
      ),
    ).toBe(599);
    expect(
      baselineCountForRange(
        history,
        origins,
        "aryan_builds07",
        "day",
        new Date("2026-08-28T20:00:00.000Z").getTime(),
        ["aryan.builds07"],
      ),
    ).toBe(610);
  });
});
