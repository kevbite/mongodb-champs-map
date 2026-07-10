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
import { mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { SOURCE_URL, parseCapData, type Champion } from "../lib/champions"
import { avatarFilename, resolveExtension, toOutput } from "./transform"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const AVATAR_DIR = path.join(ROOT, "public", "avatars")
const DATA_FILE = path.join(ROOT, "lib", "data", "champions.json")

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Referer: "https://www.mongodb.com/community/champions",
  Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
}

const DOWNLOAD_CONCURRENCY = 8

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

    const ext = resolveExtension(contentType, src)
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
