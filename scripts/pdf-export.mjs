// Export the Design System page to PDF — both languages, A4 pages.
// 2-3 demo cards per page; no trailing blank page.
// Usage (from the repo root): node scripts/pdf-export.mjs
import { chromium } from 'playwright'
import path from 'node:path'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const OUT = path.resolve(process.env.OUT_DIR ?? './screenshots')
mkdirSync(OUT, { recursive: true })

const combos = [
  { lang: 'en', width: 1280, file: 'design-system-en-a4.pdf' },
  { lang: 'ur', width: 1280, file: 'design-system-ur-a4.pdf' },
  { lang: 'en', width: 390, file: 'design-system-en-390-a4.pdf' },
  { lang: 'ur', width: 390, file: 'design-system-ur-390-a4.pdf' },
]

// Print CSS: hide app chrome, keep each demo card whole so 2-3 fit per A4
// page, and drop trailing space that used to produce a blank last page.
const PRINT_CSS = `
  .app-rail, .app-topbar, .app-bottom-tabs { display: none !important; }
  .app-body { margin: 0 !important; padding: 0 !important; }
  .ds-group { break-inside: avoid; page-break-inside: avoid; }
  .ds-group:last-child { margin-bottom: 0 !important; padding-bottom: 0 !important; }
  body { margin: 0 !important; }
`

const browser = await chromium.launch()

for (const { lang, width, file } of combos) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, locale: lang === 'ur' ? 'ur-PK' : 'en-US' })
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
  await page.addStyleTag({ content: PRINT_CSS })

  await page.pdf({
    path: path.join(OUT, file),
    format: 'A4',
    printBackground: true,
    // 0.8 scale packs 2-3 demo cards per A4 page (was 34 pages at 1.0)
    scale: 0.8,
    margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' },
  })
  await page.close()
  console.log(`✓ ${file}`)
}

await browser.close()
console.log('done')
