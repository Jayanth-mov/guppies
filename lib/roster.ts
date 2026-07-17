import raw from "@/data/accounts.json";
import {
  Species,
  depthFor,
  speciesFor,
  speciesIndexFor,
  widthFor,
} from "./species";

export interface FishEntry {
  handle: string;
  name: string;
  followers: number;
  avatarUrl: string | null; // live profile picture; refreshed on every fetch
  delta: number | null; // change since last snapshot; null until history exists
  growthWeek: number | null; // growth % since Sunday 12:00am; null until history exists
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
  delta: number | null;
  growthWeek: number | null;
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
}

const localSource: RosterSource = {
  hostHandle: raw.hostAccount,
  lastUpdated: raw.lastUpdated,
  fetchRoster: () =>
    (raw.accounts as AccountRow[]).map((a) => ({
      handle: a.handle,
      name: a.name ?? a.handle,
      followers: a.followers ?? 0,
      avatarUrl: a.profilePictureUrl ?? null,
      // No snapshot history yet, so no honest delta/growth — the cron fills
      // these once it has prior snapshots to diff against.
      delta: null,
      growthWeek: null,
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
  delta: number | null;
  growthWeek: number | null;
}

export interface LiveRoster {
  lastUpdated: string;
  hostAccount: string;
  accounts: LiveAccount[];
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
        delta: a.delta,
        growthWeek: a.growthWeek,
      })),
  };
}
