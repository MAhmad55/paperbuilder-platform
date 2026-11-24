// Phase 7 screenshots: EVERY route at 390 + 768 + 1280 px, en + ur,
// deviceScaleFactor 2, one viewport shot per screen/state, plus the
// ?demo=loading|empty|error states at 1280 en for every app screen.
// Usage (from the repo root): node scripts/phase7-shots.mjs
//   BASE_URL env (default http://localhost:5173)
//   OUT_DIR  env (default ./screenshots/phase7)
// One signed-in page per role per (lang, width), each in its OWN browser
// context. Pages in one context share localStorage, and the demo sign-in
// writes the session there — sharing a context across roles made every
// page after the last sign-in render as the last role (the first version
// of this script captured all ?demo states as the teacher's "No
// permission" page). One context per role is the fix; the populated loop
// only looked right before because routes ran in sign-in order.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const OUT = path.resolve(process.env.OUT_DIR ?? './screenshots/phase7')
mkdirSync(OUT, { recursive: true })
// PHASE7_MODE: 'all' (default), 'populated' (skip demo states), 'demo'
// (only the ?demo states at 1280 en — used to re-run them after a fix
// without re-capturing all 240 populated shots).
// ONLY_LANG: 'en' or 'ur' to capture one language only.
const MODE = process.env.PHASE7_MODE ?? 'all'
const ONLY_LANG = process.env.ONLY_LANG ?? null

const WIDTHS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1280, height: 900 },
]

// account index on the one-click demo sign-in: 0 super-admin, 1 school-admin, 2 teacher
const ROUTES = [
  { path: '/', slug: 'landing', role: 'public' },
  { path: '/sign-in', slug: 'sign-in', role: 'public' },
  { path: '/request-access', slug: 'request-access', role: 'public' },
  { path: '/request-status', slug: 'request-status', role: 'public' },
  { path: '/forgot-password', slug: 'forgot-password', role: 'public' },
  { path: '/invite', slug: 'invite', role: 'public' },
  { path: '/legal/terms', slug: 'legal-terms', role: 'public' },
  { path: '/legal/privacy', slug: 'legal-privacy', role: 'public' },
  { path: '/admin', slug: 'admin-dashboard', role: 0 },
  { path: '/admin/schools', slug: 'admin-schools', role: 0 },
  { path: '/admin/schools/sch-beacon', slug: 'admin-school-detail', role: 0 },
  { path: '/admin/approvals', slug: 'admin-approvals', role: 0 },
  { path: '/admin/plans', slug: 'admin-plans', role: 0 },
  { path: '/admin/bank', slug: 'admin-bank', role: 0 },
  { path: '/admin/users', slug: 'admin-users', role: 0 },
  { path: '/admin/announcements', slug: 'admin-announcements', role: 0 },
  { path: '/admin/audit', slug: 'admin-audit', role: 0 },
  { path: '/admin/settings', slug: 'admin-settings', role: 0 },
  { path: '/school', slug: 'school-dashboard', role: 1 },
  { path: '/school/approvals', slug: 'school-approvals', role: 1 },
  { path: '/school/teachers', slug: 'school-teachers', role: 1 },
  { path: '/school/classes', slug: 'school-classes', role: 1 },
  { path: '/school/calendar', slug: 'school-calendar', role: 1 },
  { path: '/school/papers', slug: 'school-papers', role: 1 },
  { path: '/school/templates', slug: 'school-templates', role: 1 },
  { path: '/school/reports', slug: 'school-reports', role: 1 },
  { path: '/school/settings', slug: 'school-settings', role: 1 },
  { path: '/school/plan', slug: 'school-plan', role: 1 },
  { path: '/teacher', slug: 'teacher-dashboard', role: 2 },
  { path: '/teacher/studio', slug: 'teacher-studio', role: 2 },
  { path: '/teacher/papers', slug: 'teacher-papers', role: 2 },
  { path: '/teacher/papers/:id', slug: 'teacher-paper-detail', role: 2, viaOpen: true },
  { path: '/teacher/templates', slug: 'teacher-templates', role: 2 },
  { path: '/teacher/questions', slug: 'teacher-questions', role: 2 },
  { path: '/profile', slug: 'profile', role: 2 },
  { path: '/settings', slug: 'settings', role: 2 },
  { path: '/history', slug: 'history', role: 2 },
  { path: '/notifications', slug: 'notifications', role: 2 },
  { path: '/help', slug: 'help', role: 2 },
  { path: '/system-states', slug: 'system-states', role: 2 },
]

