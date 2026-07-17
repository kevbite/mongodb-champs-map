"use client"

import { useCallback, useEffect, useState } from "react"

/** Payload passed to the Web Share API. */
export type ShareData = {
  title?: string
  text?: string
  url?: string
}

type UseWebShare = {
  /** Whether the browser supports the Web Share API (false during SSR). */
  canShare: boolean
  /** Invokes the native share sheet. Resolves once the user has chosen. */
  share: (data: ShareData) => Promise<void>
}

/**
 * Tracks Web Share API support and exposes a `share()` helper.
 *
 * Support is detected after mount so the value is safe for the statically
 * exported PWA, where `navigator` is unavailable during export. Browsers
 * without `navigator.share` (most desktop browsers and insecure contexts)
 * report `canShare: false`, letting callers hide their share UI entirely.
 */
export function useWebShare(): UseWebShare {
  const [canShare, setCanShare] = useState(false)

  useEffect(() => {
    setCanShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    )
  }, [])

  const share = useCallback(async (data: ShareData) => {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
      return
    }
    // When available, skip sharing payloads the browser can't handle.
    if (typeof navigator.canShare === "function" && !navigator.canShare(data)) {
      return
    }
    try {
      await navigator.share(data)
    } catch (error) {
      // Ignore user cancellation; surface nothing for other failures either so
      // the share action never throws an unhandled rejection.
      if (error instanceof DOMException && error.name === "AbortError") return
    }
  }, [])

  return { canShare, share }
}
