// Local pipeline diagnostic. Runs the exact Graph API calls the cron makes and
// prints Meta's FULL response (including error code / subcode / type / fbtrace)
// so we can tell a dead token apart from a rate-limit block or a permission gap.
//
// Usage (PowerShell), with a FRESH token from Graph API Explorer:
//   $env:IG_ACCESS_TOKEN = Read-Host "token"; node scripts/diagnose.mjs
//
// The token is read from the environment or argv — never hardcoded, never
// committed.

const API_VERSION = "v21.0";
const IG_USER_ID = process.env.IG_USER_ID ?? "17841476323533943"; // host: jayanth.mov
const TOKEN = process.env.IG_ACCESS_TOKEN ?? process.argv[2];

if (!TOKEN) {
  console.error(
    '\nNo token. Run:  $env:IG_ACCESS_TOKEN = Read-Host "token"; node scripts/diagnose.mjs\n',
  );
  process.exit(1);
}

const GRAPH = `https://graph.facebook.com/${API_VERSION}`;

async function call(label, path) {
  const url = `${GRAPH}/${path}${path.includes("?") ? "&" : "?"}access_token=${TOKEN}`;
  const shownUrl = url.replace(TOKEN, "<token>");
  console.log(`\n=== ${label} ===`);
  console.log(shownUrl);
  try {
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();
    console.log(`HTTP ${res.status}`);
    if (json.error) {
      console.log("ERROR:", JSON.stringify(json.error, null, 2));
    } else {
      console.log("OK:", JSON.stringify(json, null, 2));
    }
    return json;
  } catch (e) {
    console.log("NETWORK ERROR:", e.message);
    return null;
  }
}

console.log(`\nDiagnosing with IG_USER_ID=${IG_USER_ID}`);
console.log(`Token length: ${TOKEN.length} chars (first 6: ${TOKEN.slice(0, 6)}…)`);

// 1. Is the token valid at all, and whose is it?
await call("token identity  (GET /me)", "me?fields=id,name");

// 2. Token permissions actually granted
await call("granted permissions  (GET /me/permissions)", "me/permissions");

// 3. Host's own follower count (the special-cased path)
await call(
  "host followers  (GET /{ig-user-id}?followers_count)",
  `${IG_USER_ID}?fields=followers_count,username`,
);

// 4. business_discovery on a normal account
await call(
  "business_discovery  (brandonsbrainwave)",
  `${IG_USER_ID}?fields=business_discovery.username(brandonsbrainwave){followers_count,username}`,
);

// 5. business_discovery on one of the failing new accounts
await call(
  "business_discovery  (zachyadegari)",
  `${IG_USER_ID}?fields=business_discovery.username(zachyadegari){followers_count,username}`,
);

console.log(
  "\nRead the errors above:\n" +
    "  • code 190 / 'Session has expired' → the token is dead; mint a fresh 60-day one.\n" +
    "  • code 4 or 17 / 'rate limit' / 'API access blocked' → temporary Meta throttle; wait it out.\n" +
    "  • code 10 / 'permission' → a scope is missing (e.g. instagram_manage_insights).\n" +
    "  • host OK but business_discovery fails → the specific target isn't public+Professional.\n",
);
