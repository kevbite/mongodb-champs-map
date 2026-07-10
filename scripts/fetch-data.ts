/**
 * Build-time data pipeline.
 *
 * Fetches the MongoDB Community Champions page, extracts the embedded champion
 * data, downloads every avatar into `public/avatars/` under a deterministic
 * filename, and writes the result to `lib/data/champions.json`.
 *
 * The app then imports that JSON at build time, so the deployed site is fully
 * static with no runtime dependency on mongodb.com. Committing the generated
 * JSON + avatars also gives the weekly refresh workflow a natural git diff to
 * decide whether anything changed.
 *
 * Run with: `pnpm fetch-data`
 */
import { createHash } from "node:crypto"
import { mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { SOURCE_URL, parseCapData, type Champion } from "../lib/champions"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const AVATAR_DIR = path.join(ROOT, "public", "avatars")
const DATA_FILE = path.join(ROOT, "lib", "data", "champions.json")

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Referer: "https://www.mongodb.com/community/champions",
  Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
}

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
}

const DOWNLOAD_CONCURRENCY = 8

/** Canonicalizes location strings that appear under multiple spellings. */
const LOCATION_REPLACEMENTS: Record<string, string> = {
  UK: "United Kingdom",
  Brasil: "Brazil",
}

function normalizeLocation(location: string): string {
  return LOCATION_REPLACEMENTS[location] ?? location
}

/** Turns a champion name into a filesystem-safe slug. */
function slugify(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || "champion"
}

/** Best-effort file extension from a URL's pathname. */
function extFromUrl(url: string): string | null {
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
 * Deterministic avatar filename: `<name-slug>-<hash>.<ext>`.
 * The short hash of the source URL guarantees uniqueness and stays stable
 * across builds (so unchanged images produce no git churn), while changing
 * whenever the champion's image actually changes.
 */
function avatarFilename(champ: Champion, ext: string): string {
  const hash = createHash("sha1")
    .update(champ.img_url ?? champ.name)
    .digest("hex")
    .slice(0, 6)
  return `${slugify(champ.name)}-${hash}${ext}`
}

type DownloadResult = { champ: Champion; avatar?: string }

async function downloadAvatar(champ: Champion): Promise<DownloadResult> {
  const src = champ.img_url
  if (!src || !/^https?:\/\//i.test(src)) {
    return { champ }
  }

  try {
    const res = await fetch(src, { headers: BROWSER_HEADERS })
    if (!res.ok) {
      console.warn(`  ! ${champ.name}: HTTP ${res.status} for avatar, skipping`)
      return { champ }
    }

    const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim()
    if (!contentType.startsWith("image/")) {
      console.warn(`  ! ${champ.name}: non-image response (${contentType || "unknown"}), skipping`)
      return { champ }
    }

    const ext = IMAGE_EXTENSIONS[contentType] ?? extFromUrl(src) ?? ".jpg"
    const filename = avatarFilename(champ, ext)
    const bytes = Buffer.from(await res.arrayBuffer())
    await writeFile(path.join(AVATAR_DIR, filename), bytes)
    return { champ, avatar: `/avatars/${filename}` }
  } catch (err) {
    console.warn(`  ! ${champ.name}: avatar download failed (${(err as Error).message}), skipping`)
    return { champ }
  }
}

/** Runs an async mapper over items with a bounded concurrency. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await mapper(items[index])
    }
  })
  await Promise.all(workers)
  return results
}

/** Builds the trimmed, stably-ordered champion record written to JSON. */
function toOutput(champ: Champion, avatar?: string): Champion {
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

async function main() {
  console.log(`Fetching champions from ${SOURCE_URL} ...`)
  const res = await fetch(SOURCE_URL, { headers: BROWSER_HEADERS })
  if (!res.ok) {
    throw new Error(`Failed to fetch champions page: ${res.status} ${res.statusText}`)
  }
  const html = await res.text()

  const champions = parseCapData(html)
  console.log(`Parsed ${champions.length} champions.`)
  if (champions.length === 0) {
    throw new Error("Parsed zero champions — refusing to overwrite data with an empty set.")
  }

  // Deterministic ordering keeps JSON diffs minimal between runs.
  champions.sort(
    (a, b) => a.name.localeCompare(b.name) || a.location.localeCompare(b.location),
  )

  // Start from a clean avatar directory so removed champions don't leave orphans.
  await rm(AVATAR_DIR, { recursive: true, force: true })
  await mkdir(AVATAR_DIR, { recursive: true })
  await mkdir(path.dirname(DATA_FILE), { recursive: true })

  console.log(`Downloading avatars (concurrency ${DOWNLOAD_CONCURRENCY}) ...`)
  const downloaded = await mapWithConcurrency(champions, DOWNLOAD_CONCURRENCY, downloadAvatar)

  const output = downloaded.map(({ champ, avatar }) => toOutput(champ, avatar))
  const withAvatar = output.filter((c) => c.avatar).length

  await writeFile(DATA_FILE, JSON.stringify(output, null, 2) + "\n", "utf8")

  console.log(
    `Wrote ${output.length} champions to ${path.relative(ROOT, DATA_FILE)} ` +
      `(${withAvatar} with avatars).`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
