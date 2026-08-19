# guppies

An ocean-themed follower leaderboard for a group of Instagram creators.
**Bigger fish live deeper** — guppies bob in the sunlit shallows, whale sharks
haunt the abyss, and scrolling down is diving. The ocean is the primary UI;
the ranked list is a panel you open on demand.

Built for `guppies.jayanth.mov`.

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # species-tier boundary tests
npm run build   # production build
```

`/art` is a dev artboard showing all 12 fish silhouettes side by side.

## How it fits together

- [lib/species.ts](lib/species.ts) — the single source of truth: 12 species
  tiers `{ name, min, max, symbolId, width }`, the band color ramp, and the
  depth math (equal-height bands, log-interpolated position within each —
  continuous, never snapped). `widthFor` scales fish gently within their
  species range without ever outgrowing the next tier. Everything derives
  from this file.
- [lib/roster.ts](lib/roster.ts) — turns accounts into ranked fish. The
  `RosterSource` interface is the seam where the live pipeline plugs in.
- [data/accounts.json](data/accounts.json) — the roster. **Adding an account
  = appending a handle here.** All `mock*` fields are fabricated for layout
  testing and must be deleted once the pipeline is live; never show them as
  real.
- [components/FishShapes.tsx](components/FishShapes.tsx) — the art budget:
  12 hand-drawn SVG silhouettes, tail in its own group for the wag.
- [components/Ocean.tsx](components/Ocean.tsx) — the 7,200px water column;
  [components/Fish.tsx](components/Fish.tsx) — drift/bob/flip motion, all CSS
  keyframes, seeded per-handle so server and client render identically.
- [components/DepthGauge.tsx](components/DepthGauge.tsx) — desktop depth
  instrument; segments are clickable to dive to a zone.
- [components/LeaderboardPanel.tsx](components/LeaderboardPanel.tsx) — right
  drawer (desktop, squeezes the ocean) / full-screen sheet (mobile). Its ocean
  snapshot selector time-travels the entire page: counts, ranks, fish species,
  size, depth, and leaderboard growth all use the selected Sunday endpoint.
  Comparison windows include latest, day, week, month, and all time. Rows glide
  into their historical order while fish visibly swim to their new depth.
- [components/EvolutionToast.tsx](components/EvolutionToast.tsx) — remembers
  each swimmer's species in localStorage and announces tier crossings on the
  next load. Dormant until counts actually move.

Motion honors `prefers-reduced-motion`: every animation lives inside
`no-preference` media blocks, and programmatic scrolls fall back to instant.

## The pipeline

Instagram Graph API `business_discovery`, queried every four hours by cron, never
from the browser. Snapshots land in KV; the page reads cached JSON. Deltas,
growth %, and evolutions all come from snapshot history. Profile pictures use a
same-origin proxy because Meta's signed CDN URLs expire; the proxy caches the
image bytes for a month and then revalidates against the latest snapshot.
The rolling detailed history is capped at 800 entries; a separate Sunday
archive stores one immutable snapshot per week indefinitely.
Each account's first observed count is stored separately, so all-time growth
survives even after old four-hour detail rolls out of the 800-entry window.
Historical membership comes from the snapshot itself, with optional per-account
continuity/start metadata in `accounts.json` for known handle anomalies.

**Full step-by-step setup lives in [PIPELINE.md](PIPELINE.md)** — Meta app
creation, tokens, the 60-day refresh trap, Vercel Cron, and the swap-in.
