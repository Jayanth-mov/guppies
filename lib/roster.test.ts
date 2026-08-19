import { describe, expect, it } from "vitest";
import { emptyStats, getRoster, sourceFromWeekly } from "./roster";
import type { WeeklyHistoryPayload } from "./weekly";

function liveRoster() {
  return getRoster({
    hostHandle: "jayanth.mov",
    lastUpdated: "2026-08-19T00:00:00Z",
    fetchRoster: () => [
      {
        handle: "jayanth.mov",
        name: "Jayanth",
        followers: 100,
        avatarUrl: null,
        stats: emptyStats(),
      },
      {
        handle: "acegotchuu",
        name: "Ace",
        followers: 300,
        avatarUrl: null,
        stats: emptyStats(),
      },
      {
        handle: "mann.ascends",
        name: "Mann",
        followers: 400,
        avatarUrl: null,
        stats: emptyStats(),
      },
    ],
  });
}

const history: WeeklyHistoryPayload = {
  timezone: "America/Chicago",
  startsOn: "2026-07-19",
  weeks: [
    {
      weekStart: "2026-07-19T05:00:00.000Z",
      capturedAt: "2026-07-19T05:02:00.000Z",
      counts: { "jayanth.mov": 90, acegotchuu: 250 },
    },
    {
      weekStart: "2026-07-26T05:00:00.000Z",
      capturedAt: "2026-07-26T05:02:00.000Z",
      counts: { "jayanth.mov": 95, "mann.ascends": 200 },
      stats: {
        "mann.ascends": {
          ...emptyStats(),
          all: { change: 80, pct: 66.6667 },
        },
      },
    },
    {
      weekStart: "2026-08-16T05:00:00.000Z",
      capturedAt: "2026-08-16T05:02:00.000Z",
      counts: {
        "jayanth.mov": 100,
        acegotchuu: 300,
        "mann.ascends": 400,
      },
    },
  ],
};

describe("historical roster membership", () => {
  it("hides accounts before their curated membership start", () => {
    const roster = getRoster(sourceFromWeekly(history, 0, liveRoster()));
    expect(roster.map((entry) => entry.handle)).not.toContain("acegotchuu");
  });

  it("keeps Mann continuous and reconstructs his missing origin week", () => {
    const roster = getRoster(sourceFromWeekly(history, 0, liveRoster()));
    const mann = roster.find((entry) => entry.handle === "mann.ascends");
    expect(mann?.followers).toBe(120);
    expect(mann?.stats.all).toEqual({ change: 0, pct: 0 });
  });

  it("shows a member once its configured start week arrives", () => {
    const roster = getRoster(sourceFromWeekly(history, 2, liveRoster()));
    expect(roster.map((entry) => entry.handle)).toContain("acegotchuu");
  });
});