const HOME = ['**/admin', '**/school', '**/teacher']
const DEMO_STATES = ['loading', 'empty', 'error']

function shotName(slug, state, lang, width) {
  return `phase7-${slug}-${state}-${lang}-${width}.png`
}

const browser = await chromium.launch()
let count = 0

for (const lang of ['en', 'ur']) {
  if (ONLY_LANG && lang !== ONLY_LANG) continue
  for (const { width, height } of WIDTHS) {
    const pages = new Map()
    const contexts = []
    async function pageFor(role) {
      if (pages.has(role)) return pages.get(role)
      const ctx = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: 2,
        locale: lang === 'ur' ? 'ur-PK' : 'en-US',
      })
      contexts.push(ctx)
      const page = await ctx.newPage()
      await page.addInitScript(
        ({ l }) => { localStorage.setItem('paperbuilder.lang', l) },
        { l: lang },
      )
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

    async function shoot(page, file) {
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(300)
      await page.screenshot({ path: path.join(OUT, file) })
      count++
      console.log(`✓ ${file}`)
    }

    async function guard(page, route) {
      try {
        await page.locator('h1, .shared').first().waitFor({ state: 'visible', timeout: 5000 })
      } catch {
        console.error(`MISSING ROUTE: ${route.path} (${lang} ${width}px) — no heading appeared (URL now ${page.url()})`)
        process.exit(1)
      }
    }

    if (MODE !== 'demo') {
    for (const route of ROUTES) {
      const page = await pageFor(route.role)
      if (route.viaOpen) {
        await page.goto(`${BASE}/teacher/papers`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(1500)
        const openName = lang === 'ur' ? 'کھولیں' : 'Open'
        const open = page.getByRole('button', { name: openName }).first()
        if (!(await open.count())) {
          console.error(`MISSING: no '${openName}' button on /teacher/papers (${lang} ${width}px) — detail shot skipped`)
          process.exit(1)
        }
        await open.click()
        await page.waitForTimeout(1500)
        await guard(page, route)
        await shoot(page, shotName(route.slug, 'populated', lang, width))
        continue
      }
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded' })
      await guard(page, route)
      await page.waitForTimeout(1200)
      await shoot(page, shotName(route.slug, 'populated', lang, width))
    }
    }

    // Demo states (1280px, English only): every app screen's loading /
    // empty / error state, so a blank or dead-end state is caught on film.
    // Guarded like the populated shots: a wrong-role render (the
    // no-permission system state) fails loudly instead of being captured.
    // Exception: ?demo=loading on a page whose header renders only after
    // its data loads (e.g. the school detail) never shows an h1 — the
    // skeleton IS the state — so loading skips the h1 guard and is only
    // checked for a wrong-role render.
    if (MODE !== 'populated' && lang === 'en' && width === 1280) {
      for (const route of ROUTES.filter((r) => r.role !== 'public' && !r.viaOpen)) {
        const page = await pageFor(route.role)
        for (const demo of DEMO_STATES) {
          await page.goto(`${BASE}${route.path}?demo=${demo}`, { waitUntil: 'domcontentloaded' })
          if (demo !== 'loading') await guard(page, route)
          if (route.slug !== 'system-states' && (await page.locator('.system-state').count()) > 0) {
            console.error(`WRONG PAGE: ${route.path}?demo=${demo} rendered a system state (URL now ${page.url()})`)
            process.exit(1)
          }
          await page.waitForTimeout(1200)
          await shoot(page, shotName(route.slug, demo, lang, width))
        }
      }
    }

    for (const ctx of contexts) await ctx.close()
  }
}

await browser.close()
console.log(`done — ${count} screenshots`)
