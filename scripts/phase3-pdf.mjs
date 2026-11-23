// Phase 3 screenshot PDFs: one per language, 2 screenshots per readable page.
// Usage (from the repo root): node scripts/phase3-pdf.mjs
//   OUT_DIR env (default ./screenshots/phase3) — reads phase3-*.png, writes
//   phase3-en.pdf and phase3-ur.pdf next to them.
// Layout mirrors phase2-pdf.mjs: desktop shots sort before mobile shots;
// desktop viewport shots cap at 122 mm so two fit on one A4 page, tall
// captures (mobile shots, full-page shots) get their own page.
import { readdirSync, readFileSync } from 'node:fs'
import { chromium } from 'playwright'
import path from 'node:path'

const OUT = path.resolve(process.env.OUT_DIR ?? './screenshots/phase3')

const ORDER = [
  'dashboard-populated',
  'schools-populated', 'schools-empty',
  'school-detail-populated',
  'approvals-populated',
  'plans-populated',
  'bank-empty', 'bank-connected',
  'users-populated',
  'announcements-populated',
  'audit-populated',
  'settings-populated',
]

const files = readdirSync(OUT).filter((f) => f.startsWith('phase3-') && f.endsWith('.png'))

function titleOf(file) {
  return file.replace(/^phase3-/, '').replace(/\.png$/, '')
}

function sortFiles(list) {
  // Desktop (1280) shots first, then mobile (390): a 1280 shot (~120 mm
  // tall) pairs with another 1280 shot on one A4 page, but a 390 shot
  // (~250 mm at the max-height cap) pairs with nothing, so interleaving
  // them by screen would put every figure on its own page.
  const widthRank = (f) => (f.includes('-1280') ? 0 : 1)
  return [...list].sort((a, b) => {
    const ka = ORDER.findIndex((k) => titleOf(a).startsWith(k))
    const kb = ORDER.findIndex((k) => titleOf(b).startsWith(k))
    return (
      widthRank(a) - widthRank(b) ||
      (ka === -1 ? 99 : ka) - (kb === -1 ? 99 : kb) ||
      a.localeCompare(b)
    )
  })
}

const browser = await chromium.launch()

for (const lang of ['en', 'ur']) {
  const shots = sortFiles(files.filter((f) => f.includes(`-${lang}-`)))

  /* Images are embedded as data URIs: file:// URLs do not load from
     setContent (about:blank), which produced empty frames. */
  const figures = shots
    .map((f) => {
      const b64 = readFileSync(path.join(OUT, f)).toString('base64')
      // Tall captures take their own page at a readable size: mobile
      // (390) shots and full-page shots. Desktop viewport shots pair
      // two per page (Phase 2 format).
      const tall = f.includes('-390')
      return `
      <figure${tall ? ' class="tall"' : ''}>
        <img src="data:image/png;base64,${b64}" alt="${titleOf(f)}" />
        <figcaption>${titleOf(f)}</figcaption>
      </figure>`
    })
    .join('\n')

  const html = `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><style>
    @page { size: A4 portrait; margin: 12mm; }
    body { font-family: sans-serif; margin: 0; }
    h1 { font-size: 20px; margin: 0 0 4mm; }
    figure { margin: 0 0 6mm; page-break-inside: avoid; }
    figure:nth-of-type(2n) { page-break-after: always; margin-bottom: 0; }
    /* Desktop viewport shots cap at 122 mm so two fit on one A4 page. */
    img { width: 100%; max-height: 122mm; display: block; border: 1px solid #ccc; }
    figure.tall img { max-height: 250mm; }
    figcaption { font-size: 11px; color: #333; padding-top: 1.5mm; }
  </style></head><body>
  <h1>PaperBuilder — Phase 3 screenshots (${lang.toUpperCase()})</h1>
  ${figures}
  </body></html>`

  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'load' })
  await page.waitForTimeout(500)
  await page.pdf({ path: path.join(OUT, `phase3-${lang}.pdf`), format: 'A4', printBackground: true })
  console.log(`✓ phase3-${lang}.pdf (${shots.length} screenshots)`)
  await page.close()
}

await browser.close()
console.log('done')
