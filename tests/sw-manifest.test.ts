import { describe, expect, it } from "vitest"

import { shouldPrecache, toPrecacheUrl } from "@/scripts/inject-sw-manifest"

describe("shouldPrecache", () => {
  it("includes hashed JS/CSS chunks and fonts", () => {
    expect(shouldPrecache("_next/static/chunks/abc123.js")).toBe(true)
    expect(shouldPrecache("_next/static/css/def456.css")).toBe(true)
    expect(shouldPrecache("_next/static/media/font-s.p.woff2")).toBe(true)
  })

  it("includes html, icons and avatars", () => {
    expect(shouldPrecache("index.html")).toBe(true)
    expect(shouldPrecache("icon-512x512.png")).toBe(true)
    expect(shouldPrecache("avatars/jane-doe-abc123.jpg")).toBe(true)
    expect(shouldPrecache("manifest.webmanifest")).toBe(true)
  })

  it("excludes the service worker, sourcemaps and host metadata", () => {
    expect(shouldPrecache("sw.js")).toBe(false)
    expect(shouldPrecache("_next/static/chunks/abc123.js.map")).toBe(false)
    expect(shouldPrecache("CNAME")).toBe(false)
    expect(shouldPrecache(".nojekyll")).toBe(false)
  })

  it("excludes files without a cacheable extension", () => {
    expect(shouldPrecache("some-file")).toBe(false)
  })
})

describe("toPrecacheUrl", () => {
  it("maps the root index.html to /", () => {
    expect(toPrecacheUrl("index.html")).toBe("/")
  })

  it("maps a nested index.html to its directory url", () => {
    expect(toPrecacheUrl("about/index.html")).toBe("/about/")
  })

  it("prefixes other assets with a leading slash", () => {
    expect(toPrecacheUrl("_next/static/chunks/abc.js")).toBe(
      "/_next/static/chunks/abc.js",
    )
    expect(toPrecacheUrl("icon-512x512.png")).toBe("/icon-512x512.png")
  })

  it("normalizes Windows path separators", () => {
    expect(toPrecacheUrl("_next\\static\\chunks\\abc.js")).toBe(
      "/_next/static/chunks/abc.js",
    )
  })
})
