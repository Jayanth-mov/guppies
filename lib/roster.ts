import raw from "../data/accounts.json";
import {
  Species,
  depthFor,
  speciesFor,
  speciesIndexFor,
  widthFor,
} from "./species";
import type { WeeklyHistoryPayload, WeeklySnapshot } from "./weekly";

// Comparison windows offered by the leaderboard's range selector.
export type RangeKey = "latest" | "day" | "week" | "month" | "all";
export const RANGE_KEYS: RangeKey[] = [
  "latest",
  "day",
  "week",
  "month",
  "all",
];

// Follower change + percent over a window; null until history reaches back far
// enough for an honest baseline.
export interface RangeStat {
  change: number;
  pct: number;
}
export type Stats = Record<RangeKey, RangeStat | null>;

export function emptyStats(): Stats {
  return { latest: null, day: null, week: null, month: null, all: null };
}

// Never expose Meta's short-lived signed CDN URL as an image src. The stable
// same-origin endpoint caches the image bytes for a month and refreshes them
// from the latest snapshot when that cache expires.
export function avatarProxyUrl(handle: string): string {
  return `/api/avatar/${encodeURIComponent(handle)}`;
}

export interface FishEntry {
  handle: string;
  name: string;
  followers: number;
  avatarUrl: string | null; // live profile picture; refreshed on every fetch
  stats: Stats; // change/pct per window; null entries until history exists
  species: Species;
  speciesIndex: number;
  depth: number; // 0 = surface, 1 = seabed
  size: number; // rendered width px, scaled within the species range
  rank: number; // by followers, 1 = deepest
  isHost: boolean;
}

interface RawAccount {
  handle: string;
  name: string;
  followers: number;
  avatarUrl: string | null;
  stats: Stats;
}

// Seam for the live pipeline. The future source reads cached business_discovery
// snapshots from KV — and must special-case the host account, whose own count
// comes from GET /{host-ig-user-id}?fields=followers_count instead.
export interface RosterSource {
  hostHandle: string;
  /** ISO timestamp of the snapshot the counts came from. */
  lastUpdated: string;
  fetchRoster(): RawAccount[];
}

// Shape of a row in accounts.json. `followers` / `profilePictureUrl` are the
// real fields written by scripts/fetch-followers.mjs (absent until it runs);
// the mock* fields are the fabricated fallback. Deltas stay mock until the
// cron accumulates snapshot history to diff against.
// A row in accounts.json. `followers` / `profilePictureUrl` are live values
// written by scripts/fetch-followers.mjs; a freshly added handle needs only
// { handle } and sits at the surface until the next fetch.
interface AccountRow {
  handle: string;
  name?: string;
  followers?: number;
  profilePictureUrl?: string;
  /** Product-level membership date when legacy data predates roster entry. */
  historyStartsOn?: string;
  /** Preserve a continuous historical identity across handle/API gaps. */
  alwaysShowHistory?: boolean;
  historicalHandles?: string[];
  /** Include in refreshes, but keep off the bundled fallback until verified. */
  pendingValidation?: boolean;
}

const configuredAccounts = raw.accounts as AccountRow[];

const localSource: RosterSource = {
  hostHandle: raw.hostAccount,
  lastUpdated: raw.lastUpdated,
  fetchRoster: () =>
    configuredAccounts.filter((a) => !a.pendingValidation).map((a) => ({
      handle: a.handle,
      name: a.name ?? a.handle,
      followers: a.followers ?? 0,
      avatarUrl: a.profilePictureUrl ?? null,
      // No snapshot history in the bundled file — the cron fills these once it
      // has prior snapshots to diff against.
      stats: emptyStats(),
    })),
};

export function getRoster(source: RosterSource = localSource): FishEntry[] {
  return source
    .fetchRoster()
    .slice()
    .sort((a, b) => b.followers - a.followers)
    .map((r, i) => ({
      ...r,
      species: speciesFor(r.followers),
      speciesIndex: speciesIndexFor(r.followers),
      depth: depthFor(r.followers),
      size: Math.round(widthFor(r.followers)),
      rank: i + 1,
      isHost: r.handle === source.hostHandle,
    }));
}

export function getLastUpdated(source: RosterSource = localSource): string {
  return source.lastUpdated;
}

// ---- live pipeline data ----
// Shape served by /api/roster (written to Redis by the cron in lib/pipeline.ts).

export interface LiveAccount {
  handle: string;
  name?: string;
  followers: number;
  avatarUrl: string | null;
  stats: Stats;
}

export interface LiveRoster {
  lastUpdated: string;
  hostAccount: string;
  accounts: LiveAccount[];
  snapshots?: number; // count of stored snapshots (persistence diagnostic)
  failed?: { handle: string; reason: string }[]; // handles business_discovery skipped this run
}

