"use client"

import { useSyncExternalStore } from "react"

function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback)
  window.addEventListener("offline", callback)
  return () => {
    window.removeEventListener("online", callback)
    window.removeEventListener("offline", callback)
  }
}

/** Client snapshot: the browser's live online status. */
function getSnapshot(): boolean {
  return navigator.onLine
}

/**
 * Server snapshot: assume online during SSR / static export, since
 * `navigator` is unavailable there.
 */
function getServerSnapshot(): boolean {
  return true
}

/**
 * Tracks the browser's online/offline status via `navigator.onLine` and the
 * `online`/`offline` events.
 *
 * Uses `useSyncExternalStore` so the real client value is read during
 * hydration. This matters for the statically-exported PWA: when the app shell
 * is served from the service-worker cache while offline, the correct offline
 * state is applied on first render instead of relying on a post-mount effect.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

