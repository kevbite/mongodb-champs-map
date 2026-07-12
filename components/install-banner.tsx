"use client"

import { useEffect, useState } from "react"
import { Download, X } from "lucide-react"

import { useInstallPrompt } from "@/lib/use-install-prompt"
import { Button } from "@/components/ui/button"

const DISMISS_KEY = "pwa-install-dismissed-until"
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 1 week

/** Reads the stored "suppress until" timestamp, tolerating disabled storage. */
function getDismissedUntil(): number {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY)
    if (!raw) return 0
    const value = Number.parseInt(raw, 10)
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}

/**
 * Dismissable banner inviting the user to install the PWA.
 *
 * Only shown when the browser can prompt to install (so never on iOS/Safari or
 * when already installed) and the user hasn't dismissed it within the last week.
 * Renders nothing otherwise.
 */
export function InstallBanner() {
  const { canInstall, promptInstall } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    setDismissed(getDismissedUntil() > Date.now())
  }, [])

  if (!canInstall || dismissed) return null

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DURATION_MS))
    } catch {
      // Ignore storage failures (e.g. private mode); banner still hides below.
    }
    setDismissed(true)
  }

  return (
    <div
      role="status"
      className="flex items-center gap-3 border-b border-border bg-card px-5 py-3 text-sm"
    >
      <span className="text-brand">
        <Download className="size-4" />
      </span>
      <p className="text-pretty text-muted-foreground">
        <span className="font-semibold text-foreground">Install this app.</span>{" "}
        Add the Champions Map to your device for quick, offline-ready access.
      </p>
      <div className="ml-auto flex items-center gap-1">
        <Button variant="link" size="sm" onClick={() => void promptInstall()}>
          Install
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Dismiss install prompt"
          onClick={dismiss}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}
