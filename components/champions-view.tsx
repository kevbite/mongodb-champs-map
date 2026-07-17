"use client"

import type { ChampionLocationGroup, LocationGroup } from "@/lib/champions"
import { useOnlineStatus } from "@/lib/use-online-status"
import { ChampionsMap } from "@/components/champions-map"
import { OfflineBanner } from "@/components/offline-banner"
import { OfflineChampionsList } from "@/components/offline-champions-list"

type Props = {
  groups: LocationGroup[]
  allGroups: ChampionLocationGroup[]
  unmappedCount: number
}

/**
 * Switches between the interactive map (online) and a grouped champion list
 * (offline). The map depends on remote tiles, so it is unmounted while offline
 * and a persistent banner explains how to restore it.
 */
export function ChampionsView({ groups, allGroups, unmappedCount }: Props) {
  const online = useOnlineStatus()

  if (!online) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <OfflineBanner />
        <div className="min-h-0 flex-1">
          <OfflineChampionsList groups={allGroups} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="relative min-h-0 flex-1">
        <ChampionsMap groups={groups} />

        {unmappedCount > 0 && (
          <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-md border border-border bg-card/90 px-3 py-2 text-xs text-muted-foreground backdrop-blur">
            {unmappedCount} champion{unmappedCount === 1 ? "" : "s"} without a
            mapped location
          </div>
        )}
      </div>
    </div>
  )
}
