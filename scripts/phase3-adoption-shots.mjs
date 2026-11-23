// Prototype-adoption screenshots: Dashboard + Approvals (the two screens
// the adoption touched) at 390 + 1280 px, en + ur, light + dark,
// deviceScaleFactor 2. 16 PNGs into screenshots/phase3/.
// Usage (from the repo root): node scripts/phase3-adoption-shots.mjs
//   BASE_URL env (default http://localhost:5173)
//   OUT_DIR  env (default ./screenshots/phase3)
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const OUT = path.resolve(process.env.OUT_DIR ?? './screenshots/phase3')
mkdirSync(OUT, { recursive: true })

const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1280, height: 900 },
]

function shotName(screen, lang, width, theme) {
  return `phase3-${screen}-compact-${lang}-${width}-${theme}.png`
}

async function newPage(browser, lang, width, height, theme) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    locale: lang === 'ur' ? 'ur-PK' : 'en-US',
  })
  const page = await ctx.newPage()
  await page.addInitScript(
    ({ lang, theme }) => {
      localStorage.setItem('paperbuilder.lang', lang)
      localStorage.setItem('paperbuilder.theme', theme)
    },
    { lang, theme },
  )
  return { ctx, page }
}

/** Sign in as Super Admin via the one-click demo account (first = u-adm-01). */
async function signInAsSuperAdmin(page) {
  await page.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  await page.locator('.auth-demo__account').first().click()
  await page.waitForURL('**/admin', { timeout: 5000 })
  await page.waitForTimeout(1200)
}

async function shoot(page, file) {
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(OUT, file) })
  console.log(`✓ ${file}`)
}

const SHOTS = [
  { route: '/admin', screen: 'dashboard' },
  { route: '/admin/approvals', screen: 'approvals' },
]

const browser = await chromium.launch()

for (const theme of ['light', 'dark']) {
  for (const lang of ['en', 'ur']) {
    for (const { width, height } of WIDTHS) {
      for (const { route, screen } of SHOTS) {
        const { ctx, page } = await newPage(browser, lang, width, height, theme)
        await signInAsSuperAdmin(page)
        await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(1200)
        await shoot(page, shotName(screen, lang, width, theme))
        await ctx.close()
      }
    }
  }
}

await browser.close()
console.log('done')