export function sourceFromLive(live: LiveRoster): RosterSource {
  return {
    hostHandle: live.hostAccount,
    lastUpdated: live.lastUpdated,
    fetchRoster: () =>
      live.accounts.map((a) => ({
        handle: a.handle,
        name: a.name ?? a.handle,
        followers: a.followers,
        avatarUrl: a.avatarUrl,
        // Older cached live snapshots predate newer range keys. Fill them so
        // the client can switch ranges safely during a rolling deployment.
        stats: { ...emptyStats(), ...(a.stats ?? {}) },
      })),
  };
}

interface HistoricalValue {
  followers: number;
  stats: Stats;
}

function zeroStats(): Stats {
  return Object.fromEntries(
    RANGE_KEYS.map((key) => [key, { change: 0, pct: 0 }]),
  ) as Stats;
}

function valueInSnapshot(
  snapshot: WeeklySnapshot,
  handles: string[],
): HistoricalValue | null {
  for (const handle of handles) {
    const followers = snapshot.counts[handle];
    if (followers === undefined) continue;
    return {
      followers,
      stats: { ...emptyStats(), ...(snapshot.stats?.[handle] ?? {}) },
    };
  }
  return null;
}

function continuousHistoricalValue(
  history: WeeklyHistoryPayload,
  snapshotIndex: number,
  handles: string[],
): HistoricalValue | null {
  // If an identity temporarily disappears, carry its last real observation.
  for (let index = snapshotIndex - 1; index >= 0; index--) {
    const previous = valueInSnapshot(history.weeks[index], handles);
    if (previous) return previous;
  }

  const origin = handles
    .map((handle) => history.origins?.[handle])
    .filter((record) => record !== undefined)
    .sort((a, b) => a.t.localeCompare(b.t))[0];
  if (origin) {
    return {
      followers: origin.count,
      stats: origin.count > 0 ? zeroStats() : emptyStats(),
    };
  }

  // Mann's only gap predates his first archived canonical-handle snapshot.
  // Recover the immutable origin from that later row's all-time delta rather
  // than pretending his much-larger later count existed in the first week.
  for (let index = snapshotIndex + 1; index < history.weeks.length; index++) {
    const later = valueInSnapshot(history.weeks[index], handles);
    if (!later) continue;
    const origin = later.stats.all
      ? Math.round(later.followers - later.stats.all.change)
      : later.followers;
    return {
      followers: origin,
      stats: origin > 0 ? zeroStats() : emptyStats(),
    };
  }
  return null;
}

/**
 * Adapts one permanent weekly snapshot into the same source used by the live
 * ocean. Snapshot membership is authoritative: accounts without a count do
 * not appear, except explicitly continuous identities such as Mann.
 */
export function sourceFromWeekly(
  history: WeeklyHistoryPayload,
  snapshotIndex: number,
  liveRoster: FishEntry[],
): RosterSource {
  const snapshot = history.weeks[snapshotIndex];
  const liveByHandle = new Map(
    liveRoster.map((entry) => [entry.handle, entry]),
  );
  const configuredByHandle = new Map(
    configuredAccounts.map((account) => [account.handle, account]),
  );
  const canonicalByHistoricalHandle = new Map<string, string>();
  for (const account of configuredAccounts) {
    for (const historical of account.historicalHandles ?? []) {
      canonicalByHistoricalHandle.set(historical, account.handle);
    }
  }

  const values = new Map<string, HistoricalValue>();
  for (const handle of Object.keys(snapshot.counts)) {
    const canonical = canonicalByHistoricalHandle.get(handle) ?? handle;
    const policy = configuredByHandle.get(canonical);
    if (
      policy?.historyStartsOn &&
      snapshot.weekStart.slice(0, 10) < policy.historyStartsOn
    ) {
      continue;
    }
    const value = valueInSnapshot(snapshot, [canonical, handle]);
    if (value) values.set(canonical, value);
  }

  for (const account of configuredAccounts) {
    if (!account.alwaysShowHistory || values.has(account.handle)) continue;
    const value = continuousHistoricalValue(history, snapshotIndex, [
      account.handle,
      ...(account.historicalHandles ?? []),
    ]);
    if (value) values.set(account.handle, value);
  }

  return {
    hostHandle:
      liveRoster.find((entry) => entry.isHost)?.handle ?? raw.hostAccount,
    lastUpdated: snapshot.capturedAt,
    fetchRoster: () =>
      [...values.entries()].map(([handle, value]) => {
        const live = liveByHandle.get(handle);
        const configured = configuredByHandle.get(handle);
        return {
          handle,
          name: live?.name ?? configured?.name ?? handle,
          followers: value.followers,
          avatarUrl: live?.avatarUrl ?? null,
          stats: value.stats,
        };
      }),
  };
}
