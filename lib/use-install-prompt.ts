"use client"

import { useCallback, useEffect, useState } from "react"

/**
 * The `beforeinstallprompt` event isn't part of the standard DOM lib types, so
 * we describe the members we rely on here.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
  prompt(): Promise<void>
}

/** True when the app is running as an installed/standalone PWA. */
function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true
  // iOS Safari exposes standalone via a non-standard navigator property.
  return (navigator as unknown as { standalone?: boolean }).standalone === true
}

type UseInstallPrompt = {
  /** Whether the browser can prompt to install and the app isn't installed. */
  canInstall: boolean
  /** Triggers the native install prompt. Resolves once the user has chosen. */
  promptInstall: () => Promise<void>
}

/**
 * Tracks PWA installability via the `beforeinstallprompt` event.
 *
 * `beforeinstallprompt` only fires on browsers that support programmatic
 * installation and only when the app is installable and not already installed
 * (so iOS/Safari, which lacks the event, never reports `canInstall`). The event
 * is captured and its `prompt()` deferred until the user opts in via the UI.
 */
export function useInstallPrompt(): UseInstallPrompt {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true)
      return
    }

    const onBeforeInstallPrompt = (event: Event) => {
      // Prevent the browser's default mini-infobar so we can present our own UI.
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    const onAppInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    window.addEventListener("appinstalled", onAppInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
      window.removeEventListener("appinstalled", onAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    try {
      await deferredPrompt.userChoice
    } finally {
      // The prompt can only be used once; drop it regardless of the choice.
      setDeferredPrompt(null)
    }
  }, [deferredPrompt])

  return { canInstall: !installed && deferredPrompt !== null, promptInstall }
}
