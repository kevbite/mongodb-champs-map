import { type NextRequest, NextResponse } from "next/server"

// Only allow proxying images from MongoDB / its CDN hosts to prevent
// this route from being used as an open proxy.
const ALLOWED_HOSTS = [
  // Where the champion avatars are actually hosted.
  "mdb-community.s3.amazonaws.com",
  "s3.amazonaws.com",
  // MongoDB-owned hosts, in case the source ever changes.
  "mongodb.com",
  "www.mongodb.com",
  "webassets.mongodb.com",
  "webimages.mongodb.com",
]

function isAllowed(hostname: string): boolean {
  return ALLOWED_HOSTS.some(
    (h) => hostname === h || hostname.endsWith(`.${h}`),
  )
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")
  if (!url) {
    return new NextResponse("Missing `url` parameter", { status: 400 })
  }

  let target: URL
  try {
    target = new URL(url)
  } catch {
    return new NextResponse("Invalid `url` parameter", { status: 400 })
  }

  if (target.protocol !== "https:" || !isAllowed(target.hostname)) {
    return new NextResponse("Host not allowed", { status: 403 })
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        // A browser-like UA + referer avoids hotlink protection stripping the image.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Referer: "https://www.mongodb.com/community/champions",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      // Cache the proxied images at the edge for a day.
      next: { revalidate: 86400 },
    })

    if (!upstream.ok || !upstream.body) {
      return new NextResponse("Failed to fetch image", {
        status: upstream.status || 502,
      })
    }

    const contentType =
      upstream.headers.get("content-type") ?? "application/octet-stream"

    // Guard against proxying non-image responses.
    if (!contentType.startsWith("image/")) {
      return new NextResponse("Not an image", { status: 415 })
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
      },
    })
  } catch {
    return new NextResponse("Error fetching image", { status: 502 })
  }
}
