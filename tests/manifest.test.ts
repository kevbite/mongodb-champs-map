import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const PUBLIC_DIR = join(process.cwd(), "public")

function readManifest() {
  const raw = readFileSync(join(PUBLIC_DIR, "manifest.webmanifest"), "utf8")
  return JSON.parse(raw)
}

describe("manifest.webmanifest", () => {
  it("is valid JSON with the required PWA fields", () => {
    const manifest = readManifest()
    expect(manifest.name).toBeTruthy()
    expect(manifest.short_name).toBeTruthy()
    expect(manifest.start_url).toBe("/")
    expect(manifest.scope).toBe("/")
    expect(manifest.display).toBe("standalone")
    expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/)
    expect(manifest.background_color).toMatch(/^#[0-9a-fA-F]{6}$/)
  })

  it("declares 192, 512 and a maskable icon", () => {
    const manifest = readManifest()
    const icons: Array<{ sizes: string; purpose?: string }> = manifest.icons
    expect(icons.some((i) => i.sizes === "192x192")).toBe(true)
    expect(icons.some((i) => i.sizes === "512x512")).toBe(true)
    expect(
      icons.some((i) => (i.purpose ?? "").split(" ").includes("maskable")),
    ).toBe(true)
  })

  it("references icon files that exist in public/", () => {
    const manifest = readManifest()
    const icons: Array<{ src: string }> = manifest.icons
    for (const icon of icons) {
      const relative = icon.src.replace(/^\//, "")
      expect(existsSync(join(PUBLIC_DIR, relative))).toBe(true)
    }
  })

  it("ships a service worker at the site root", () => {
    expect(existsSync(join(PUBLIC_DIR, "sw.js"))).toBe(true)
  })
})
