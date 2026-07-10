/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce a fully static site in `out/` for GitHub Pages.
  output: 'export',
  // Served at the root of the custom subdomain, so no basePath/assetPrefix.
  images: {
    unoptimized: true,
  },
}

export default nextConfig
