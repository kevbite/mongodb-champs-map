import { describe, expect, it } from "vitest"

import type { Champion, LocationGroup } from "@/lib/champions"
import {
  buildPopupHtml,
  championAvatarHtml,
  championListItemHtml,
  escapeHtml,
  pinSize,
} from "@/lib/popup"

describe("escapeHtml", () => {
  it("escapes all five HTML-sensitive characters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;")
  })

  it("leaves plain text untouched", () => {
    expect(escapeHtml("Jane Doe")).toBe("Jane Doe")
  })
})

describe("pinSize", () => {
  it("scales the pin with the champion count", () => {
    expect(pinSize(1)).toBe(32)
    expect(pinSize(4)).toBe(32)
    expect(pinSize(5)).toBe(38)
    expect(pinSize(9)).toBe(38)
    expect(pinSize(10)).toBe(44)
  })
})

describe("championAvatarHtml", () => {
  it("renders the escaped uppercase initial", () => {
    const champ: Champion = { name: "<script>", location: "X" }
    expect(championAvatarHtml(champ)).toContain(
      `champion-popup__avatar-initial">&lt;<`,
    )
  })

  it("includes the local avatar image when present", () => {
    const champ: Champion = { name: "Alice", location: "X", avatar: "/avatars/alice.jpg" }
    const html = championAvatarHtml(champ)
    expect(html).toContain(`<img src="/avatars/alice.jpg"`)
    expect(html).toContain("onerror")
  })

  it("omits the image when there is no avatar", () => {
    const champ: Champion = { name: "Alice", location: "X" }
    expect(championAvatarHtml(champ)).not.toContain("<img")
  })
})

describe("championListItemHtml", () => {
  it("links the name and escapes the href when user_link is present", () => {
    const champ: Champion = {
      name: "A & B",
      location: "X",
      user_link: "https://x.test/?a=1&b=2",
    }
    const html = championListItemHtml(champ)
    expect(html).toContain(`href="https://x.test/?a=1&amp;b=2"`)
    expect(html).toContain("A &amp; B</a>")
  })

  it("renders the name as plain text without a link", () => {
    const champ: Champion = { name: "Alice", location: "X" }
    const html = championListItemHtml(champ)
    expect(html).not.toContain("<a ")
    expect(html).toContain("Alice")
  })

  it("joins ext_role and company into a meta line", () => {
    const champ: Champion = {
      name: "Alice",
      location: "X",
      ext_role: "Engineer",
      company: "Acme",
    }
    expect(championListItemHtml(champ)).toContain("Engineer · Acme")
  })

  it("omits the meta line when there is no role or company", () => {
    const champ: Champion = { name: "Alice", location: "X" }
    expect(championListItemHtml(champ)).not.toContain("champion-popup__meta")
  })
})

describe("buildPopupHtml", () => {
  const group: LocationGroup = {
    location: "A <b> place",
    lat: 0,
    lon: 0,
    champions: [
      { name: "Alice", location: "A <b> place" },
      { name: "Bob", location: "A <b> place" },
    ],
  }

  it("escapes the location and renders one item per champion", () => {
    const html = buildPopupHtml(group)
    expect(html).toContain("A &lt;b&gt; place")
    expect(html.match(/champion-popup__item/g)).toHaveLength(2)
  })

  it("pluralizes the champion count", () => {
    expect(buildPopupHtml(group)).toContain("2 champions")
    expect(buildPopupHtml({ ...group, champions: [group.champions[0]] })).toContain(
      "1 champion<",
    )
  })
})
