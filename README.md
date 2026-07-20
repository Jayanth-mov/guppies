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
  drawer (desktop, squeezes the ocean) / bottom sheet (mobile, snaps 50%/full).
  Sort by followers or weekly growth (weeks start Sunday 12:00am) — growth is
  how the guppies win.
- [components/EvolutionToast.tsx](components/EvolutionToast.tsx) — remembers
  each swimmer's species in localStorage and announces tier crossings on the
  next load. Dormant until counts actually move.

Motion honors `prefers-reduced-motion`: every animation lives inside
`no-preference` media blocks, and programmatic scrolls fall back to instant.

## The pipeline (not built yet — the boring part)

Instagram Graph API `business_discovery`, queried from an hourly cron, never
from the browser. Snapshots land in KV; the page reads cached JSON. Deltas,
growth %, and evolutions all come from snapshot history.

**Full step-by-step setup lives in [PIPELINE.md](PIPELINE.md)** — Meta app
creation, tokens, the 60-day refresh trap, Vercel Cron, and the swap-in.
