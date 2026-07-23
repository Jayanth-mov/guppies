# Guppies — project spec & handoff

An ocean-themed Instagram follower leaderboard for a group of ~27 creator
friends. Lighthearted, competitive, a little dramatic. Built by Jayanth
(`jayanth.mov`). This document is the complete handoff: concept, architecture,
infrastructure, operational runbook, and the hard-won gotchas. Everything here
is current as of 2026-07-23.

---

## 1. The one idea (do not invert this)

**Bigger fish live deeper.** Guppies bob in the sunlit shallows; whale sharks
haunt the abyss. Climbing the leaderboard means *descending*. The page is a
tall vertical scroll — scrolling down is diving. The ocean is the primary UI;
the ranked list is a secondary panel opened on demand.

Design register: cold, wet, deep. Condensed utility face (Barlow Condensed)
for zone labels, mono (IBM Plex Mono) for counts — reads like sonar
instrumentation. Sentence case, active voice, empty states are invitations.
Never the default-AI look (cream/serif/terracotta).

**Data honesty is a hard rule:** never display fabricated numbers as real.
Deltas/growth show `—` until genuine history exists to compute them from.

---

## 2. Live state & links

| Thing | Where |
|---|---|
| Repo | `github.com/Jayanth-mov/guppies` (branch `main`) |
| Deploy | Vercel, `https://guppies-three.vercel.app` (auto-deploys on push to main) |
| Intended domain | `guppies.jayanth.mov` (not yet connected; the vercel.app URL works permanently regardless) |
| Scheduler | GitHub Actions (`.github/workflows/refresh.yml`), hourly `0 * * * *` |
| Storage | Upstash Redis via the Vercel marketplace integration |
| Status | Fully live: real counts flowing hourly, deltas/growth accumulating |

**Git author identity matters:** commits must be authored
`Jayanth <66447798+Jayanth-mov@users.noreply.github.com>` (set in local git
config). Vercel Hobby blocks deploys from commits authored by any email not on
the project — a wrong author email once mapped to a stranger's GitHub account
and blocked all deploys.

---

## 3. Stack & repo layout

Next.js 16 (App Router) + TypeScript 5.9 (**must stay 5.x — TS 7 / the Go
compiler breaks `next build`**), React 19, plain CSS Modules (no Tailwind, no
chart/animation libraries), Vitest. All ambient motion is CSS
transform/opacity keyframes — no per-frame JS.

```
app/
  layout.tsx            fonts (Barlow Condensed + IBM Plex Mono via next/font),
                        metadata (tab title: "guppies leaderboard"), icon.svg
  page.tsx              renders <OceanPage/>
  globals.css           palette custom properties, resets, focus styles
  art/page.tsx          dev artboard: all 12 fish silhouettes side by side
  api/cron/route.ts     runs a snapshot (CRON_SECRET bearer-guarded)
  api/roster/route.ts   serves the latest snapshot from Redis
components/
  OceanPage.tsx/.css    top-level client component: all page state, hero (sky,
                        sun, water surface, copy-link kicker, CTA), fish
                        deep-link handling, footer
  Ocean.tsx/.css        7200px water column: smooth 12-color gradient, band
                        labels, fish instances
  Fish.tsx/.css         one fish: SVG sprite, drift/bob/tail-wag/flip motion,
                        avatar+handle label chip, hover follower-count pill
  FishShapes.tsx        the art budget: 12 hand-drawn SVG silhouettes,
                        tail in its own <g> for the wag
  Atmosphere.tsx/.css   godrays (fanning from the sun), sunbeam entry glow,
                        dappled surface light, 3-tier scroll-parallax
                        particles (bubbles/motes/snow/specks), depth vignette
  Clouds.tsx/.css       turbulence-displacement clouds (technique credited to
                        najarro93's CodePen NWvmyGQ), randomized per reload,
                        split into back/front layers around the hero text
  DepthGauge.tsx/.css   desktop-only fixed submarine readout + clickable
                        12-segment dive track
  LeaderboardPanel.tsx/.css  right drawer (desktop, squeezes ocean) /
                        full-screen sheet (mobile); Followers & Growth tabs,
                        growth sub-sort, range dropup, white mini-fish icons
  EvolutionToast.tsx/.css  localStorage species memory → tier-crossing toasts
lib/
  species.ts            SINGLE SOURCE OF TRUTH: 12 tiers, band colors, depth &
                        size math, formatters
  roster.ts             data seam: bundled fallback + live overlay types
  pipeline.ts           server-only: Graph API calls, Redis snapshots, stats,
                        self-refreshing token
  rand.ts               seeded deterministic RNG (no Math.random in render —
                        SSR/hydration safety)
  species.test.ts       11 vitest cases: tier boundaries, depth monotonicity,
                        size invariants
data/accounts.json      the roster (27 handles) + bundled fallback counts
scripts/
  fetch-followers.mjs   manual local fetch → writes real counts into
                        accounts.json (token via env, never committed)
  diagnose.mjs          runs the exact Graph calls with full Meta error output
.github/workflows/refresh.yml  hourly curl of /api/cron with the secret
README.md, PIPELINE.md, CHART-PLAN.md   deeper docs (pipeline setup, chart plan)
```

