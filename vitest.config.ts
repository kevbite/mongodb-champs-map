import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // Mirror the `@/*` path alias from tsconfig.json so tests import like the app.
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
})
