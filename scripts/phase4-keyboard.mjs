// Phase 4 keyboard pass: drives real key presses on every School Admin screen
// and reports Tab order, Enter/Space activation, Escape, focus visibility,
// and focus-to-error on the approval inline flows (no dialogs any more —
// prototype adoption made Approve / Request information / Reject inline).
// Usage (from the repo root): node scripts/phase4-keyboard.mjs
//   BASE_URL env (default http://localhost:5173). Prints a JSON report.
//   THEME env: 'light' (default, all screens) or 'dark' (dashboard +
//   approvals only, dark theme forced via localStorage).
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const THEME = process.env.THEME === 'dark' ? 'dark' : 'light'

const report = { screens: {} }

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

/** Sign in as School Admin via the one-click demo account (second = u-adm-03, Asma Malik). */
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
  await page.locator('.auth-demo__account').nth(1).click()
  await page.waitForURL('**/school', { timeout: 5000 })
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  return { ctx, page }
}

const SCREENS = [
  { path: '/school', key: 'dashboard' },
  { path: '/school/approvals', key: 'approvals' },
  { path: '/school/teachers', key: 'teachers' },
  { path: '/school/classes', key: 'classes' },
  { path: '/school/calendar', key: 'calendar' },
  { path: '/school/papers', key: 'papers' },
  { path: '/school/templates', key: 'templates' },
  { path: '/school/reports', key: 'reports' },
  { path: '/school/settings', key: 'settings' },
  { path: '/school/plan', key: 'plan' },
]

// Dark runs cover only the two adoption screens (dashboard + approvals).
const RUN_SCREENS = THEME === 'dark'
  ? SCREENS.filter((s) => s.key === 'dashboard' || s.key === 'approvals')
  : SCREENS

const browser = await chromium.launch()

for (const lang of ['en', 'ur']) {
  for (const { path, key } of RUN_SCREENS) {
    const { ctx, page } = await openPage(browser, lang, 1280, path)
    const entry = { theme: THEME, tabStops: await tabWalk(page, 12) }
    // Approvals: inline flows now. Reject with an empty reason must show
    // the error and move focus to the reason field; Request information
    // with nothing chosen must show the error and focus it; Approve acts
    // at once (last, so the earlier flows run against a pending request).
    if (key === 'approvals') {
      const actions = page.locator('.school-panel .school-actions button:not([disabled])')
      const rejectBtn = actions.nth(1)
      await rejectBtn.focus()
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      const rejectFlowOpen = (await page.locator('#school-changes-comment').count()) > 0
      const rejectConfirm = page.locator('.school-flow .pb-btn--primary')
      await rejectConfirm.focus()
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      const focusAfterRejectError = await focused(page)
      entry.rejectInline = {
        rejectFlowOpen,
        focusToReason: focusAfterRejectError?.id === 'school-changes-comment' ? 'school-changes-comment' : focusAfterRejectError,
      }
      const rejectCancel = page.locator('.school-flow .pb-btn--ghost')
      await rejectCancel.focus()
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      const infoBtn = page.locator('.school-panel .school-actions button:not([disabled])').nth(1)
      await infoBtn.focus()
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      const infoFlowOpen = (await page.locator('.school-flow #school-changes-comment').count()) > 0
      const infoConfirm = page.locator('.school-flow .pb-btn--primary')
      await infoConfirm.focus()
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      const focusAfterInfoError = await focused(page)
      entry.infoInline = {
        infoFlowOpen,
        focusToError: focusAfterInfoError?.id === 'school-changes-comment' ? 'school-changes-comment' : focusAfterInfoError,
      }
      const infoCancel = page.locator('.school-flow .pb-btn--ghost')
      await infoCancel.focus()
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      const approveBtn = page.locator('.school-panel .school-actions button:not([disabled])').first()
      await approveBtn.focus()
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
      const toastShown = (await page.locator('.pb-toast').count()) > 0
      entry.approveInline = { toastShown }
    }
    report.screens[`${key}-${lang}-${THEME}`] = entry
    await ctx.close()
  }

  // Mobile drawer: open via the hamburger, Escape closes it.
  {
    const { ctx, page } = await openPage(browser, lang, 390, '/school')
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
console.log(JSON.stringify(report, null, 2))
