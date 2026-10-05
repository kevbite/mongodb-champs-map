"use client"

import "leaflet/dist/leaflet.css"
import { useEffect, useRef } from "react"
import type { Map as LeafletMap } from "leaflet"
import type { LocationGroup } from "@/lib/champions"
import { buildPopupHtml, pinSize } from "@/lib/popup"

type Props = {
  groups: LocationGroup[]
}

export function ChampionsMap({ groups }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      const L = (await import("leaflet")).default
      if (cancelled || !containerRef.current || mapRef.current) return

      const map = L.map(containerRef.current, {
        center: [25, 10],
        zoom: 2,
        minZoom: 2,
        maxZoom: 8,
        worldCopyJump: true,
        scrollWheelZoom: true,
      })
      mapRef.current = map

      const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY
      const keyParam = cartoKey ? `?key=${cartoKey}` : ""

      L.tileLayer(
        `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png${keyParam}`,
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 8,
        },
      ).addTo(map)

      const bounds: [number, number][] = []

      for (const group of groups) {
        const size = pinSize(group.champions.length)

        const icon = L.divIcon({
          className: "champion-pin",
          html: `<div class="champion-pin__bubble" style="width:${size}px;height:${size}px">${group.champions.length}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        })

        L.marker([group.lat, group.lon], { icon })
          .addTo(map)
          .bindPopup(buildPopupHtml(group), { maxWidth: 300, minWidth: 240 })

        bounds.push([group.lat, group.lon])
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 4 })
      }
    }

    init()

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [groups])

  return <div ref={containerRef} className="h-full w-full" />
}
