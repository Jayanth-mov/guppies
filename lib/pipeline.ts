// Server-side pipeline: called by /api/cron every four hours (GitHub Actions
// scheduler), stores snapshots in Upstash Redis, and derives the change/percent
// the site shows over each comparison window (latest / day / week / month /
// all time).
// Never import this from client code.

import raw from "@/data/accounts.json";
import {
  RANGE_KEYS,
  emptyStats,
  type LiveAccount,
  type LiveRoster,
  type RangeKey,
  type Stats,
} from "./roster";
import {
  WEEKLY_ARCHIVE_START_DATE,
  buildOriginRecords,
  buildWeeklyArchive,
  type CountSnapshot,
  type OriginRecords,
  type WeeklyHistoryPayload,
  type WeeklySnapshot,
} from "./weekly";

// window length for each range; "latest" is special-cased to the prior snapshot
const RANGE_MS: Record<Exclude<RangeKey, "latest" | "all">, number> = {
  day: 24 * 3_600_000,
  week: 7 * 24 * 3_600_000,
  month: 30 * 24 * 3_600_000,
};

const GRAPH = "https://graph.facebook.com/v21.0";

const KEY_HISTORY = "guppies:history";
const KEY_LATEST = "guppies:latest";
const KEY_TOKEN = "guppies:token";
const KEY_WEEKLY = "guppies:weekly";
const KEY_ORIGINS = "guppies:origins";

// Cap on stored snapshots. At four-hour cadence 800 covers ~133 days — enough to
// back the "past month" window. Each snapshot is small (~27 handle:count
// pairs at the current roster size), so the whole history blob stays well
// under a megabyte.
const MAX_SNAPSHOTS = 800;

interface StoredToken {
  token: string;
  exchangedAt: string;
  seededFrom?: string; // the IG_ACCESS_TOKEN env value this was seeded from
}

export interface RunSummary {
  ok: boolean;
  fetched: number;
  failed: { handle: string; reason: string }[];
  lastUpdated: string;
  snapshots: number; // history length after this run
  historyReadIn: number; // history length read at the start (persistence check)
  readBack: number; // history length re-read right after writing
  weeklySnapshots: number; // permanent Sunday archive length
  origins: number; // immutable first-seen baselines retained for all-time stats
}

// ---- Redis (Upstash REST protocol; works with the Vercel marketplace vars) ----

function redisEnv(): { url: string; token: string } {
  const url =
    process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Redis env vars missing — install the Upstash for Redis integration on the Vercel project.",
    );
  }
  return { url, token };
}

async function redis(cmd: (string | number)[]): Promise<unknown> {
  const { url, token } = redisEnv();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  const json = (await res.json()) as { result?: unknown; error?: string };
  if (json.error) throw new Error(`Redis: ${json.error}`);
  return json.result;
}

async function redisGetJSON<T>(key: string): Promise<T | null> {
  const s = (await redis(["GET", key])) as string | null;
  return s ? (JSON.parse(s) as T) : null;
}

async function redisSetJSON(key: string, value: unknown): Promise<void> {
  await redis(["SET", key, JSON.stringify(value)]);
}

// ---- access token, self-refreshing ----
// Long-lived user tokens die after 60 days; a still-valid one can be exchanged
// for a fresh 60-day token. The cron re-exchanges once the stored token is 30
// days old and writes the replacement back to Redis, so nobody has to remember.

async function getWorkingToken(): Promise<string> {
  let stored = await redisGetJSON<StoredToken>(KEY_TOKEN);
  const seed = process.env.IG_ACCESS_TOKEN;

  // Adopt the env token whenever it changes — this is how an operator swaps in
  // a fresh token (e.g. after the old one is revoked). A 30-day auto-refresh
  // leaves seededFrom untouched, so it never triggers this path; only a genuine
  // env change (seededFrom !== current seed) re-seeds.
  if (seed && (!stored || stored.seededFrom !== seed)) {
    stored = {
      token: seed,
      exchangedAt: new Date().toISOString(),
      seededFrom: seed,
    };
    await redisSetJSON(KEY_TOKEN, stored);
  }

  if (!stored) {
    throw new Error(
      "No token in Redis and no IG_ACCESS_TOKEN env var to seed it with.",
    );
  }

  const ageDays =
    (Date.now() - new Date(stored.exchangedAt).getTime()) / 86_400_000;
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (ageDays > 30 && appId && appSecret) {
    const res = await fetch(
      `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${stored.token}`,
      { cache: "no-store" },
    );
    const json = (await res.json()) as { access_token?: string };
    if (json.access_token) {
      stored = {
        token: json.access_token,
        exchangedAt: new Date().toISOString(),
        seededFrom: stored.seededFrom, // keep the seed marker across refreshes
      };
      await redisSetJSON(KEY_TOKEN, stored);
    }
    // on failure, keep using the current token; it may still have weeks left
  }

  return stored.token;
}

