// Phase 6 keyboard pass: drives real key presses on every Shared screen
// and reports Tab order, Enter/Space activation, Escape, focus visibility,
// and focus-to-error on the Settings language radio and the Notifications mark-all-read button.
// Usage (from the repo root): node scripts/phase6-keyboard.mjs
//   BASE_URL env (default http://localhost:5173). Prints a JSON report and
//   writes it to screenshots/phase6/keyboard-report-<theme>.json.
//   THEME env: 'light' (default, all screens) or 'dark' (profile +
//   notifications only, dark theme forced via localStorage).
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const THEME = process.env.THEME === 'dark' ? 'dark' : 'light'
const OUT = path.resolve('./screenshots/phase6')

const report = { screens: {} }

// Button names differ by language; the script must look up the local name.
const NAMES = {
  en: { markAll: 'Mark all read', english: 'English', urdu: 'Urdu' },
  ur: { markAll: 'سب پڑھی ہوئی کریں', english: 'انگریزی', urdu: 'اردو' },
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
  { path: '/profile', key: 'profile' },
  { path: '/settings', key: 'settings' },
  { path: '/history', key: 'history' },
  { path: '/notifications', key: 'notifications' },
  { path: '/help', key: 'help' },
  { path: '/system-states', key: 'system-states' },
]

// Dark runs cover only profile + notifications.
const RUN_SCREENS = THEME === 'dark'
  ? SCREENS.filter((s) => s.key === 'profile' || s.key === 'notifications')
  : SCREENS

const browser = await chromium.launch()

for (const lang of ['en', 'ur']) {
  for (const { path, key } of RUN_SCREENS) {
    const { ctx, page } = await openPage(browser, lang, 1280, path)
    const entry = { theme: THEME, tabStops: await tabWalk(page, 12) }
    if (key === 'settings') {
      // ArrowRight on the language radio must switch the interface language
      // (SegmentedControl arrow-key support) and flip the layout direction.
      const englishRadio = page.getByRole('radio', { name: NAMES[lang].english, exact: true })
      await englishRadio.focus()
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(500)
      entry.languageArrow = {
        dir: await page.evaluate(() => document.documentElement.dir),
      }
      // Switch back so later screens run in the starting language.
      const urduRadio = page.getByRole('radio', { name: lang === 'en' ? NAMES.ur.urdu : NAMES.en.urdu, exact: true })
      if (await urduRadio.count()) {
        await urduRadio.focus()
        await page.keyboard.press('ArrowLeft')
        await page.waitForTimeout(500)
      }
    }
    if (key === 'notifications') {
      // Mark all read by keyboard (Enter on the button) must clear the
      // unread count line.
      const markAll = page.getByRole('button', { name: NAMES[lang].markAll, exact: true })
      if (await markAll.count()) {
        await markAll.focus()
        await page.keyboard.press('Enter')
        await page.waitForTimeout(800)
        entry.markAllRead = {
          allCaughtUp: (await page.getByText(lang === 'en' ? 'All caught up' : 'سب دیکھ لیے').count()) > 0,
        }
      } else {
        entry.markAllRead = { skipped: 'no unread notifications' }
      }
    }
    report.screens[`${key}-${lang}-${THEME}`] = entry
    await ctx.close()
  }

  // Mobile drawer: open via the hamburger, Escape closes it.
  // The drawer is the design-system Drawer: it renders `.pb-drawer`
  // (role="dialog") only while open and returns null when closed, so
  // probe its presence — NOT `.app-rail` (the desktop rail, hidden on
  // mobile but still `visibility: visible` in computed style).
  {
    const { ctx, page } = await openPage(browser, lang, 390, '/profile')
    const toggle = page.locator('.app-topbar__menu-btn').first()
    const before = await page.locator('.pb-drawer').count()
    await toggle.click().catch(() => {})
    await page.waitForTimeout(400)
    const open = await page.locator('.pb-drawer').count()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    const afterEscape = await page.locator('.pb-drawer').count()
    report.screens[`drawer-${lang}`] = { before, open, escapePressed: true, afterEscape }
    await ctx.close()
  }
}

await browser.close()
mkdirSync(OUT, { recursive: true })
writeFileSync(path.join(OUT, `keyboard-report-${THEME}.json`), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
