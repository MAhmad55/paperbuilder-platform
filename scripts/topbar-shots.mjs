// Real screenshots (not print) of the mobile top bar: Urdu + English,
// 390px wide, /design-system, PNG at deviceScaleFactor 2, showing the
// page title and the language toggle.
// Usage (from the repo root): node scripts/topbar-shots.mjs
import { chromium } from 'playwright'
import path from 'node:path'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const OUT = path.resolve(process.env.OUT_DIR ?? './screenshots')
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()

for (const lang of ['ur', 'en']) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844, deviceScaleFactor: 2 },
    locale: lang === 'ur' ? 'ur-PK' : 'en-US',
  })
  await page.addInitScript(({ lang }) => {
    localStorage.setItem('paperbuilder.lang', lang)
    localStorage.setItem('paperbuilder.v1', JSON.stringify({
      papers: [], audit: [], notifications: [], schoolOverrides: {},
      session: { role: 'teacher', userId: 'u-tch-01', schoolId: 'sch-beacon', signedInAt: '2026-11-22T00:00:00.000Z' },
    }))
  }, { lang })
  await page.goto(`${BASE}/design-system`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.app-topbar', { timeout: 20000 })
  await page.waitForTimeout(2000)
  const bar = page.locator('.app-topbar')
  await bar.screenshot({ path: path.join(OUT, `topbar-${lang}-390.png`) })
  await page.close()
  console.log(`✓ topbar-${lang}-390.png`)
}

await browser.close()
console.log('done')
