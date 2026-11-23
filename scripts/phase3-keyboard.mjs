// Phase 3 keyboard pass: drives real key presses on every Super Admin screen
// and reports Tab order, Enter/Space activation, Escape, focus visibility,
// dialog open/close and focus-to-error on the approval dialogs.
// Usage (from the repo root): node scripts/phase3-keyboard.mjs
//   BASE_URL env (default http://localhost:5173). Prints a JSON report.
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'

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

/** Sign in as Super Admin via the one-click demo account (first = u-adm-01). */
async function openPage(browser, lang, width, path) {
  const ctx = await browser.newContext({
    viewport: { width, height: 900 },
    locale: lang === 'ur' ? 'ur-PK' : 'en-US',
  })
  const page = await ctx.newPage()
  await page.addInitScript(
    ({ lang }) => {
      localStorage.setItem('paperbuilder.lang', lang)
    },
    { lang },
  )
  await page.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  await page.locator('.auth-demo__account').first().click()
  await page.waitForURL('**/admin', { timeout: 5000 })
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  return { ctx, page }
}

const SCREENS = [
  { path: '/admin', key: 'dashboard' },
  { path: '/admin/schools', key: 'schools' },
  { path: '/admin/schools/sch-beacon', key: 'school-detail' },
  { path: '/admin/approvals', key: 'approvals' },
  { path: '/admin/plans', key: 'plans' },
  { path: '/admin/bank', key: 'bank' },
  { path: '/admin/users', key: 'users' },
  { path: '/admin/announcements', key: 'announcements' },
  { path: '/admin/audit', key: 'audit' },
  { path: '/admin/settings', key: 'settings' },
]

const browser = await chromium.launch()

for (const lang of ['en', 'ur']) {
  for (const { path, key } of SCREENS) {
    const { ctx, page } = await openPage(browser, lang, 1280, path)
    const entry = { tabStops: await tabWalk(page, 12) }
    // Approvals: keyboard-open the Approve dialog, Escape closes it; then
    // keyboard-open the Reject dialog and confirm empty to check focus
    // lands on the required reason field.
    if (key === 'approvals') {
      const approveBtn = page.locator('.admin-approvals__actions button:not([disabled])').first()
      await approveBtn.focus()
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      const dialogOpen = (await page.locator('[role="dialog"]').count()) > 0
      const dialogFocus = await focused(page)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
      const dialogClosed = (await page.locator('[role="dialog"]').count()) === 0
      entry.approveDialog = { dialogOpen, dialogFocus, escapeCloses: dialogClosed }
      const rejectBtn = page.locator('.admin-approvals__actions button:not([disabled])').nth(2)
      await rejectBtn.focus()
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      const rejectOpen = (await page.locator('[role="dialog"]').count()) > 0
      const confirmBtn = page.locator('[role="dialog"] button.pb-btn--primary').last()
      await confirmBtn.focus()
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      const focusAfterError = await focused(page)
      entry.rejectDialog = {
        rejectOpen,
        focusToReason: focusAfterError?.id === 'reject-reason' ? 'reject-reason' : focusAfterError,
      }
      await page.keyboard.press('Escape')
    }
    report.screens[`${key}-${lang}`] = entry
    await ctx.close()
  }

  // Mobile drawer: open via the hamburger, Escape closes it.
  {
    const { ctx, page } = await openPage(browser, lang, 390, '/admin')
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
