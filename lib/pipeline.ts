// Server-side pipeline: called by /api/cron every 15 minutes (GitHub Actions
// scheduler), stores snapshots in Upstash Redis, and derives the change/percent
// the site shows over each comparison window (latest / day / week / month).
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

// window length for each range; "latest" is special-cased to the prior snapshot
const RANGE_MS: Record<Exclude<RangeKey, "latest">, number> = {
  day: 24 * 3_600_000,
  week: 7 * 24 * 3_600_000,
  month: 30 * 24 * 3_600_000,
};

const GRAPH = "https://graph.facebook.com/v21.0";

const KEY_HISTORY = "guppies:history";
const KEY_LATEST = "guppies:latest";
const KEY_TOKEN = "guppies:token";

// ~31 days of 15-minute snapshots — enough to back the "past month" window.
// (31d * 24h * 4/h = 2976.) Each snapshot is small (~25 handle:count pairs),
// so the whole history blob stays on the order of a couple MB.
const MAX_SNAPSHOTS = 3000;

interface Snapshot {
  t: string; // ISO timestamp
  counts: Record<string, number>;
}

interface StoredToken {
  token: string;
  exchangedAt: string;
}

export interface RunSummary {
  ok: boolean;
  fetched: number;
  failed: { handle: string; reason: string }[];
  lastUpdated: string;
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

  if (!stored) {
    const seed = process.env.IG_ACCESS_TOKEN;
    if (!seed) {
      throw new Error(
        "No token in Redis and no IG_ACCESS_TOKEN env var to seed it with.",
      );
    }
    stored = { token: seed, exchangedAt: new Date().toISOString() };
    await redisSetJSON(KEY_TOKEN, stored);
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
    error?: { message: string };
    [k: string]: unknown;
  };
  if (json.error) throw new Error(json.error.message);
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

// ---- week boundary: Sunday 12:00am in WEEK_START_TZ ----

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
  return asUTC - at.getTime();
}

export function weekStartISO(now: Date, tz: string): string {
  const offset = tzOffsetMs(tz, now);
  const wall = new Date(now.getTime() + offset); // wall clock as pseudo-UTC
  const sundayWall = Date.UTC(
    wall.getUTCFullYear(),
    wall.getUTCMonth(),
    wall.getUTCDate() - wall.getUTCDay(), // back to Sunday
  );
  // convert wall midnight back to a real instant (second pass corrects DST)
  let utc = sundayWall - offset;
  utc = sundayWall - tzOffsetMs(tz, new Date(utc));
  return new Date(utc).toISOString();
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
  }));

  const prevLatest = await redisGetJSON<LiveRoster>(KEY_LATEST);
  const history = (await redisGetJSON<Snapshot[]>(KEY_HISTORY)) ?? [];
  const prev = history[history.length - 1] ?? null;

  const nowMs = Date.now();
  // baseline follower count for a handle at the start of a window: the newest
  // snapshot at or before the cutoff (or the previous snapshot for "latest").
  // undefined when history doesn't reach back that far — no fabricated trend.
  const baselineCount = (handle: string, key: RangeKey): number | undefined => {
    if (key === "latest") return prev?.counts[handle];
    const cutoff = nowMs - RANGE_MS[key];
    for (let i = history.length - 1; i >= 0; i--) {
      if (new Date(history[i].t).getTime() <= cutoff) {
        return history[i].counts[handle];
      }
    }
    return undefined;
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

  const now = new Date().toISOString();
  const counts: Record<string, number> = {};
  const accounts: LiveAccount[] = [];
  const failed: { handle: string; reason: string }[] = [];

  for (const { handle, name } of handles) {
    try {
      const got = await fetchAccount(igUserId, token, handle, handle === host);
      counts[handle] = got.followers;
      accounts.push({
        handle,
        name,
        followers: got.followers,
        avatarUrl: got.avatarUrl,
        stats: statsFor(handle, got.followers),
      });
    } catch (err) {
      failed.push({ handle, reason: (err as Error).message });
      // carry the last-known entry forward so the fish doesn't vanish
      const carried = prevLatest?.accounts.find((a) => a.handle === handle);
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

  history.push({ t: now, counts });
  if (history.length > MAX_SNAPSHOTS) {
    history.splice(0, history.length - MAX_SNAPSHOTS);
  }

  const latest: LiveRoster = { lastUpdated: now, hostAccount: host, accounts };
  await redisSetJSON(KEY_HISTORY, history);
  await redisSetJSON(KEY_LATEST, latest);

  return { ok: true, fetched: accounts.length - failed.length, failed, lastUpdated: now };
}

export async function readLatest(): Promise<LiveRoster | null> {
  return redisGetJSON<LiveRoster>(KEY_LATEST);
}
