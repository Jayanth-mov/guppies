import { NextResponse } from "next/server";
import { readLatest } from "@/lib/pipeline";

// The page fetches this on load and overlays it on the bundled accounts.json.
// 404 (no snapshot yet) or 500 (no Redis locally) just means the client keeps
// the bundled data — the site never breaks over this.

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const latest = await readLatest();
    if (!latest) {
      return NextResponse.json(null, { status: 404 });
    }
    return NextResponse.json(latest, {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch {
    return NextResponse.json(null, { status: 500 });
  }
}
