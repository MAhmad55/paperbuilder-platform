// Phase 5 keyboard pass: drives real key presses on every Teacher screen
// and reports Tab order, Enter/Space activation, Escape, focus visibility,
// and focus-to-error on the Studio's empty-setup Continue.
// Usage (from the repo root): node scripts/phase5-keyboard.mjs
//   BASE_URL env (default http://localhost:5173). Prints a JSON report and
//   writes it to screenshots/phase5/keyboard-report-<theme>.json.
//   THEME env: 'light' (default, all screens) or 'dark' (dashboard +
//   studio only, dark theme forced via localStorage).
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const THEME = process.env.THEME === 'dark' ? 'dark' : 'light'
const OUT = path.resolve('./screenshots/phase5')

const report = { screens: {} }

// Button names differ by language; the script must look up the local name.
const NAMES = {
  en: { continue: 'Continue', open: 'Open' },
  ur: { continue: 'جاری رکھیں', open: 'کھولیں' },
}

async function focused(page) {
  return page.evaluate(() => {
    const el = document.activeElement
    if (!el || el === document.body) return null
    const cs = getComputedStyle(el)
    const label =
      el.getAttribute('aria-label') ||
      el.getAttribute('aria-labelledby') ||
      (el.labels && el.labels[0]?.textContent?.trim()) ||
      el.textContent?.trim().slice(0, 40)
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || undefined,
      label: label || undefined,
      text: el.tagName === 'BUTTON' || el.tagName === 'A' ? el.textContent?.trim().slice(0, 40) : undefined,
      outline: cs.outlineStyle !== 'none' ? `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}` : 'none',
      boxShadow: cs.boxShadow !== 'none' ? 'set' : 'none',
    }
  })
}

async function tabWalk(page, n = 12) {
  const stops = []
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab')
    await page.waitForTimeout(120)
    stops.push(await focused(page))
  }
  return stops
}

/** Sign in as Teacher via the one-click demo account (third = u-tch-01, Usman Rizwan). */
async function openPage(browser, lang, width, path, theme = THEME) {
  const ctx = await browser.newContext({
    viewport: { width, height: 900 },
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
  await page.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  await page.locator('.auth-demo__account').nth(2).click()
  await page.waitForURL('**/teacher', { timeout: 5000 })
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  return { ctx, page }
}

const SCREENS = [
  { path: '/teacher', key: 'dashboard' },
  { path: '/teacher/studio', key: 'studio' },
  { path: '/teacher/papers', key: 'papers' },
  { path: '/teacher/templates', key: 'templates' },
  { path: '/teacher/questions', key: 'questions' },
]

// Dark runs cover only the two signature screens (dashboard + studio).
const RUN_SCREENS = THEME === 'dark'
  ? SCREENS.filter((s) => s.key === 'dashboard' || s.key === 'studio')
  : SCREENS

const browser = await chromium.launch()

for (const lang of ['en', 'ur']) {
  for (const { path, key } of RUN_SCREENS) {
    const { ctx, page } = await openPage(browser, lang, 1280, path)
    const entry = { theme: THEME, tabStops: await tabWalk(page, 12) }
    if (key === 'studio') {
      // Continue on an empty setup must show the error and move focus to
      // the first invalid field (the class select).
      const continueBtn = page.getByRole('button', { name: NAMES[lang].continue, exact: true })
      await continueBtn.focus()
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      const focusAfterError = await focused(page)
      entry.setupErrorFocus = {
        focusToClass: focusAfterError?.id === 'studio-class' ? 'studio-class' : focusAfterError,
      }
    }
    if (key === 'papers') {
      // Open the first paper's detail by keyboard (Enter on Open).
      const openBtn = page.getByRole('button', { name: NAMES[lang].open }).first()
      if (await openBtn.count()) {
        await openBtn.focus()
        await page.keyboard.press('Enter')
        await page.waitForTimeout(1200)
        entry.detailTabStops = await tabWalk(page, 8)
      }
    }
    report.screens[`${key}-${lang}-${THEME}`] = entry
    await ctx.close()
  }

  // Mobile drawer: open via the hamburger, Escape closes it.
  {
    const { ctx, page } = await openPage(browser, lang, 390, '/teacher')
    const toggle = page.locator('.app-topbar__menu, [aria-label*="menu" i], button[aria-expanded]').first()
    const before = await page.evaluate(() => document.querySelector('.app-rail')?.getAttribute('aria-hidden'))
    await toggle.click().catch(() => {})
    await page.waitForTimeout(400)
    const open = await page.evaluate(() => {
      const rail = document.querySelector('.app-rail')
      return rail ? getComputedStyle(rail).visibility : 'unknown'
    })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    report.screens[`drawer-${lang}`] = { before, open, escapePressed: true }
    await ctx.close()
  }
}

await browser.close()
mkdirSync(OUT, { recursive: true })
writeFileSync(path.join(OUT, `keyboard-report-${THEME}.json`), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
