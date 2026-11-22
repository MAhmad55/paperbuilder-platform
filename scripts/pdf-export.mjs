// Export the Design System page to PDF — both languages × 1280px and 390px.
// Usage (from the repo root): node scripts/pdf-export.mjs
import { chromium } from 'playwright'
import path from 'node:path'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const OUT = path.resolve(process.env.OUT_DIR ?? './screenshots')
mkdirSync(OUT, { recursive: true })

const combos = [
  { lang: 'en', width: 1280, height: 1250, file: 'design-system-en-1280.pdf' },
  { lang: 'ur', width: 1280, height: 1250, file: 'design-system-ur-1280.pdf' },
  { lang: 'en', width: 390, height: 844, file: 'design-system-en-390.pdf' },
  { lang: 'ur', width: 390, height: 844, file: 'design-system-ur-390.pdf' },
]

const browser = await chromium.launch()

for (const { lang, width, height, file } of combos) {
  const page = await browser.newPage({ viewport: { width, height }, locale: lang === 'ur' ? 'ur-PK' : 'en-US' })
  await page.addInitScript(({ lang }) => {
    localStorage.setItem('paperbuilder.lang', lang)
    localStorage.setItem('paperbuilder.v1', JSON.stringify({
      papers: [], audit: [], notifications: [], schoolOverrides: {},
      session: { role: 'teacher', userId: 'u-tch-01', schoolId: 'sch-beacon', signedInAt: '2026-11-22T00:00:00.000Z' },
    }))
  }, { lang })
  await page.goto(`${BASE}/design-system`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.ds-group', { timeout: 20000 })
  await page.waitForTimeout(3200)

  await page.pdf({
    path: path.join(OUT, file),
    printBackground: true,
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
    width: `${width}px`,
    height: `${height}px`,
  })
  await page.close()
  console.log(`✓ ${file}`)
}

await browser.close()
console.log('done')
