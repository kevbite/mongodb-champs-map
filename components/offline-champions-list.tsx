"use client"

import type { Champion, ChampionLocationGroup } from "@/lib/champions"

type Props = {
  groups: ChampionLocationGroup[]
}

/**
 * Offline fallback for the map: a scrollable list of locations, each showing the
 * champions based there. Rendered when the browser is offline and map tiles are
 * unavailable.
 */
export function OfflineChampionsList({ groups }: Props) {
  return (
    <div className="h-full overflow-y-auto px-5 py-4">
      <ul className="mx-auto flex max-w-3xl flex-col gap-4">
        {groups.map((group) => (
          <li
            key={group.location}
            className="rounded-lg border border-border bg-card"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
              <h2 className="text-sm font-semibold">{group.location}</h2>
              <span className="shrink-0 text-xs text-muted-foreground">
                {group.champions.length} champion
                {group.champions.length === 1 ? "" : "s"}
              </span>
            </div>
            <ul className="divide-y divide-border">
              {group.champions.map((champ) => (
                <li key={`${group.location}-${champ.name}`}>
                  <ChampionRow champion={champ} />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ChampionRow({ champion }: { champion: Champion }) {
  const meta = [champion.ext_role, champion.company].filter(Boolean).join(" · ")
  const initial = champion.name.charAt(0).toUpperCase()

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold text-muted-foreground">
        {initial}
        {champion.avatar && (
          <img
            src={champion.avatar}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
            onError={(e) => {
              // Avatar isn't cached (e.g. offline first visit): hide the image
              // and reveal the initial underneath.
              e.currentTarget.style.display = "none"
            }}
          />
        )}
      </span>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-medium">
          {champion.user_link ? (
            <a
              href={champion.user_link}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
            >
              {champion.name}
            </a>
          ) : (
            champion.name
          )}
        </span>
        {meta && (
          <span className="truncate text-xs text-muted-foreground">{meta}</span>
        )}
      </div>
    </div>
  )
}
