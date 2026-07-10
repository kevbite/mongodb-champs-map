import { WifiOff } from "lucide-react"

/**
 * Persistent, non-dismissible banner shown while the user is offline. Explains
 * that the map is unavailable and that reconnecting restores it.
 */
export function OfflineBanner() {
  return (
    <div
      role="status"
      className="flex items-center gap-3 border-b border-border bg-card px-5 py-3 text-sm"
    >
      <span className="text-brand">
        <WifiOff className="size-4" />
      </span>
      <p className="text-pretty text-muted-foreground">
        <span className="font-semibold text-foreground">
          You&rsquo;re currently offline.
        </span>{" "}
        Reconnect to the internet to get the map back. In the meantime, here are
        the champions grouped by location.
      </p>
    </div>
  )
}
