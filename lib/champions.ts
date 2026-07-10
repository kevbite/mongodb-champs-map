import { LOCATION_COORDS } from "./locations"

export type Champion = {
  cap_role?: string
  cap_role_since?: string
  company?: string
  ext_role?: string
  img_url?: string
  location: string
  name: string
  page_order?: number
  user_link?: string
  /** Local, build-time-downloaded avatar path (e.g. `/avatars/jane-doe-a1b2c3.jpg`). */
  avatar?: string
}

export type LocationGroup = {
  location: string
  lat: number
  lon: number
  champions: Champion[]
}

export const SOURCE_URL = "https://www.mongodb.com/community/champions"

/**
 * Extracts and parses the JSON array assigned to `var capData` in the page HTML.
 */
export function parseCapData(html: string): Champion[] {
  const marker = "var capData ="
  const start = html.indexOf(marker)
  if (start === -1) {
    throw new Error("Could not find `var capData` in page source")
  }

  // Find the first `[` after the marker, then walk to the matching `]`.
  const arrStart = html.indexOf("[", start)
  if (arrStart === -1) {
    throw new Error("Could not find start of capData array")
  }

  let depth = 0
  let inString = false
  let escaped = false
  let arrEnd = -1

  for (let i = arrStart; i < html.length; i++) {
    const ch = html[i]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (ch === "\\") {
        escaped = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }

    if (ch === '"') {
      inString = true
    } else if (ch === "[") {
      depth++
    } else if (ch === "]") {
      depth--
      if (depth === 0) {
        arrEnd = i
        break
      }
    }
  }

  if (arrEnd === -1) {
    throw new Error("Could not find end of capData array")
  }

  const jsonText = html.slice(arrStart, arrEnd + 1)
  const data = JSON.parse(jsonText) as Champion[]
  return data.filter((c) => c && c.name && c.location)
}

/**
 * Rolls up champions by location and attaches lat/lon coordinates.
 * Locations without a known coordinate are skipped from the map but
 * returned separately so the UI can surface them.
 *
 * Location strings are expected to be normalized already (this happens at
 * fetch time in `scripts/fetch-data.ts`).
 */
export function groupByLocation(champions: Champion[]): {
  groups: LocationGroup[]
  unmapped: Champion[]
} {
  const byLocation = new Map<string, Champion[]>()

  for (const champ of champions) {
    const list = byLocation.get(champ.location) ?? []
    list.push(champ)
    byLocation.set(champ.location, list)
  }

  const groups: LocationGroup[] = []
  const unmapped: Champion[] = []

  for (const [location, list] of byLocation) {
    const coords = LOCATION_COORDS[location]
    if (!coords) {
      unmapped.push(...list)
      continue
    }
    // Sort people alphabetically within a pin.
    list.sort((a, b) => a.name.localeCompare(b.name))
    groups.push({
      location,
      lat: coords.lat,
      lon: coords.lon,
      champions: list,
    })
  }

  // Biggest groups first.
  groups.sort((a, b) => b.champions.length - a.champions.length)

  return { groups, unmapped }
}
