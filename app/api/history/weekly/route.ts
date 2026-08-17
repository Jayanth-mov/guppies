import { NextResponse } from "next/server";
import { readWeeklyHistory } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const history = await readWeeklyHistory();
    return NextResponse.json(history, {
      headers: {
        "Cache-Control":
          "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch {
    return NextResponse.json(
      { timezone: "America/Chicago", startsOn: "2026-07-19", weeks: [] },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
