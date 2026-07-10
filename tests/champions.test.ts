import { describe, expect, it } from "vitest"

import { parseCapData, groupByLocation, type Champion } from "@/lib/champions"
import { LOCATION_COORDS } from "@/lib/locations"

describe("parseCapData", () => {
  it("extracts the capData array from page HTML", () => {
    const html = `
      <html><head><script>
        var other = 1;
        var capData = [
          {"name":"Alice","location":"India"},
          {"name":"Bob","location":"France"}
        ];
      </script></head></html>`
    const result = parseCapData(html)
    expect(result).toEqual([
      { name: "Alice", location: "India" },
      { name: "Bob", location: "France" },
    ])
  })

  it("handles brackets and quotes inside string values", () => {
    const html = `var capData = [{"name":"Weird ] name","location":"a \\" [b]"}];`
    const result = parseCapData(html)
    expect(result).toEqual([{ name: "Weird ] name", location: 'a " [b]' }])
  })

  it("filters out entries missing a name or location", () => {
    const html = `var capData = [
      {"name":"Alice","location":"India"},
      {"name":"NoLocation"},
      {"location":"NoName"},
      {"name":"Bob","location":"France"}
    ];`
    const result = parseCapData(html)
    expect(result.map((c) => c.name)).toEqual(["Alice", "Bob"])
  })

  it("throws when the capData marker is missing", () => {
    expect(() => parseCapData("<html>no data here</html>")).toThrow(
      /Could not find `var capData`/,
    )
  })
})

describe("groupByLocation", () => {
  const champions: Champion[] = [
    { name: "Charlie", location: "India" },
    { name: "Alice", location: "India" },
    { name: "Bob", location: "France" },
    { name: "Nemo", location: "Atlantis" },
  ]

  it("groups champions by location and attaches coordinates", () => {
    const { groups } = groupByLocation(champions)
    const india = groups.find((g) => g.location === "India")
    expect(india).toBeDefined()
    expect(india).toMatchObject({
      lat: LOCATION_COORDS.India.lat,
      lon: LOCATION_COORDS.India.lon,
    })
    expect(india?.champions).toHaveLength(2)
  })

  it("sorts groups by size (largest first) and names alphabetically within a group", () => {
    const { groups } = groupByLocation(champions)
    expect(groups.map((g) => g.location)).toEqual(["India", "France"])
    expect(groups[0].champions.map((c) => c.name)).toEqual(["Alice", "Charlie"])
  })

  it("returns champions with unknown locations as unmapped", () => {
    const { unmapped } = groupByLocation(champions)
    expect(unmapped.map((c) => c.name)).toEqual(["Nemo"])
  })
})
