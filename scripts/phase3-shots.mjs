// Phase 3 screenshots: every Super Admin screen/state at 390 + 1280 px, en + ur,
// deviceScaleFactor 2, one viewport shot per screen/state (top of page).
// Usage (from the repo root): node scripts/phase3-shots.mjs
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

function shotName(screen, state, lang, width) {
  return `phase3-${screen}-${state}-${lang}-${width}.png`
}

async function newPage(browser, lang, width, height) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    locale: lang === 'ur' ? 'ur-PK' : 'en-US',
  })
  const page = await ctx.newPage()
  await page.addInitScript(
    ({ lang }) => {
      localStorage.setItem('paperbuilder.lang', lang)
    },
    { lang },
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

/** One screen/state per entry: route + file stem. */
const SHOTS = [
  { route: '/admin', screen: 'dashboard', state: 'populated' },
  { route: '/admin/schools', screen: 'schools', state: 'populated' },
  { route: '/admin/schools?demo=empty', screen: 'schools', state: 'empty' },
  { route: '/admin/schools/sch-beacon', screen: 'school-detail', state: 'populated' },
  { route: '/admin/approvals', screen: 'approvals', state: 'populated' },
  { route: '/admin/plans', screen: 'plans', state: 'populated' },
  { route: '/admin/bank', screen: 'bank', state: 'empty' },
  { route: '/admin/bank?source=connected', screen: 'bank', state: 'connected' },
  { route: '/admin/users', screen: 'users', state: 'populated' },
  { route: '/admin/announcements', screen: 'announcements', state: 'populated' },
  { route: '/admin/audit', screen: 'audit', state: 'populated' },
  { route: '/admin/settings', screen: 'settings', state: 'populated' },
]

const browser = await chromium.launch()

for (const lang of ['en', 'ur']) {
  for (const { width, height } of WIDTHS) {
    for (const { route, screen, state } of SHOTS) {
      const { ctx, page } = await newPage(browser, lang, width, height)
      await signInAsSuperAdmin(page)
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1200)
      await shoot(page, shotName(screen, state, lang, width))
      await ctx.close()
    }
  }
}

await browser.close()
console.log('done')
