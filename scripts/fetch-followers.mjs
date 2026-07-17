// One-shot follower fetch — proves the whole roster and writes real counts into
// data/accounts.json so the site renders the real ocean. This is the local,
// run-by-hand version of what the Vercel cron will eventually do on a schedule.
//
// Usage (PowerShell):
//   $env:IG_ACCESS_TOKEN="<token from Graph API Explorer>"; node scripts/fetch-followers.mjs
// or:
//   node scripts/fetch-followers.mjs "<token>"
//
// The token is read from the environment or argv — never hardcoded, never
// committed. A short-lived Explorer token (valid ~1 hour) is fine for a manual
// run; the cron will use the long-lived one.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const API_VERSION = "v21.0";
const IG_USER_ID = process.env.IG_USER_ID ?? "17841476323533943"; // host: jayanth.mov
const TOKEN = process.env.IG_ACCESS_TOKEN ?? process.argv[2];

const here = dirname(fileURLToPath(import.meta.url));
const ACCOUNTS_PATH = join(here, "..", "data", "accounts.json");

if (!TOKEN) {
  console.error(
    "\nNo access token.\n" +
      '  PowerShell:  $env:IG_ACCESS_TOKEN="<token>"; node scripts/fetch-followers.mjs\n' +
      '  or:          node scripts/fetch-followers.mjs "<token>"\n',
  );
  process.exit(1);
}

const base = `https://graph.facebook.com/${API_VERSION}/${IG_USER_ID}`;

async function graph(fields) {
  const url = `${base}?fields=${encodeURIComponent(fields)}&access_token=${TOKEN}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json;
}

// The host can't be read via business_discovery (you can't discover yourself),
// so it uses its own followers_count field — the asymmetry the pipeline was
// built around.
async function fetchHost() {
  const d = await graph("followers_count,username,profile_picture_url");
  return { followers: d.followers_count, profilePictureUrl: d.profile_picture_url };
}

async function fetchOther(handle) {
  const d = await graph(
    `business_discovery.username(${handle}){followers_count,profile_picture_url}`,
  );
  return {
    followers: d.business_discovery.followers_count,
    profilePictureUrl: d.business_discovery.profile_picture_url,
  };
}

const raw = JSON.parse(await readFile(ACCOUNTS_PATH, "utf8"));
const host = raw.hostAccount;

console.log(`\nFetching ${raw.accounts.length} accounts as ${host}…\n`);

const failures = [];
for (const acct of raw.accounts) {
  try {
    const data =
      acct.handle === host ? await fetchHost() : await fetchOther(acct.handle);
    acct.followers = data.followers;
    if (data.profilePictureUrl) acct.profilePictureUrl = data.profilePictureUrl;
    console.log(
      `  ✓ ${acct.handle.padEnd(22)} ${String(data.followers).padStart(10)}`,
    );
  } catch (err) {
    failures.push({ handle: acct.handle, reason: err.message });
    console.log(`  ✗ ${acct.handle.padEnd(22)} ${err.message}`);
  }
}

raw.lastUpdated = new Date().toISOString();
await writeFile(ACCOUNTS_PATH, JSON.stringify(raw, null, 2) + "\n", "utf8");

console.log(`\nWrote real counts + lastUpdated to data/accounts.json.`);
if (failures.length) {
  console.log(
    `\n${failures.length} account(s) could not be read — almost always because ` +
      `they are not public + Professional (Creator/Business). Ask them to switch, ` +
      `then re-run:\n`,
  );
  for (const f of failures) console.log(`  - ${f.handle}`);
}
console.log("");