// ---- Instagram Graph calls ----

async function graph(
  igUserId: string,
  token: string,
  fields: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(
    `${GRAPH}/${igUserId}?fields=${encodeURIComponent(fields)}&access_token=${token}`,
    { cache: "no-store" },
  );
  const json = (await res.json()) as {
    error?: {
      message: string;
      code?: number;
      error_subcode?: number;
      type?: string;
    };
    [k: string]: unknown;
  };
  if (json.error) {
    const e = json.error;
    const tag = [e.code, e.error_subcode].filter((x) => x != null).join("/");
    throw new Error(`${e.message}${tag ? ` [${e.type ?? ""} ${tag}]` : ""}`);
  }
  return json;
}

interface FetchedAccount {
  followers: number;
  avatarUrl: string | null;
}

async function fetchAccount(
  igUserId: string,
  token: string,
  handle: string,
  isHost: boolean,
): Promise<FetchedAccount> {
  if (isHost) {
    // business_discovery can't query the calling account — the host asymmetry
    const d = await graph(
      igUserId,
      token,
      "followers_count,profile_picture_url",
    );
    return {
      followers: d.followers_count as number,
      avatarUrl: (d.profile_picture_url as string) ?? null,
    };
  }
  const d = (await graph(
    igUserId,
    token,
    `business_discovery.username(${handle}){followers_count,profile_picture_url}`,
  )) as {
    business_discovery: { followers_count: number; profile_picture_url?: string };
  };
  return {
    followers: d.business_discovery.followers_count,
    avatarUrl: d.business_discovery.profile_picture_url ?? null,
  };
}

// ---- the snapshot run ----

