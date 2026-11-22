import { defineConfig } from 'playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
    locale: 'en-US',
    viewport: { width: 1280, height: 900 },
  },
})
