# Going live: real Instagram follower counts

How to swap the fabricated `mock*` numbers for live counts via the Instagram
Graph API's `business_discovery`. One host account (Jayanth's) queries
everyone else by username — nobody else has to log in or authorize anything.

## 0. Prerequisites (do this first, it's the usual blocker)

- **Every tracked account must be public and Professional** (Creator or
  Business). Instagram → Settings → Account type. Personal accounts are
  invisible to `business_discovery` — verify with the whole group before
  anything else.
- **The host account (`jayanth.mov`) must be Professional AND linked to a
  Facebook Page** (Instagram → Edit profile → Page, create a throwaway Page
  if needed). The API only reaches Instagram through that Page link.

### Two Instagram API products — use the right one

Meta's developer console offers **two different login flavors** under the
"Instagram API" product, and they are not interchangeable:

| | API setup with **Instagram login** | API setup with **Facebook login** |
|---|---|---|
| Bundles | `instagram_business_basic` + `instagram_business_manage_comments` + `instagram_business_manage_messages` | `instagram_basic` + Page-linked discovery access |
| Good for | An auto-reply / auto-DM bot (a separate, currently-shelved idea — **not this project**) | **This leaderboard** — reading *other* accounts' public counts |
| Needs a linked Facebook Page? | No | **Yes** |
| Exposes `business_discovery`? | No | **Yes** |

Only Jayanth's own (host) account needs the Facebook Page link — that's a
technical routing requirement for *his* querying account to get an API token,
nothing to do with the 16 tracked friends. **The tracked accounts never touch
Facebook at all**: public + Professional Instagram is the entire requirement
for them, per `business_discovery`'s design.

Use the **same `guppies` app** for this — no need for a second app unless a
messaging/DM-bot project actually gets built later. An unused
"Instagram login" config sitting in the same app is inert; it doesn't do
anything until code calls it.

## Resolved values for this project

Non-secret identifiers, captured during setup (July 2026). These are safe to
commit — they're just account/app IDs, not credentials. **Tokens and the app
secret are NOT recorded here and must never be committed.**

| Name | Value | Where it's used |
|---|---|---|
| Meta app ID | `1590773419407341` | token exchange (`client_id`) |
| Facebook Page | `StuFlo` — id `1137245512813845` | routing only; not called by the cron |
| **`IG_USER_ID`** (host) | `17841476323533943` | every follower-count call |

The linked Instagram professional account behind `IG_USER_ID` is the host,
`jayanth.mov`.

## 1. Set up the app

1. In the existing `guppies` app dashboard, under the **Instagram API**
   product, click **"API setup with Facebook login"**.
2. Link it to the Facebook Page from the prerequisites step above (Jayanth's
   Page only — the one his Instagram is already connected to).
3. **Ignore the "Facebook Login for Business" → Quickstart wizard** if you
   spot it in the sidebar (the iOS/Android/Web/Other platform picker). That's
   for embedding a login button in a real app or website — not needed here.
   The one-time authorization happens inline inside Graph API Explorer
   instead (next section) — Jayanth just clicks "Generate Access Token" and
   approves the consent popup that appears.

## 2. Get the host IG user ID and a token

1. Open the **Graph API Explorer** (Tools → Graph API Explorer), select your
   app, click **Generate Access Token**, and grant these permissions:
   `instagram_basic`, `instagram_manage_insights`, `pages_show_list`,
   `pages_read_engagement`, `business_management`. **`instagram_manage_insights`
   is required for `business_discovery`** — without it the discovery call fails
   with `(#10) Application does not have permission for this action`, even
   though reading the host's own `followers_count` still works.
2. Run `GET /me/accounts` → copy the Page's `id`.
3. Run `GET /{page-id}?fields=instagram_business_account` → copy
   `instagram_business_account.id`. **This is `IG_USER_ID`** — the host IG
   user id used in every call.
4. Sanity-check discovery (this is the exact call the cron will make):

   ```
   GET /v21.0/{IG_USER_ID}?fields=business_discovery.username(mahadev.mov){followers_count,username,profile_picture_url}
   ```

   If a handle errors here, that account isn't public+Professional yet.
5. The host's own count comes from a different call (business_discovery
   can't query yourself) — `RosterSource.hostHandle` exists for this:

   ```
   GET /v21.0/{IG_USER_ID}?fields=followers_count,username
   ```

## 3. Exchange for a long-lived token (60 days)

The Explorer token dies in ~an hour. Exchange it:

```
GET https://graph.facebook.com/v21.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={app-id}
  &client_secret={app-secret}
  &fb_exchange_token={short-lived-token}
```

App ID and secret are under App settings → Basic. The response token lives
**60 days**.

⚠️ **The board goes dark when this expires. Everyone forgets this once.**
Store the current token in KV (not just an env var) so a scheduled job can
re-exchange it monthly: the same `fb_exchange_token` call accepts a still-valid
long-lived token and returns a fresh 60-day one. Run that on the 1st of every
month and write the result back to KV.

Note: the app can stay in **Development mode** — everything above works for
the app's own admins, which is all this project needs. No App Review.

## 4. The pipeline (BUILT — this section is now setup instructions)

The code is in place:

- [lib/pipeline.ts](lib/pipeline.ts) — snapshot engine: fetches all handles
  (host via its own-fields call), stores 15-minute snapshots in Upstash Redis,
  derives **delta** (vs previous snapshot) and **growthWeek** (vs the earliest
  snapshot after Sunday 12:00am in `WEEK_START_TZ`), and **auto-refreshes the
  60-day token** once it's 30 days old, writing the replacement back to Redis.
- [app/api/cron/route.ts](app/api/cron/route.ts) — runs a snapshot; guarded
  by `Authorization: Bearer $CRON_SECRET`.
- [app/api/roster/route.ts](app/api/roster/route.ts) — serves the latest
  snapshot; the page overlays it on the bundled `accounts.json` at load.
- [.github/workflows/refresh.yml](.github/workflows/refresh.yml) — the
  scheduler. **Vercel's free Hobby plan only allows daily crons**, so a
  GitHub Action pings `/api/cron` every 15 minutes instead (free, same repo).

### One-time setup

1. **Vercel project** — import the GitHub repo (Add New → Project → Import).
2. **Storage** — Vercel dashboard → Storage (or Marketplace) → **Upstash for
   Redis** → create the free database and connect it to the project. This
   injects `KV_REST_API_URL` / `KV_REST_API_TOKEN` automatically.
3. **Environment variables** (Project → Settings → Environment Variables):
   | Name | Value |
   |---|---|
   | `IG_USER_ID` | `17841476323533943` |
   | `IG_ACCESS_TOKEN` | the freshly exchanged 60-day token (seed; later refreshes live in Redis) |
   | `META_APP_ID` | `1590773419407341` |
   | `META_APP_SECRET` | App settings → Basic → App Secret (enables auto-refresh) |
   | `CRON_SECRET` | any long random string |
   | `WEEK_START_TZ` | e.g. `America/Chicago` (defines Sunday 12:00am) |
4. **Redeploy** so the env vars take effect.
5. **GitHub repo secrets** (Settings → Secrets and variables → Actions):
   `CRON_URL` = `https://<your-deployment>/api/cron`, `CRON_SECRET` = same
   value as on Vercel. Then trigger the workflow once manually (Actions →
   refresh follower counts → Run workflow) and confirm it goes green.

## 5. Roster upkeep

Adding a friend = appending `{ "handle": "x" }` to `accounts.json` and
pushing. The next cron run fetches them; no other code changes. The bundled
`followers` values in the JSON are just the first-paint fallback — the live
snapshot overlays them on load.