export async function runSnapshot(): Promise<RunSummary> {
  const igUserId = process.env.IG_USER_ID;
  if (!igUserId) throw new Error("IG_USER_ID env var missing.");
  const token = await getWorkingToken();

  const host = raw.hostAccount;
  const handles = raw.accounts.map((a) => ({
    handle: a.handle,
    name: (a as { name?: string }).name,
    bundledAvatarUrl: (a as { profilePictureUrl?: string }).profilePictureUrl,
  }));

  const prevLatest = await redisGetJSON<LiveRoster>(KEY_LATEST);
  const previousByHandle = new Map(
    prevLatest?.accounts.map((account) => [account.handle, account]) ?? [],
  );
  const history = (await redisGetJSON<CountSnapshot[]>(KEY_HISTORY)) ?? [];
  const storedWeekly =
    (await redisGetJSON<WeeklySnapshot[]>(KEY_WEEKLY)) ?? [];
  const storedOrigins =
    (await redisGetJSON<OriginRecords>(KEY_ORIGINS)) ?? {};
  const origins = buildOriginRecords(storedOrigins, history);
  const prev = history[history.length - 1] ?? null;

  const now = new Date().toISOString();
  const nowMs = new Date(now).getTime();
  // baseline follower count for a handle at the start of a window: the newest
  // snapshot at or before the cutoff (or the previous snapshot for "latest").
  // "Show so far": when history doesn't yet reach a full window back, fall back
  // to the earliest snapshot we have, so the change accumulates from day one
  // instead of showing a dash.
  const baselineCount = (handle: string, key: RangeKey): number | undefined => {
    if (key === "latest") return prev?.counts[handle];
    if (key === "all") return origins[handle]?.count;
    const cutoff = nowMs - RANGE_MS[key];
    for (let i = history.length - 1; i >= 0; i--) {
      if (new Date(history[i].t).getTime() <= cutoff) {
        return history[i].counts[handle];
      }
    }
    return history[0]?.counts[handle];
  };

  const statsFor = (handle: string, current: number): Stats => {
    const s = emptyStats();
    for (const key of RANGE_KEYS) {
      const base = baselineCount(handle, key);
      if (base !== undefined && base > 0) {
        s[key] = { change: current - base, pct: ((current - base) / base) * 100 };
      }
    }
    return s;
  };

  const counts: Record<string, number> = {};
  const accounts: LiveAccount[] = [];
  const failed: { handle: string; reason: string }[] = [];

  for (const { handle, name, bundledAvatarUrl } of handles) {
    try {
      const got = await fetchAccount(igUserId, token, handle, handle === host);
      const previous = previousByHandle.get(handle);
      if (!origins[handle]) {
        origins[handle] = { t: now, count: got.followers };
      }
      counts[handle] = got.followers;
      accounts.push({
        handle,
        name,
        followers: got.followers,
        // Meta occasionally omits profile_picture_url even when the rest of
        // business_discovery succeeds. Never erase a picture we already had.
        avatarUrl:
          got.avatarUrl ?? previous?.avatarUrl ?? bundledAvatarUrl ?? null,
        stats: statsFor(handle, got.followers),
      });
    } catch (err) {
      failed.push({ handle, reason: (err as Error).message });
      // carry the last-known entry forward so the fish doesn't vanish
      const carried = previousByHandle.get(handle);
      if (carried) {
        counts[handle] = carried.followers;
        accounts.push({ ...carried, stats: emptyStats() });
      }
    }
  }

  if (accounts.length === 0) {
    throw new Error(
      `Every account failed — first error: ${failed[0]?.reason ?? "unknown"}`,
    );
  }

  // how much history we READ this run — if this stays ~1 across runs, snapshots
  // aren't persisting in Redis (which starves every window's baseline)
  const historyReadIn = history.length;

  history.push({ t: now, counts });
  if (history.length > MAX_SNAPSHOTS) {
    history.splice(0, history.length - MAX_SNAPSHOTS);
  }

  const latest: LiveRoster = {
    lastUpdated: now,
    hostAccount: host,
    accounts,
    snapshots: history.length,
    failed,
  };
  const timezone = process.env.WEEK_START_TZ ?? "America/Chicago";
  const weekly = buildWeeklyArchive(storedWeekly, history, timezone, origins);
  await redisSetJSON(KEY_HISTORY, history);
  await redisSetJSON(KEY_WEEKLY, weekly);
  await redisSetJSON(KEY_ORIGINS, origins);
  await redisSetJSON(KEY_LATEST, latest);

  // read the history straight back so a persistence failure is visible in logs
  const verify =
    (await redisGetJSON<CountSnapshot[]>(KEY_HISTORY))?.length ?? 0;
  console.log(
    `[cron] historyReadIn=${historyReadIn} wrote=${history.length} readBack=${verify} ` +
      `weekly=${weekly.length} fetched=${accounts.length - failed.length} ` +
      `origins=${Object.keys(origins).length} failed=${failed.length}`,
  );

  return {
    ok: true,
    fetched: accounts.length - failed.length,
    failed,
    lastUpdated: now,
    snapshots: history.length,
    historyReadIn,
    readBack: verify,
    weeklySnapshots: weekly.length,
    origins: Object.keys(origins).length,
  };
}

export async function readLatest(): Promise<LiveRoster | null> {
  return redisGetJSON<LiveRoster>(KEY_LATEST);
}

export async function readWeeklyHistory(): Promise<WeeklyHistoryPayload> {
  const timezone = process.env.WEEK_START_TZ ?? "America/Chicago";
  const stored = (await redisGetJSON<WeeklySnapshot[]>(KEY_WEEKLY)) ?? [];
  const history =
    (await redisGetJSON<CountSnapshot[]>(KEY_HISTORY)) ?? [];
  const origins = buildOriginRecords(
    (await redisGetJSON<OriginRecords>(KEY_ORIGINS)) ?? {},
    history,
  );
  return {
    timezone,
    startsOn: WEEKLY_ARCHIVE_START_DATE,
    // Derive as a read fallback before the first post-deploy cron has written
    // the permanent key. The cron is the only writer.
    weeks:
      stored.length > 0
        ? buildWeeklyArchive(stored, history, timezone, origins)
        : buildWeeklyArchive([], history, timezone, origins),
  };
}
