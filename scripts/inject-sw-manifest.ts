import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
// File extensions worth precaching for offline use.
const PRECACHE_EXTENSIONS = new Set([
  'html',
  'js',
  'css',
  'woff',
  'woff2',
  'json',
  'webmanifest',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'svg',
  'ico',
  'txt',
])

// Files that must never be precached (the SW itself, host metadata, sourcemaps).
const PRECACHE_EXCLUDES = new Set(['sw.js', 'CNAME', '.nojekyll', 'robots.txt'])

/** Decide whether a build-output file (relative POSIX path) should be precached. */
export function shouldPrecache(relPath: string): boolean {
  const posix = relPath.replace(/\\/g, '/')
  const name = posix.split('/').pop() ?? ''
  if (PRECACHE_EXCLUDES.has(name)) return false
  if (posix.endsWith('.map')) return false
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : ''
  return PRECACHE_EXTENSIONS.has(ext)
}

/** Map a relative build-output path to the URL the browser will request. */
export function toPrecacheUrl(relPath: string): string {
  const posix = relPath.replace(/\\/g, '/')
  if (posix === 'index.html') return '/'
  if (posix.endsWith('/index.html')) return '/' + posix.slice(0, -'index.html'.length)
  return '/' + posix
}

function walk(dir: string, root: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, root, out)
    } else if (entry.isFile()) {
      out.push(relative(root, full))
    }
  }
}

function main(): void {
  const outDir = join(process.cwd(), 'out')
  const swPath = join(outDir, 'sw.js')

  if (!statSync(outDir).isDirectory()) {
    throw new Error(`Expected build output at ${outDir}`)
  }

  const files: string[] = []
  walk(outDir, outDir, files)

  const precacheFiles = files.filter(shouldPrecache)
  const urls = Array.from(new Set(precacheFiles.map(toPrecacheUrl))).sort()

  // Derive a build id from the content of every precached file so a new deploy
  // invalidates the old caches automatically.
  const hash = createHash('sha256')
  for (const rel of precacheFiles.sort()) {
    hash.update(rel)
    hash.update(readFileSync(join(outDir, rel)))
  }
  const buildId = hash.digest('hex').slice(0, 12)

  let sw = readFileSync(swPath, 'utf8')
  sw = sw.replace(/const BUILD_ID = '[^']*'/, `const BUILD_ID = '${buildId}'`)
  sw = sw.replace(
    /const PRECACHE_ASSETS = \[\]/,
    `const PRECACHE_ASSETS = ${JSON.stringify(urls)}`,
  )
  writeFileSync(swPath, sw)

  console.log(
    `Injected ${urls.length} precache entries (build ${buildId}) into out/sw.js`,
  )
}

// Only run when executed directly (not when imported by tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
