import { NextResponse } from "next/server";
import { readHistory, redisConfigured } from "@/lib/pipeline";
import type { Snapshot } from "@/lib/chart";
import raw from "@/data/accounts.json";

// Serves the follower-count snapshot history for the growth chart. Real data
// comes from Redis; when there is no data source AND we are not in production
// (i.e. local dev), it returns a synthetic series so the chart is developable.

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (redisConfigured()) {
      const history = await readHistory();
      return NextResponse.json(
        { points: history },
        { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
      );
    }
  } catch {
    // fall through to empty / synthetic
  }

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ points: [] });
  }
  return NextResponse.json({ points: syntheticHistory() });
}

// deterministic pseudo-random for stable dev data
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function syntheticHistory(): Snapshot[] {
  const accounts = (raw.accounts as { handle: string; followers?: number }[])
    .filter((a) => a.handle);
  const N = 220; // hourly points over ~30 days
  const hourMs = 3_600_000;
  const now = Date.now();
  const start = now - N * hourMs;

  // per-account end value and a growth shape
  const shapes = accounts.map((a, i) => {
    const r = rng(1000 + i);
    const end = a.followers ?? Math.floor(50 + r() * 5000);
    const growth = 0.02 + r() * 0.35; // total fractional growth over the window
    const begin = Math.max(1, Math.round(end / (1 + growth)));
    return { handle: a.handle, begin, end, wobble: r };
  });

  const out: Snapshot[] = [];
  for (let k = 0; k < N; k++) {
    const frac = k / (N - 1);
    const counts: Record<string, number> = {};
    for (const s of shapes) {
      const trend = s.begin + (s.end - s.begin) * Math.pow(frac, 0.85);
      const noise = 1 + (s.wobble() - 0.5) * 0.01;
      counts[s.handle] = Math.max(0, Math.round(trend * noise));
    }
    out.push({ t: new Date(start + k * hourMs).toISOString(), counts });
  }
  return out;
}
