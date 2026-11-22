import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Playwright specs live in tests/ and run under `npx playwright test`
    // only — Vitest must not pick them up (they use test.describe).
    exclude: ['tests/**', 'node_modules/**', 'dist/**'],
  },
})
