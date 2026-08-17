import { NextResponse } from "next/server";
import raw from "@/data/accounts.json";
import { readLatest } from "@/lib/pipeline";

// Meta's profile_picture_url values are signed CDN links that expire after a
// few days. This route gives the browser a stable URL and lets the deployment
// CDN retain the actual image bytes for a month. When the cache revalidates it
// reads the newest signed URL from Redis, so ordinary follower snapshots can
// keep running independently every four hours.

export const dynamic = "force-dynamic";
export const maxDuration = 10;

interface BundledAccount {
  handle: string;
  profilePictureUrl?: string;
}

function errorResponse(message: string, status: number): NextResponse {
  return new NextResponse(message, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isMetaImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      (host === "fbcdn.net" ||
        host.endsWith(".fbcdn.net") ||
        host === "cdninstagram.com" ||
        host.endsWith(".cdninstagram.com"))
    );
  } catch {
    return false;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const { handle: rawHandle } = await params;
  const handle = rawHandle.toLowerCase();
  if (!/^[a-z0-9._]+$/.test(handle)) {
    return errorResponse("Invalid Instagram handle", 400);
  }

  let liveUrl: string | null = null;
  try {
    const latest = await readLatest();
    liveUrl =
      latest?.accounts.find(
        (account) => account.handle.toLowerCase() === handle,
      )?.avatarUrl ?? null;
  } catch {
    // Redis can be unavailable in local development; try bundled data below.
  }

  const bundledUrl = (raw.accounts as BundledAccount[]).find(
    (account) => account.handle.toLowerCase() === handle,
  )?.profilePictureUrl;
  const upstreamUrl = liveUrl ?? bundledUrl;

  if (!upstreamUrl || !isMetaImageUrl(upstreamUrl)) {
    return errorResponse("Profile picture unavailable", 404);
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      cache: "no-store",
      headers: { Accept: "image/avif,image/webp,image/*,*/*;q=0.8" },
    });
    const contentType = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || !upstream.body || !contentType.startsWith("image/")) {
      await upstream.body?.cancel();
      return errorResponse("Profile picture unavailable", 502);
    }

    const headers = new Headers({
      "Cache-Control":
        "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800",
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    });
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch {
    return errorResponse("Profile picture unavailable", 502);
  }
}
