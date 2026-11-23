// Phase 4 screenshots: every School Admin screen/state at 390 + 1280 px, en + ur,
// deviceScaleFactor 2, one viewport shot per screen/state (top of page).
// Usage (from the repo root): node scripts/phase4-shots.mjs
//   BASE_URL env (default http://localhost:5173)
//   OUT_DIR  env (default ./screenshots/phase4)
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const OUT = path.resolve(process.env.OUT_DIR ?? './screenshots/phase4')
mkdirSync(OUT, { recursive: true })

const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1280, height: 900 },
]

function shotName(screen, state, lang, width) {
  return `phase4-${screen}-${state}-${lang}-${width}.png`
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

/** Sign in as School Admin via the one-click demo account (second = u-adm-03, Asma Malik). */
async function signInAsSchoolAdmin(page) {
  await page.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  await page.locator('.auth-demo__account').nth(1).click()
  await page.waitForURL('**/school', { timeout: 5000 })
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
  { route: '/school', screen: 'dashboard', state: 'populated' },
  { route: '/school/approvals', screen: 'approvals', state: 'populated' },
  { route: '/school/teachers', screen: 'teachers', state: 'populated' },
  { route: '/school/classes', screen: 'classes', state: 'populated' },
  { route: '/school/calendar', screen: 'calendar', state: 'populated' },
  { route: '/school/papers', screen: 'papers', state: 'populated' },
  { route: '/school/templates', screen: 'templates', state: 'populated' },
  { route: '/school/reports', screen: 'reports', state: 'populated' },
  { route: '/school/settings', screen: 'settings', state: 'populated' },
  { route: '/school/plan', screen: 'plan', state: 'populated' },
  { route: '/school/teachers?demo=empty', screen: 'teachers', state: 'empty' },
  { route: '/school/approvals?demo=empty', screen: 'approvals', state: 'empty' },
]

const browser = await chromium.launch()

for (const lang of ['en', 'ur']) {
  for (const { width, height } of WIDTHS) {
    for (const { route, screen, state } of SHOTS) {
      const { ctx, page } = await newPage(browser, lang, width, height)
      await signInAsSchoolAdmin(page)
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1200)
      await shoot(page, shotName(screen, state, lang, width))
      await ctx.close()
    }
  }
}

await browser.close()
console.log('done')