Local dev: `npm run dev` (a `.claude/launch.json` exists locally but is
gitignored). `npm test`, `npm run build` must both pass before pushing.

---

## 4. Domain model (`lib/species.ts` — everything derives from here)

**Species tiers** (upper bounds exclusive): Guppy 0–2k, Clownfish 2–5k,
Goldfish 5–10k, Rainbow trout 10–15k, Sockeye salmon 15–20k, Atlantic cod
20–25k, Ocean sunfish 25–35k, Swordfish 35–50k, Giant manta ray 50–75k,
Great white shark 75–100k, Basking shark 100–250k, Whale shark 250k+.
Band color ramp light→dark: `#BFE6F5 #A5DAF0 #8ACDEA #6FBEE3 #56AEDA #3F9BCE
#2E86BE #2270A8 #1A5B8E #144773 #0E3358 #08203C`. Text ink flips dark→pale at
band 7 (index 6).

**Depth** (`depthFor`): each of the 12 bands gets an equal 1/12 slice of the
7200px ocean; position *within* a band is log-interpolated across that
species' follower range. Continuous, never band-snapped — a 4.8k clownfish
sits visibly deeper than a 2.1k one. (A pure log scale was tried first and
gave the guppy shallows a third of the ocean; don't regress to it.)

**Size** (`widthFor`): locked to species with a gentle within-band scale
(~±30%). Boundary widths sit at the geometric mean of neighboring species'
nominal widths with a 6% step, so the fattest fish of a tier is always
smaller than the runt of the next tier. `species.test.ts` asserts this
invariant plus monotonicity — keep those tests passing.

**Randomness**: all ambient variation (drift lanes, phases, particle fields)
uses `lib/rand.ts` seeded RNG keyed by handle so SSR and client render
identically. Per-visit variety comes from a `swimSeed` generated in a
`useEffect` *after* mount (empty-string default matches SSR, then reshuffles).
Follow this pattern for any new randomized visual.

---

## 5. Frontend behaviors (inventory)

**Hero**: blue-sky gradient; clean pulsing sun with soft glint;
turbulence-displacement clouds (5–6, randomized each reload, half behind the
title at z-1 / half in front at z-3 with the text at z-2; front clouds are
0.72 opacity so obscured text stays readable; drift edges fade in/out);
animated 3-band tiling water surface + crest glint; kicker
`guppies.jayanth.mov` is a copy-link button (clipboard + execCommand
fallback, "copied!" pill above); tagline; "View the leaderboard" CTA;
"scroll to dive ↓" hint.

**Hero z-layering gotcha**: decorative layers carry `data-layer` attributes
and the rule `.hero > *:not([data-layer])` gives text z-index 2. Do NOT match
decorative layers by class name across CSS modules — hashed class names made
`:not(.clouds)` silently fail once and collapsed the cloud layer.

**Ocean**: smooth 12-color gradient (single stop per band center — dashed
labels mark true boundaries); every zone renders even when empty ("vacant
waters — N followers to enter"); Atmosphere (godrays fan from sun-x≈80,
sunbeam entry pool, 3 parallax particle tiers driven by a scroll-set `--sy`
var, vignette); fish drift 20–60s loops with bob and tail wag, sprite flips
to face travel direction (label chip is outside the flip so text never
mirrors); label = avatar (22px, real profile picture with initials fallback)
+ bare handle; hover/focus reveals a follower-count pill above the fish;
generous invisible hitboxes so drifting fish don't flicker; vertical position
clamped 60px inside the ocean so surface fish don't poke above the water.

**Deep links**: clicking a fish centers it (scrolls to its live DOM
position), keeps it highlighted, writes `#handle` via `replaceState`, opens
the panel on desktop only (mobile panel would cover the fish). Loading
`/#handle` starts at the hero then glides down to the fish after ~900ms.

**Depth gauge** (desktop ≥980px): fixed left, 190px wide; teal depth readout
(−N m), white zone name (nowrap) and follower range; clickable 12-segment
track with a white active ring + white position marker; driven by a
rAF-throttled scroll listener.

**Leaderboard panel**: desktop = 340px right drawer that squeezes the ocean
(`.squeezed` margin) so hover-sync still works; mobile = full-screen sheet
(no drag handle). The floating "Leaderboard" pill morphs into a teal ×
when open (no in-panel close button). Tabs: **Followers** (count + delta
chip) and **Growth** (`change | divider | pct`, plus a sub-sort toggle:
"% growth" vs "Followers gained"). Rows: rank, avatar, bare handle, white
mini fish silhouette + species name; click opens their Instagram; hover
lights the fish in the ocean, dims others, and after a deliberate 750ms hold
glides the ocean to it. Bottom: a range **dropup** (Latest / Past day / Past
week / Past month — all rolling windows) with "last updated Xm ago" ticking
per-second and an "updates hourly" hint in its header. Followers tab defaults
to Past day, Growth tab to Past week.

**Evolution toasts**: localStorage (`guppies.species.v1`) remembers each
handle's species; tier crossings announce on a later load ("@x is now a
Swordfish" / "shrank back to..."). Gated behind `rosterSettled` so the
bundled→live data swap can't double-fire one crossing. Left-aligned on
mobile.

**Quality floor** (non-negotiable): every animation inside
`prefers-reduced-motion: no-preference` with sensible static fallbacks
(opacity-keyframed particles get explicit static opacity); visible keyboard
focus (`:focus-visible` accent outline); mobile fish scale 0.6 with narrower
traverse.

---

## 6. Data pipeline & infrastructure

**Source**: Instagram Graph API `business_discovery` — the host account
queries any *public professional* (Creator/Business) account by username. No
per-friend auth. The **host is the asymmetry**: you cannot business_discovery
yourself, so `jayanth.mov`'s own count comes from
`GET /{IG_USER_ID}?fields=followers_count`. `lib/pipeline.ts#fetchAccount`
special-cases this.

**Non-secret identifiers** (safe in repo; tokens/secrets are NOT):

| Name | Value |
|---|---|
| Meta app ID | `1590773419407341` |
| Facebook Page (routing only) | StuFlo, id `1137245512813845` |
| `IG_USER_ID` (host) | `17841476323533943` |

**Flow**: GitHub Actions (hourly) → `GET /api/cron` with
`Authorization: Bearer $CRON_SECRET` → `runSnapshot()`:
1. `getWorkingToken()` — token lifecycle below.
2. Loop all 27 handles; per-account failures don't abort the run.
3. Failed accounts **carry forward** their last-known entry (with stats
   nulled) so fish don't vanish; a *new* handle that fails simply doesn't
   appear until it first succeeds.
4. Compute per-window stats (`latest` = vs previous snapshot, `day`/`week`/
   `month` = vs newest snapshot at/before the cutoff, **falling back to the
   oldest snapshot** when history is shorter than the window — "show so far").
5. Append to history (cap `MAX_SNAPSHOTS = 800` ≈ 33 days hourly), write
   latest, log `[cron] historyReadIn/wrote/readBack` for persistence
   diagnostics.

**Redis keys** (Upstash REST protocol; env accepts both `KV_REST_API_*` and
`UPSTASH_REDIS_REST_*` names): `guppies:history` (Snapshot[]),
`guppies:latest` (LiveRoster incl. `snapshots` count and `failed[]` with
Meta error+code per skipped handle — the main remote diagnostic),
`guppies:token` (StoredToken).

**Token lifecycle** (the part everyone gets wrong):
- Long-lived user tokens last **60 days max** (there is no 6-month token).
- The cron auto-re-exchanges at 30 days old
  (`oauth/access_token?grant_type=fb_exchange_token` with META_APP_ID/SECRET)
  and stores the replacement in Redis — so expiry never bites in normal
  operation.
- The stored token records `seededFrom` (the env value it came from). If the
  operator changes `IG_ACCESS_TOKEN` in Vercel, the next run detects the
  changed seed and **adopts the new token automatically**. Without this
  marker the Redis-cached token would ignore env changes — do not remove it.

**Frontend data**: the page renders bundled `accounts.json` instantly, then
overlays `GET /api/roster` (latest snapshot) once fetched. `RosterSource` in
`lib/roster.ts` is the seam; `sourceFromLive` adapts the live shape.

**Rate/abuse limits (learned the hard way)**: ~200 calls/hour nominal, but
burst behavior matters more — a 15-minute cadence plus repeated manual
workflow runs got the host account **suspended for suspicious activity**
(every call returned "API access blocked"; the token revived on
reinstatement). Hourly cadence is the safe setting. Never spam manual runs;
one `workflow_dispatch` for testing is fine. At ~50+ roster accounts, revisit
the math before shortening the cadence.

**Other Meta facts**: `business_discovery` returns Meta's *cached* count —
it can lag the live app number by hours (polling faster doesn't help).
`Invalid user id [110/2207013]` = handle doesn't exist / isn't public
professional / username changed too recently for Meta's index.
`instagram_manage_insights` is a required scope for business_discovery
(missing it gives `(#10)` errors even when `instagram_basic` works).
`OAuthException 200` across all accounts = token/authorization dead.

---

## 7. Environment & secrets reference

**Vercel env vars**: `IG_USER_ID`, `IG_ACCESS_TOKEN` (60-day token seed),
`META_APP_ID`, `META_APP_SECRET` (enables auto-refresh), `CRON_SECRET`
(long random string), plus the Upstash-injected Redis pair. `WEEK_START_TZ`
may still exist — it is **dead** (growth windows are rolling now) and safe to
delete.

**GitHub Actions secrets**: `CRON_URL` =
`https://guppies-three.vercel.app/api/cron`, `CRON_SECRET` = same as Vercel.

**GitHub Actions gotcha**: scheduled workflows auto-disable after 60 days
without repo activity; any commit or manual run resets the clock.

**Getting a fresh token manually** (only needed if the pipeline's token truly
dies): Graph API Explorer → guppies app → Generate Access Token with scopes
`instagram_basic, instagram_manage_insights, pages_show_list,
pages_read_engagement, business_management` → exchange for long-lived →
update `IG_ACCESS_TOKEN` in Vercel → redeploy (the seededFrom reconcile does
the rest). Full walkthrough in PIPELINE.md.

---

## 8. Operational runbook

- **Add a member**: append `{ "handle": "x" }` to `data/accounts.json`, push.
  Next hourly run fetches them. Requirement: account must be public +
  Professional (Creator/Business) — a public *personal* account opens fine in
  a browser but is invisible to the API. No other code changes, ever.
- **Remove/rename**: edit the JSON. A renamed handle is a "new" account to
  the API (no carried history) and Meta's username index can lag a fresh
  rename by a day or two.
- **Why is X missing / stale?**: check `failed[]` in
  `https://guppies-three.vercel.app/api/roster` — every skipped handle with
  Meta's exact error and code. `snapshots` on the same payload should
  increment hourly; if it sticks, history isn't persisting.
- **Deep local diagnosis**: `$env:IG_ACCESS_TOKEN = Read-Host "token";
  node scripts/diagnose.mjs` — runs /me, /me/permissions, host count, and two
  business_discovery calls with full error JSON.
- **Refresh bundled fallback data** (optional, keeps first-paint fresh):
  same env pattern with `node scripts/fetch-followers.mjs`; it refuses to
  stamp `lastUpdated` if every call failed.
- **Revert points**: tag `clouds-svg-backup` = the earlier hand-drawn SVG
  cloud implementation. Commit `1bc5acf` = a complete, working
  growth-over-time chart + paper boat that was built and then reverted by
  preference (`4111982`) — resurrect from there if wanted, design notes in
  CHART-PLAN.md.

---

## 9. Conventions & invariants

1. `lib/species.ts` stays the single source of truth; zones, badges, toasts,
   gauge all derive from it. New tier logic goes there with tests.
2. Never show fabricated numbers as real. `—` over fake deltas, always.
3. No `Math.random()` during render — seeded RNG or post-mount state only
   (hydration safety).
4. Respect reduced motion and keyboard focus on anything new.
5. Keep expensive SVG filters scarce: the cloud displacement filters are
   ~15–18 instances and that's near the budget (33 froze a renderer). The
   filter defs `<svg>` is `position: fixed` and cloud parts are
   layer-promoted (`translateZ(0)`) — this works around mobile browsers
   dropping `filter: url()` references on scroll; don't "simplify" it away.
6. Exclude hero decorative layers via `data-layer`, not class names.
7. `next build` + `npm test` green before every push; clear `.next/` if
   generated route types go stale after deleting a route.
8. Commit as Jayanth (see §2); Vercel deploys block on unknown authors.

---

## 10. Roadmap (agreed but unbuilt)

- **Growth chart** (highest intent): full design in CHART-PLAN.md; a complete
  implementation exists at commit `1bc5acf` (SVG multi-line chart, Growth-%
  rebased view + log Followers view, range pills, legend toggle/hover,
  crosshair tooltip, `/api/history`, dev-only synthetic data) — it was
  reverted on look/feel, not correctness. Iterate on presentation rather
  than rebuilding from scratch.
- **Ocean aesthetics phase 2**: midwater life (jellyfish silhouettes or a
  flocking school of tiny fish — kelp was removed on purpose, don't bring it
  back), abyss bioluminescence blooms/anglerfish, fish rim-lighting +
  pectoral flutter, textured seabed at the footer.
- **Domain**: connect `guppies.jayanth.mov` to the Vercel project (then
  optionally update the GitHub `CRON_URL` secret — the vercel.app URL keeps
  working either way).
- **Roster growth**: purely additive via accounts.json; mind the rate-limit
  note at ~50 accounts.

---

## 11. Compressed history (why things are the way they are)

Mock-data ocean built first; live pipeline swapped in via Graph API Explorer
setup (app "guppies", Page StuFlo). TypeScript 7 broke the build once →
pinned 5.x. A short-lived token seeded early stale data → seededFrom
reconcile added. 15-minute cadence + manual run spam → account suspension →
hourly cadence + the "don't hammer" rule. Sunday-anchored weekly growth
replaced by rolling windows (day/week/month) with the "show so far" fallback.
Clouds went CSS-pills → hand-drawn SVG (tagged) → turbulence-displacement
(current, credited); parallax on clouds was added and removed (dragged them
under the waterline). Godrays were deepened and reverted — current subtler
version is the preferred one. A growth chart was fully built and reverted on
preference (see §10). The wrong-git-author incident blocked Vercel deploys
until history was rewritten — hence §2's identity rule.
