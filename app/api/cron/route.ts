import { NextResponse } from "next/server";
import { runSnapshot } from "@/lib/pipeline";

// Triggered every 15 minutes by the GitHub Actions workflow (see
// .github/workflows/refresh.yml). Requires the CRON_SECRET bearer token so
// strangers can't burn the rate limit.

export const dynamic = "force-dynamic";
export const maxDuration = 60; // ~25 sequential Graph calls

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const summary = await runSnapshot();
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
