"use client"

import { Share2 } from "lucide-react"

import { useWebShare } from "@/lib/use-web-share"
import { Button } from "@/components/ui/button"

const SHARE_TITLE = "MongoDB Champions Map"
const SHARE_TEXT =
  "An interactive map of MongoDB Community Champions, rolled up by location."

/**
 * Icon button that opens the native share sheet via the Web Share API.
 *
 * Renders nothing when the browser can't share (most desktop browsers and
 * insecure contexts), so it only appears where sharing actually works.
 */
export function ShareButton() {
  const { canShare, share } = useWebShare()

  if (!canShare) return null

  const onShare = () =>
    void share({
      title: SHARE_TITLE,
      text: SHARE_TEXT,
      url: window.location.href,
    })

  return (
    <Button
      variant="outline"
      aria-label="Share this app"
      onClick={onShare}
      className="h-auto gap-1.5 self-stretch rounded-lg border-border bg-card px-2.5 py-1.5 text-brand hover:bg-muted hover:text-brand md:gap-2 md:px-3 md:py-2"
    >
      <Share2 className="size-4" />
      <span className="hidden text-sm font-medium text-foreground md:inline">
        Share
      </span>
    </Button>
  )
}
