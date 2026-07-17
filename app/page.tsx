import { groupAllByLocation, groupByLocation, type Champion } from "@/lib/champions"
import championsData from "@/lib/data/champions.json"
import { ChampionsView } from "@/components/champions-view"
import { ShareButton } from "@/components/share-button"
import { InstallBanner } from "@/components/install-banner"
import { Users, Globe } from "lucide-react"

export default function Page() {
  const champions = championsData as Champion[]
  const total = champions.length
  const { groups, unmapped } = groupByLocation(champions)
  const allGroups = groupAllByLocation(champions)

  return (
    <main className="flex h-dvh flex-col bg-background text-foreground">
      <InstallBanner />
      <header className="flex flex-col gap-3 border-b border-border px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-balance text-xl font-bold tracking-tight">
            MongoDB Community Champions
          </h1>
          <p className="text-pretty text-sm text-muted-foreground">
            Sourced from mongodb.com — each pin rolls up every champion in that location.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <Stat icon={<Users className="size-4" />} label="Champions" value={total} />
          <Stat icon={<Globe className="size-4" />} label="Locations" value={groups.length} />
          <ShareButton />
        </div>
      </header>

      <ChampionsView
        groups={groups}
        allGroups={allGroups}
        unmappedCount={unmapped.length}
      />
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
    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 md:gap-2 md:px-3 md:py-2">
      <span className="text-brand">{icon}</span>
      <div className="flex flex-col leading-tight">
        <span className="text-base font-bold tabular-nums">{value}</span>
        <span className="hidden text-[11px] uppercase tracking-wide text-muted-foreground md:inline">
          {label}
        </span>
      </div>
    </div>
  )
}
