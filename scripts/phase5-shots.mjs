// Phase 5 screenshots: every Teacher screen/state at 390 + 768 + 1280 px,
// en + ur, deviceScaleFactor 2, one viewport shot per screen/state.
// Usage (from the repo root): node scripts/phase5-shots.mjs
//   BASE_URL env (default http://localhost:5173)
//   OUT_DIR  env (default ./screenshots/phase5)
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const OUT = path.resolve(process.env.OUT_DIR ?? './screenshots/phase5')
mkdirSync(OUT, { recursive: true })

const WIDTHS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1280, height: 900 },
]

function shotName(screen, state, lang, width) {
  return `phase5-${screen}-${state}-${lang}-${width}.png`
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

/** Sign in as Teacher via the one-click demo account (third = u-tch-01, Usman Rizwan). */
async function signInAsTeacher(page) {
  await page.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  await page.locator('.auth-demo__account').nth(2).click()
  await page.waitForURL('**/teacher', { timeout: 5000 })
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
  { route: '/teacher', screen: 'dashboard', state: 'populated' },
  { route: '/teacher/studio', screen: 'studio', state: 'populated' },
  { route: '/teacher/papers', screen: 'papers', state: 'populated' },
  { route: '/teacher/templates', screen: 'templates', state: 'populated' },
  { route: '/teacher/questions', screen: 'questions', state: 'populated' },
  { route: '/teacher/papers?demo=empty', screen: 'papers', state: 'empty' },
  { route: '/teacher/questions?demo=empty', screen: 'questions', state: 'empty' },
]

const browser = await chromium.launch()

for (const lang of ['en', 'ur']) {
  for (const { width, height } of WIDTHS) {
    for (const { route, screen, state } of SHOTS) {
      const { ctx, page } = await newPage(browser, lang, width, height)
      await signInAsTeacher(page)
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1200)
      await shoot(page, shotName(screen, state, lang, width))
      await ctx.close()
    }
    // Paper detail: open the first paper from My papers (the id depends
    // on the seed, so it is reached by clicking, not by a fixed URL).
    {
      const { ctx, page } = await newPage(browser, lang, width, height)
      await signInAsTeacher(page)
      await page.goto(`${BASE}/teacher/papers`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1200)
      const openName = lang === 'ur' ? 'کھولیں' : 'Open'
      const open = page.getByRole('button', { name: openName }).first()
      if (await open.count()) {
        await open.click()
        await page.waitForTimeout(1200)
        await shoot(page, shotName('detail', 'populated', lang, width))
      } else {
        console.log(`! no paper to open for detail shot (${lang} ${width})`)
      }
      await ctx.close()
    }
  }
}

await browser.close()
console.log('done')
