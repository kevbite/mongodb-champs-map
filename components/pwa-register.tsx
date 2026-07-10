"use client"

import { useEffect } from "react"

/**
 * Registers the service worker in production. Renders nothing.
 *
 * Service workers require a secure context, so this silently no-ops on plain
 * HTTP (e.g. non-localhost dev) and when the browser lacks support.
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failures (e.g. insecure context) are non-fatal.
      })
    }

    window.addEventListener("load", register)
    return () => window.removeEventListener("load", register)
  }, [])

  return null
}
