# Growth chart — plan

A "Chart" button next to **View the leaderboard** opens a progress-over-time
view of everyone's follower counts. The data already exists; this is mostly a
new API route + an SVG chart component.

## Data (already collected)

The cron writes `guppies:history` to Redis: an array of hourly snapshots
`{ t: ISO, counts: { handle: number } }`, capped at ~800 entries (~33 days).
That IS the time series — nothing new to collect. The chart's time span is
"however long the pipeline has been running," which grows over time.

**New endpoint:** `app/api/history/route.ts`
- Reads `guppies:history`, returns `{ points: [{ t, counts }], handles: [...] }`.
- Optional `?range=day|week|month|all` to slice server-side; `all` downsamples
  to ~250 points so the payload/draw stays light.
- Same Redis helpers as `lib/pipeline.ts` (factor them out or re-import).

## The metric toggle (this is the important design call)

Follower counts span ~20 → ~77k, so a plain linear Y axis squashes the small
accounts into a flat line at the bottom. Two modes, toggle in the header:

1. **Growth %** (default) — each line rebased to its value at the start of the
   selected range, so everyone starts at 0% and the slope is growth *rate*.
   This is the competitive view (a guppy at +40% out-climbs a shark at +1%) and
   is the whole "sport." Everyone's readable regardless of size.
2. **Followers (log)** — absolute counts on a log Y axis. Fits the site's
   "bigger fish live deeper = log depth" logic and keeps every line visible.

(Skip linear-absolute; it's the unreadable one.)

## Look

A full-screen themed modal (the leaderboard is already a drawer/sheet; a chart
needs width, and full-screen reads well on mobile too). Matches the deep-panel
palette: `--panel-bg`, mono axis labels (sonar/instrument feel), cool line
colors.

- **Header:** title "Follower growth", range pills (Past day / week / month /
  all — reuse the leaderboard's `RANGE_KEYS`), metric toggle (Growth % /
  Followers), close ✕ (same teal-x treatment as the leaderboard button).
- **Plot:** SVG, hand-drawn to match the rest of the site (no chart lib).
  - x = time, y = metric. Faint horizontal gridlines + a few labeled ticks;
    time ticks on x (fewer on mobile).
  - One polyline per account, colored by a categorical palette keyed to the
    handle (reuse the avatar hue so a line matches its fish/avatar tint).
  - The zero line (Growth %) or band boundaries (log) drawn subtly for
    reference.
- **Legend:** wrap of small chips — color dot + `@handle`. Click toggles a line
  on/off; hover highlights that line (bright + glow) and dims the rest to ~25%,
  exactly like the leaderboard↔ocean hover. A row can start focused if you
  arrived via a deep link.
- **Hover on the plot:** a vertical guide line (like the depth-gauge marker) +
  a floating tooltip listing each visible account's value at that timestamp,
  sorted, with the date/time.
- **Empty/early state:** while history is thin, show "Growth history builds
  over time — check back in a few days" instead of a lonely dot.

## Interactions

- Range + metric change the domains and redraw.
- Legend toggle/highlight (shared highlight state with the plot).
- Click a line or its legend chip → open that person's Instagram (like the
  leaderboard rows).
- Optional: `#chart/handle` deep link that opens the chart focused on someone,
  mirroring the existing `#handle` fish deep-link.

## Build order

1. `app/api/history/route.ts` — serve the sliced/downsampled series.
2. `lib/chart.ts` — history → per-handle series; linear/log/percent scales;
   downsample; tick generation. Unit-testable like `lib/species.ts`.
3. `components/GrowthChart.tsx` (+ CSS) — modal shell, SVG plot, legend,
   toggles, hover crosshair.
4. `components/OceanPage.tsx` — a "Chart" button beside the CTA (and optionally
   a small chart icon in the leaderboard header) that opens the modal; manage
   `chartOpen` state alongside `open`.
5. A categorical color palette in `lib/species.ts` or `lib/chart.ts`, keyed by
   handle, reused by the avatar tint for consistency.

## Constraints / notes

- History only reaches back as far as the cron has run; ranges longer than that
  just show all available data.
- ~800 snapshots × ~27 handles ≈ 20k points — fine to fetch and draw; downsample
  only the "all" range.
- Keep motion/hover honoring `prefers-reduced-motion` and visible focus, same
  quality floor as the rest of the site.
