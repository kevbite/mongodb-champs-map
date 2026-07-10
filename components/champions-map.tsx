"use client"

import "leaflet/dist/leaflet.css"
import { useEffect, useRef } from "react"
import type { Map as LeafletMap } from "leaflet"
import type { LocationGroup } from "@/lib/champions"

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

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 8,
        },
      ).addTo(map)

      const bounds: [number, number][] = []

      for (const group of groups) {
        const count = group.champions.length
        const size = count > 9 ? 44 : count > 4 ? 38 : 32

        const icon = L.divIcon({
          className: "champion-pin",
          html: `<div class="champion-pin__bubble" style="width:${size}px;height:${size}px">${count}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        })

        const listItems = group.champions
          .map((c) => {
            const name = c.user_link
              ? `<a href="${c.user_link}" target="_blank" rel="noreferrer">${escapeHtml(c.name)}</a>`
              : escapeHtml(c.name)
            const meta = [c.ext_role, c.company]
              .filter(Boolean)
              .map((s) => escapeHtml(s as string))
              .join(" · ")
            const initial = escapeHtml(c.name.charAt(0).toUpperCase())
            // Always render the initial as a base layer; the proxied image
            // sits on top and simply hides itself if it fails to load,
            // revealing the initial underneath.
            const img = `<span class="champion-popup__avatar">
                <span class="champion-popup__avatar-initial">${initial}</span>
                ${
                  c.img_url
                    ? `<img src="/api/avatar?url=${encodeURIComponent(c.img_url)}" alt="" class="champion-popup__avatar-img" loading="lazy" onerror="this.style.display='none'" />`
                    : ""
                }
              </span>`
            return `<li class="champion-popup__item">
              ${img}
              <span class="champion-popup__text">
                <span class="champion-popup__name">${name}</span>
                ${meta ? `<span class="champion-popup__meta">${meta}</span>` : ""}
              </span>
            </li>`
          })
          .join("")

        const popupHtml = `<div class="champion-popup">
          <div class="champion-popup__header">
            <span class="champion-popup__location">${escapeHtml(group.location)}</span>
            <span class="champion-popup__count">${count} champion${count === 1 ? "" : "s"}</span>
          </div>
          <ul class="champion-popup__list">${listItems}</ul>
        </div>`

        L.marker([group.lat, group.lon], { icon })
          .addTo(map)
          .bindPopup(popupHtml, { maxWidth: 300, minWidth: 240 })

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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
