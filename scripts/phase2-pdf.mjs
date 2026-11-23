// Phase 2 screenshot PDFs: one per language, 2 screenshots per readable page.
// Usage (from the repo root): node scripts/phase2-pdf.mjs
//   OUT_DIR env (default ./screenshots/phase2) — reads phase2-*.png, writes
//   phase2-en.pdf and phase2-ur.pdf next to them.
import { chromium } from 'playwright'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const OUT = path.resolve(process.env.OUT_DIR ?? './screenshots/phase2')

const ORDER = [
  'landing-populated',
  'landing-hero', 'landing-how', 'landing-roles', 'landing-trust', 'landing-plans', 'landing-faq', 'landing-cta',
  'sign-in-populated', 'sign-in-error',
  'request-access-populated', 'request-access-error', 'request-access-review',
  'request-status-pending', 'request-status-info', 'request-status-rejected', 'request-status-approved',
  'forgot-password-step1', 'forgot-password-step2', 'forgot-password-success',
  'invite-populated', 'invite-error', 'invite-expired',
  'legal-terms-populated', 'legal-privacy-populated',
  'public-preview-populated',
]

const files = readdirSync(OUT).filter((f) => f.startsWith('phase2-') && f.endsWith('.png'))

function titleOf(file) {
  return file.replace(/^phase2-/, '').replace(/\.png$/, '')
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
  const shots = sortFiles(files.filter((f) => f.includes(`-${lang}-`) && !f.includes('hero-paper')))
  const hero = files.find((f) => f === `phase2-hero-paper-${lang}.png`)
  const all = hero ? [...shots, hero] : shots

  /* Images are embedded as data URIs: file:// URLs do not load from
     setContent (about:blank), which produced empty frames. */
  const figures = all
    .map((f) => {
      const b64 = readFileSync(path.join(OUT, f)).toString('base64')
      // Tall captures take their own page at a readable size: mobile
      // (390) shots, full-page error shots, and the hero paper crop.
      // Desktop viewport shots pair two per page (Phase 2 format).
      const tall = f.includes('-390') || f.includes('invite-error') || f.includes('hero-paper')
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
    /* Full-page captures (invite-error) are far taller than A4: cap the
       height so the figure stays on one page instead of forcing blank
       overflow pages (Phase 2 fixes A7). Width shrinks to keep the ratio. */
    /* Desktop viewport shots cap at 122 mm so two fit on one A4 page. */
    img { width: 100%; max-height: 122mm; display: block; border: 1px solid #ccc; }
    figure.tall img { max-height: 250mm; }
    figcaption { font-size: 11px; color: #333; padding-top: 1.5mm; }
  </style></head><body>
  <h1>PaperBuilder — Phase 2 screenshots (${lang.toUpperCase()})</h1>
  ${figures}
  </body></html>`

  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'load' })
  await page.waitForTimeout(500)
  await page.pdf({ path: path.join(OUT, `phase2-${lang}.pdf`), format: 'A4', printBackground: true })
  console.log(`✓ phase2-${lang}.pdf (${all.length} screenshots)`)
  await page.close()
}

await browser.close()
console.log('done')
