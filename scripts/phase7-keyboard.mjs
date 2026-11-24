// Phase 7 keyboard pass: Tab walks on all Shared screens + a spot sample
// of role screens, x 2 languages, light + dark (dark: sample only).
// Usage (from the repo root): node scripts/phase7-keyboard.mjs
//   BASE_URL env (default http://localhost:5173). Prints a JSON report and
//   writes it to screenshots/phase7/keyboard-report-<theme>.json.
//   THEME env: 'light' (default) or 'dark'.
// Drawer probe (Phase 6 lesson): `.pb-drawer` presence 0 -> 1 -> 0, never
// `.app-rail` visibility; hamburger locator is the stable
// `.app-topbar__menu-btn` class (aria-label text differs by language).
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const THEME = process.env.THEME === 'dark' ? 'dark' : 'light'
const OUT = path.resolve('./screenshots/phase7')

const report = { screens: {} }

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

const HOME = ['**/admin', '**/school', '**/teacher']

async function openPage(browser, lang, width, path, account, theme = THEME) {
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
  await page.locator('.auth-demo__account').nth(account).click()
  await page.waitForURL(HOME[account], { timeout: 5000 })
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  return { ctx, page }
}

// Shared screens (all) + a spot sample of role screens.
const SCREENS = [
  { path: '/profile', key: 'profile', account: 2 },
  { path: '/settings', key: 'settings', account: 2 },
  { path: '/history', key: 'history', account: 2 },
  { path: '/notifications', key: 'notifications', account: 2 },
  { path: '/help', key: 'help', account: 2 },
  { path: '/system-states', key: 'system-states', account: 2 },
  { path: '/admin', key: 'admin-dashboard', account: 0 },
  { path: '/admin/schools', key: 'admin-schools', account: 0 },
  { path: '/admin/approvals', key: 'admin-approvals', account: 0 },
  { path: '/school', key: 'school-dashboard', account: 1 },
  { path: '/school/approvals', key: 'school-approvals', account: 1 },
  { path: '/teacher', key: 'teacher-dashboard', account: 2 },
  { path: '/teacher/studio', key: 'teacher-studio', account: 2 },
  { path: '/teacher/papers', key: 'teacher-papers', account: 2 },
]

// Dark runs cover a sample only: profile, notifications, admin dashboard,
// teacher studio.
const RUN_SCREENS = THEME === 'dark'
  ? SCREENS.filter((s) => ['profile', 'notifications', 'admin-dashboard', 'teacher-studio'].includes(s.key))
  : SCREENS

const browser = await chromium.launch()

for (const lang of ['en', 'ur']) {
  for (const { path, key, account } of RUN_SCREENS) {
    const { ctx, page } = await openPage(browser, lang, 1280, path, account)
    const entry = { theme: THEME, tabStops: await tabWalk(page, 12) }
    if (key === 'settings') {
      const englishRadio = page.getByRole('radio', { name: NAMES[lang].english, exact: true })
      await englishRadio.focus()
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(500)
      entry.languageArrow = {
        dir: await page.evaluate(() => document.documentElement.dir),
      }
      const urduRadio = page.getByRole('radio', { name: lang === 'en' ? NAMES.ur.urdu : NAMES.en.urdu, exact: true })
      if (await urduRadio.count()) {
        await urduRadio.focus()
        await page.keyboard.press('ArrowLeft')
        await page.waitForTimeout(500)
      }
    }
    if (key === 'notifications') {
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
  {
    const { ctx, page } = await openPage(browser, lang, 390, '/profile', 2)
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
