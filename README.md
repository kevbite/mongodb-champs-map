# MongoDB Community Champions Map

An interactive [Leaflet](https://leafletjs.com/) map of the
[MongoDB Community Champions](https://www.mongodb.com/community/champions),
rolled up by location. Built with Next.js and deployed as a **fully static
site** to GitHub Pages.

Live site: <https://mongodb-champs.kevsoft.net>

## How it works

The champion data and avatar images are **baked into the build** rather than
fetched at runtime:

1. `pnpm fetch-data` (`scripts/fetch-data.ts`) scrapes the champions page,
   extracts the embedded `capData`, downloads every avatar into
   `public/avatars/<name-slug>-<hash>.<ext>`, and writes
   `lib/data/champions.json`.
2. `app/page.tsx` imports that JSON at build time, so the exported HTML already
   contains all champion data — no server, database, or runtime API calls.
3. `pnpm build` produces a static site in `out/` (`output: 'export'`), which is
   published to GitHub Pages.

The generated `lib/data/champions.json` and `public/avatars/` are committed to
the repo. This makes deploys deterministic and gives the weekly refresh a
natural git diff to detect when the source content has actually changed.

## Local development

```bash
pnpm install

# Refresh the committed data + avatars from mongodb.com (optional; the repo
# already contains a snapshot).
pnpm fetch-data

# Run the dev server.
pnpm dev

# Produce the static export in ./out
pnpm build
```

Requirements: Node.js 20+ and pnpm (see `packageManager` in `package.json`).

## Deployment (GitHub Pages)

Deployment is automated via GitHub Actions:

- **`.github/workflows/deploy.yml`** — on every push to `main` (and on manual
  dispatch), builds the static export and publishes it to GitHub Pages.
- **`.github/workflows/refresh.yml`** — runs **weekly** (Monday 06:00 UTC). It
  re-runs `pnpm fetch-data`; if the champion data or avatars changed, it commits
  the update and triggers a deploy. If nothing changed, it does nothing, so the
  site is never redeployed just to stay in place.

### One-time repository setup

1. Push this repository to GitHub (a **public** repo gets Pages for free; Pages
   on a private repo requires a paid GitHub plan).
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. The first push to `main` runs `deploy.yml` and publishes the site.

### Custom domain (`mongodb-champs.kevsoft.net`)

The `public/CNAME` file pins the custom domain across deploys. To finish setup:

1. At your DNS provider for `kevsoft.net`, add a **CNAME** record:

   | Type  | Name             | Value                 |
   | ----- | ---------------- | --------------------- |
   | CNAME | `mongodb-champs` | `<user>.github.io.`   |

   (Replace `<user>` with the GitHub account/org that owns the repo, e.g.
   `kevbite.github.io.`)

2. In **Settings → Pages → Custom domain**, enter
   `mongodb-champs.kevsoft.net` and save.
3. Once DNS has propagated, enable **Enforce HTTPS**.

Because the site is served at the root of the subdomain, no `basePath` or
`assetPrefix` configuration is required.

## Project structure

| Path                          | Purpose                                             |
| ----------------------------- | --------------------------------------------------- |
| `scripts/fetch-data.ts`       | Build-time data + avatar fetcher                    |
| `lib/champions.ts`            | Parsing, grouping, and shared types                 |
| `lib/locations.ts`            | Location → lat/lon lookup                           |
| `lib/data/champions.json`     | Committed champion data snapshot (generated)        |
| `public/avatars/`             | Committed avatar images (generated)                 |
| `app/page.tsx`                | Page that renders the map from the baked JSON       |
| `components/champions-map.tsx`| Client-side Leaflet map                             |
