// Phase 7 screen-reader announcement check (the check pending since
// Phase 2). No screen reader is available in this sandbox, so this script
// verifies the mechanism a screen reader consumes: the exact text sitting
// in the live regions after real user actions. If the live region holds
// the right text at the right moment, a screen reader announces it;
// if it is empty or stale, nothing is announced.
// Usage (from the repo root): node scripts/phase7-announcer.mjs
//   BASE_URL env (default http://localhost:5173). Exits 1 on any failure.
// Checks, in both languages:
//   1. Navigation: the route announcer (sr-only, aria-live="polite")
//      holds the new page's h1 text after navigating, and document.title
//      matches it. Sampled across public + all three roles + shared.
//   2. Form errors: submitting sign-in empty renders a role="alert"
//      error with text.
//   3. Toasts: Mark all read on /notifications puts text into the toast
//      viewport (aria-live="polite", role="status").
//   4. Status change: the same Mark all read action clears the TopBar
//      unread badge AND announces via the toast — the status change is
//      not colour-only and not silent.
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const HOME = ['**/admin', '**/school', '**/teacher']

const NAV_ROUTES = [
  { path: '/', role: 'public' },
  { path: '/sign-in', role: 'public' },
  { path: '/admin', role: 0 },
  { path: '/admin/schools', role: 0 },
  { path: '/school', role: 1 },
  { path: '/school/approvals', role: 1 },
  { path: '/teacher', role: 2 },
  { path: '/teacher/studio', role: 2 },
  { path: '/profile', role: 2 },
  { path: '/notifications', role: 2 },
  { path: '/help', role: 2 },
]

const failures = []
function check(name, ok, detail = '') {
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(name)
}

const browser = await chromium.launch()

for (const lang of ['en', 'ur']) {
  // One context per role: pages in a context share localStorage and the
  // demo sign-in writes the session there, so sharing a context across
  // roles would make every page render as the last role signed in.
  const contexts = []
  const pages = new Map()
  async function pageFor(role) {
    if (pages.has(role)) return pages.get(role)
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: lang === 'ur' ? 'ur-PK' : 'en-US' })
    contexts.push(ctx)
    const page = await ctx.newPage()
    await page.addInitScript(({ l }) => { localStorage.setItem('paperbuilder.lang', l) }, { l: lang })
    if (role !== 'public') {
      await page.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(900)
      await page.locator('.auth-demo__account').nth(role).click()
      await page.waitForURL(HOME[role], { timeout: 5000 })
      await page.waitForTimeout(1200)
    }
    pages.set(role, page)
    return page
  }

  // 1. Navigation announcements. Wait for the announcement instead of a
  // fixed sleep: on a cold first load React mounts late and the 600ms
  // announcer timer fires after a fixed wait would have read it.
  for (const route of NAV_ROUTES) {
    const page = await pageFor(route.role)
    await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    const h1 = (await page.locator('h1').first().textContent())?.trim() ?? ''
    let announced = ''
    try {
      await page.waitForFunction(
        (expected) => document.querySelector('[data-testid="route-announcer"]')?.textContent?.trim() === expected,
        h1,
        { timeout: 5000 },
      )
      announced = h1
    } catch {
      announced = (await page.locator('[data-testid="route-announcer"]').textContent())?.trim() ?? ''
    }
    const title = await page.title()
    check(
      `nav ${lang} ${route.path}`,
      h1.length > 0 && announced === h1 && title.startsWith(h1),
      `h1="${h1}" announced="${announced}" title="${title}"`,
    )
  }

  // 2. Form error announcement (public sign-in, empty submit).
  {
    const page = await pageFor('public')
    await page.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)
    const submitName = lang === 'ur' ? 'سائن ان کریں' : 'Sign in'
    // Scoped to the page main: the public top bar also has a "Sign in"
    // button when signed out, so an unscoped lookup is ambiguous.
    const submit = page.locator('#pb-public-main').getByRole('button', { name: submitName, exact: true })
    if (await submit.count()) {
      await submit.click()
      await page.waitForTimeout(800)
      const alerts = page.locator('[role="alert"]')
      const n = await alerts.count()
      const text = n > 0 ? (await alerts.first().textContent())?.trim() ?? '' : ''
      check(`form-error ${lang} sign-in`, n > 0 && text.length > 0, `${n} alert(s), first="${text.slice(0, 60)}"`)
    } else {
      check(`form-error ${lang} sign-in`, false, 'submit button not found')
    }
  }

  // 3 + 4. Toast + status change (notifications, mark all read).
  {
    const page = await pageFor(2)
    await page.goto(`${BASE}/notifications`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    const bellLabel = lang === 'ur' ? 'اطلاعات' : 'Notifications'
    const bell = page.locator(`.app-topbar button[aria-label^="${bellLabel}"]`).first()
    const badgeBefore = (await bell.getAttribute('aria-label')) ?? ''
    const markAllName = lang === 'ur' ? 'سب پڑھی ہوئی کریں' : 'Mark all read'
    const markAll = page.getByRole('button', { name: markAllName, exact: true })
    if (await markAll.count()) {
      await markAll.click()
      await page.waitForTimeout(900)
      const toastText = (await page.locator('.pb-toast-viewport').textContent())?.trim() ?? ''
      check(`toast ${lang} mark-all-read`, toastText.length > 0, `"${toastText.slice(0, 60)}"`)
      const badgeAfter = (await bell.getAttribute('aria-label')) ?? ''
      check(`status-change ${lang} badge cleared`, badgeAfter.includes('(0)'), `bell before="${badgeBefore}" after="${badgeAfter}"`)
    } else {
      check(`toast ${lang} mark-all-read`, false, 'no unread notifications to mark read (seed already read?)')
    }
  }

  for (const ctx of contexts) await ctx.close()
}

await browser.close()
if (failures.length > 0) {
  console.error(`\nannouncer check: ${failures.length} failure(s)`)
  process.exit(1)
}
console.log('\n✓ announcer check: navigation, form errors, toasts and status changes all announce (live-region text verified)')
