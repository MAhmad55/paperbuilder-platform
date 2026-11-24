// Phase 7 screenshot PDFs: one per language, populated 1280px shots for
// every route (2 per readable page) + the 768/390 shots after them.
// Usage (from the repo root): node scripts/phase7-pdf.mjs
//   OUT_DIR env (default ./screenshots/phase7) — reads phase7-*.png, writes
//   phase7-en.pdf and phase7-ur.pdf next to them.
// Layout mirrors phase2-pdf.mjs: desktop shots sort before tablet, then
// mobile; desktop viewport shots cap at 122 mm so two fit on one A4 page,
// tall captures (mobile shots) get their own page. Images are embedded as
// data URIs: file:// URLs do not load from page.setContent.
import { readdirSync, readFileSync } from 'node:fs'
import { chromium } from 'playwright'
import path from 'node:path'

const OUT = path.resolve(process.env.OUT_DIR ?? './screenshots/phase7')

const files = readdirSync(OUT).filter((f) => f.startsWith('phase7-') && f.endsWith('.png') && f.includes('-populated-'))

function titleOf(file) {
  return file.replace(/^phase7-/, '').replace(/\.png$/, '')
}

function sortFiles(list) {
  const widthRank = (f) => (f.includes('-1280') ? 0 : f.includes('-768') ? 1 : 2)
  return [...list].sort((a, b) => widthRank(a) - widthRank(b) || a.localeCompare(b))
}

const browser = await chromium.launch()

for (const lang of ['en', 'ur']) {
  const shots = sortFiles(files.filter((f) => f.includes(`-${lang}-`)))

  const figures = shots
    .map((f) => {
      const b64 = readFileSync(path.join(OUT, f)).toString('base64')
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
    img { width: 100%; max-height: 122mm; display: block; border: 1px solid #ccc; }
    figure.tall img { max-height: 250mm; }
    figcaption { font-size: 11px; color: #333; padding-top: 1.5mm; }
  </style></head><body>
  <h1>PaperBuilder — Phase 7 screenshots (${lang.toUpperCase()})</h1>
  ${figures}
  </body></html>`

  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'load' })
  await page.waitForTimeout(500)
  await page.pdf({ path: path.join(OUT, `phase7-${lang}.pdf`), format: 'A4', printBackground: true })
  console.log(`✓ phase7-${lang}.pdf (${shots.length} screenshots)`)
  await page.close()
}

await browser.close()
console.log('done')
