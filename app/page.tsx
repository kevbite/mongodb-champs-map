import { fetchChampions, groupByLocation } from "@/lib/champions"
import { ChampionsMap } from "@/components/champions-map"
import { MapPin, Users, Globe } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function Page() {
  let error: string | null = null
  let groups: Awaited<ReturnType<typeof groupByLocation>>["groups"] = []
  let unmapped: Awaited<ReturnType<typeof groupByLocation>>["unmapped"] = []
  let total = 0

  try {
    const champions = await fetchChampions()
    total = champions.length
    const grouped = groupByLocation(champions)
    groups = grouped.groups
    unmapped = grouped.unmapped
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error"
  }

  const mappedCount = groups.reduce((n, g) => n + g.champions.length, 0)

  return (
    <main className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex flex-col gap-3 border-b border-border px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-balance text-xl font-bold tracking-tight">
            MongoDB Community Champions
          </h1>
          <p className="text-pretty text-sm text-muted-foreground">
            Live from mongodb.com — each pin rolls up every champion in that location.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Stat icon={<Users className="size-4" />} label="Champions" value={total} />
          <Stat icon={<Globe className="size-4" />} label="Locations" value={groups.length} />
          <Stat icon={<MapPin className="size-4" />} label="On map" value={mappedCount} />
        </div>
      </header>

      <div className="relative flex-1">
        {error ? (
          <div className="flex h-full items-center justify-center p-6">
            <div className="max-w-md rounded-lg border border-destructive/40 bg-card p-6 text-center">
              <p className="font-semibold text-destructive">Could not load champion data</p>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        ) : (
          <ChampionsMap groups={groups} />
        )}

        {unmapped.length > 0 && (
          <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-md border border-border bg-card/90 px-3 py-2 text-xs text-muted-foreground backdrop-blur">
            {unmapped.length} champion{unmapped.length === 1 ? "" : "s"} without a mapped location
          </div>
        )}
      </div>
    </main>
  )
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
      <span className="text-brand">{icon}</span>
      <div className="flex flex-col leading-tight">
        <span className="text-base font-bold tabular-nums">{value}</span>
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  )
}
