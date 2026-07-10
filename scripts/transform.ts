/**
 * Pure transform helpers for the build-time data pipeline.
 *
 * Kept separate from `fetch-data.ts` (which performs network + filesystem I/O)
 * so this logic can be unit-tested in isolation.
 */
import { createHash } from "node:crypto"
import path from "node:path"

import type { Champion } from "../lib/champions"
import { normalizeLocation } from "../lib/locations"

/** Maps an image content-type to a file extension. */
export const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
}

/** Turns a champion name into a filesystem-safe slug. */
export function slugify(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || "champion"
}

/** Best-effort file extension from a URL's pathname, or null if unknown. */
export function extFromUrl(url: string): string | null {
  try {
    const ext = path.extname(new URL(url).pathname).toLowerCase()
    return /^\.(jpe?g|png|webp|gif|svg)$/.test(ext)
      ? ext.replace(".jpeg", ".jpg")
      : null
  } catch {
    return null
  }
}

/**
 * Resolves the file extension to use for a downloaded avatar, preferring the
 * response content-type, then the URL, then a `.jpg` fallback.
 */
export function resolveExtension(contentType: string, url: string): string {
  return IMAGE_EXTENSIONS[contentType] ?? extFromUrl(url) ?? ".jpg"
}

/**
 * Deterministic avatar filename: `<name-slug>-<hash>.<ext>`.
 * The short hash of the source URL guarantees uniqueness and stays stable
 * across builds (so unchanged images produce no git churn), while changing
 * whenever the champion's image actually changes.
 */
export function avatarFilename(champ: Champion, ext: string): string {
  const hash = createHash("sha1")
    .update(champ.img_url ?? champ.name)
    .digest("hex")
    .slice(0, 6)
  return `${slugify(champ.name)}-${hash}${ext}`
}

/** Builds the trimmed, normalized champion record written to JSON. */
export function toOutput(champ: Champion, avatar?: string): Champion {
  const out: Champion = {
    name: champ.name,
    location: normalizeLocation(champ.location),
  }
  if (champ.cap_role) out.cap_role = champ.cap_role
  if (champ.cap_role_since) out.cap_role_since = champ.cap_role_since
  if (champ.company) out.company = champ.company
  if (champ.ext_role) out.ext_role = champ.ext_role
  if (typeof champ.page_order === "number") out.page_order = champ.page_order
  if (champ.user_link) out.user_link = champ.user_link
  if (avatar) out.avatar = avatar
  return out
}
