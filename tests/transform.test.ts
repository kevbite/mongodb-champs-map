import { describe, expect, it } from "vitest"

import type { Champion } from "@/lib/champions"
import {
  avatarFilename,
  extFromUrl,
  resolveExtension,
  slugify,
  toOutput,
} from "@/scripts/transform"

describe("slugify", () => {
  it("lowercases and hyphenates names", () => {
    expect(slugify("Jane Doe")).toBe("jane-doe")
  })

  it("strips diacritics", () => {
    expect(slugify("Renée Désirée")).toBe("renee-desiree")
  })

  it("collapses non-alphanumeric runs and trims edges", () => {
    expect(slugify("  A@@B!!  ")).toBe("a-b")
  })

  it("falls back to 'champion' when nothing usable remains", () => {
    expect(slugify("!!!")).toBe("champion")
  })
})

describe("extFromUrl", () => {
  it("returns known extensions from the pathname", () => {
    expect(extFromUrl("https://x.test/a/photo.png?v=1")).toBe(".png")
    expect(extFromUrl("https://x.test/a/photo.webp")).toBe(".webp")
  })

  it("normalizes .jpeg to .jpg", () => {
    expect(extFromUrl("https://x.test/a/photo.jpeg")).toBe(".jpg")
  })

  it("returns null for unknown extensions or invalid URLs", () => {
    expect(extFromUrl("https://x.test/a/file.bmp")).toBeNull()
    expect(extFromUrl("not a url")).toBeNull()
  })
})

describe("resolveExtension", () => {
  it("prefers the content-type", () => {
    expect(resolveExtension("image/png", "https://x.test/a.webp")).toBe(".png")
  })

  it("falls back to the URL extension, then .jpg", () => {
    expect(resolveExtension("application/octet-stream", "https://x.test/a.webp")).toBe(".webp")
    expect(resolveExtension("application/octet-stream", "https://x.test/a")).toBe(".jpg")
  })
})

describe("avatarFilename", () => {
  const champ: Champion = {
    name: "Jane Doe",
    location: "India",
    img_url: "https://cdn.test/jane.jpg",
  }

  it("produces a deterministic slug-hash-ext filename", () => {
    expect(avatarFilename(champ, ".jpg")).toMatch(/^jane-doe-[0-9a-f]{6}\.jpg$/)
  })

  it("is stable across calls", () => {
    expect(avatarFilename(champ, ".jpg")).toBe(avatarFilename(champ, ".jpg"))
  })

  it("varies the hash by source URL for the same name", () => {
    const other: Champion = { ...champ, img_url: "https://cdn.test/other.jpg" }
    expect(avatarFilename(champ, ".jpg")).not.toBe(avatarFilename(other, ".jpg"))
  })

  it("falls back to hashing the name when there is no img_url", () => {
    const noImg: Champion = { name: "Jane Doe", location: "India" }
    expect(avatarFilename(noImg, ".png")).toMatch(/^jane-doe-[0-9a-f]{6}\.png$/)
  })
})

describe("toOutput", () => {
  it("keeps only populated fields and normalizes the location", () => {
    const champ: Champion = { name: "Alice", location: "UK" }
    expect(toOutput(champ)).toEqual({ name: "Alice", location: "United Kingdom" })
  })

  it("includes the avatar path when provided", () => {
    const champ: Champion = { name: "Alice", location: "France" }
    expect(toOutput(champ, "/avatars/alice-abc123.jpg")).toEqual({
      name: "Alice",
      location: "France",
      avatar: "/avatars/alice-abc123.jpg",
    })
  })

  it("carries through all optional fields including page_order 0", () => {
    const champ: Champion = {
      name: "Bob",
      location: "France",
      cap_role: "Champion",
      cap_role_since: "2024",
      company: "Acme",
      ext_role: "Engineer",
      page_order: 0,
      user_link: "https://x.test/bob",
      img_url: "https://cdn.test/bob.jpg",
    }
    expect(toOutput(champ, "/avatars/bob.jpg")).toEqual({
      name: "Bob",
      location: "France",
      cap_role: "Champion",
      cap_role_since: "2024",
      company: "Acme",
      ext_role: "Engineer",
      page_order: 0,
      user_link: "https://x.test/bob",
      avatar: "/avatars/bob.jpg",
    })
  })
})
