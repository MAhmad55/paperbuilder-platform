// Phase 7 axe sweep: EVERY route x both languages x light + dark.
// Blueprint section 12: WCAG 2.2 AA, serious/critical must be zero.
// Usage (from the repo root): node scripts/phase7-axe.mjs
//   BASE_URL env (default http://localhost:5173). Exits 1 on any violation.
//   THEME env: 'light' (default) or 'dark' (theme forced via localStorage).
//   ROUTES env: comma-separated route paths to check only (default: all).
//
// Route guard (Phase 6 lesson): after navigation the script waits for a
// page heading and fails loudly if the route rendered the 404/no-permission
// system state instead — a missing route must never be axed clean as the
// 404 page. Detail routes are reached the way a user reaches them:
// /admin/schools/:id by direct id (sch-beacon), /teacher/papers/:id by
// clicking Open on My papers (language-aware name).
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const THEME = process.env.THEME === 'dark' ? 'dark' : 'light'

// account index on the one-click demo sign-in: 0 super-admin, 1 school-admin, 2 teacher
const ROUTES = [
  // Public — no sign-in. Marker: the page heading.
  { path: '/', role: 'public', marker: 'h1' },
  { path: '/sign-in', role: 'public', marker: 'h1' },
  { path: '/request-access', role: 'public', marker: 'h1' },
  { path: '/request-status', role: 'public', marker: 'h1' },
  { path: '/forgot-password', role: 'public', marker: 'h1' },
  { path: '/invite', role: 'public', marker: 'h1' },
  { path: '/legal/terms', role: 'public', marker: 'h1' },
  { path: '/legal/privacy', role: 'public', marker: 'h1' },
  // Super Admin
  { path: '/admin', role: 0, marker: 'h1' },
  { path: '/admin/schools', role: 0, marker: 'h1' },
  { path: '/admin/schools/sch-beacon', role: 0, marker: 'h1' },
  { path: '/admin/approvals', role: 0, marker: 'h1' },
  { path: '/admin/plans', role: 0, marker: 'h1' },
  { path: '/admin/bank', role: 0, marker: 'h1' },
  { path: '/admin/users', role: 0, marker: 'h1' },
  { path: '/admin/announcements', role: 0, marker: 'h1' },
  { path: '/admin/audit', role: 0, marker: 'h1' },
  { path: '/admin/settings', role: 0, marker: 'h1' },
  // School Admin
  { path: '/school', role: 1, marker: 'h1' },
  { path: '/school/approvals', role: 1, marker: 'h1' },
  { path: '/school/teachers', role: 1, marker: 'h1' },
  { path: '/school/classes', role: 1, marker: 'h1' },
  { path: '/school/calendar', role: 1, marker: 'h1' },
  { path: '/school/papers', role: 1, marker: 'h1' },
  { path: '/school/templates', role: 1, marker: 'h1' },
  { path: '/school/reports', role: 1, marker: 'h1' },
  { path: '/school/settings', role: 1, marker: 'h1' },
  { path: '/school/plan', role: 1, marker: 'h1' },
  // Teacher
  { path: '/teacher', role: 2, marker: 'h1' },
  { path: '/teacher/studio', role: 2, marker: 'h1' },
  { path: '/teacher/papers', role: 2, marker: 'h1' },
  { path: '/teacher/papers/:id', role: 2, marker: 'h1', viaOpen: true },
  { path: '/teacher/templates', role: 2, marker: 'h1' },
  { path: '/teacher/questions', role: 2, marker: 'h1' },
  // Shared (role-neutral; teacher account)
  { path: '/profile', role: 2, marker: 'h1' },
  { path: '/settings', role: 2, marker: 'h1' },
  { path: '/history', role: 2, marker: 'h1' },
  { path: '/notifications', role: 2, marker: 'h1' },
  { path: '/help', role: 2, marker: 'h1' },
  { path: '/system-states', role: 2, marker: '.shared' },
]

const HOME = ['**/admin', '**/school', '**/teacher']
const ONLY = process.env.ROUTES ? process.env.ROUTES.split(',').map((s) => s.trim()) : null
const CHECK = ONLY ? ROUTES.filter((r) => ONLY.includes(r.path)) : ROUTES
if (ONLY && CHECK.length !== ONLY.length) {
  console.error(`Unknown route(s) in ROUTES: ${ONLY.filter((p) => !ROUTES.some((r) => r.path === p)).join(', ')}`)
  process.exit(1)
}

const browser = await chromium.launch()
const results = []

async function signInAs(page, lang, account) {
  await page.addInitScript(({ l, theme }) => {
    localStorage.setItem('paperbuilder.lang', l)
    localStorage.setItem('paperbuilder.theme', theme)
  }, { l: lang, theme: THEME })
  await page.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  await page.locator('.auth-demo__account').nth(account).click()
  await page.waitForURL(HOME[account], { timeout: 5000 })
  await page.waitForTimeout(1200)
}

async function guardRoute(page, route) {
  // A missing/broken route renders the system state (.system-state, no h1
  // from a real page) — fail loudly instead of axing the wrong page clean.
  try {
    await page.locator(route.marker).first().waitFor({ state: 'visible', timeout: 5000 })
  } catch {
    console.error(`MISSING ROUTE: ${route.path} — marker '${route.marker}' never appeared (URL now ${page.url()})`)
    process.exit(1)
  }
  const isSystemState = await page.locator('.system-state').count()
  if (isSystemState > 0 && route.path !== '/system-states') {
    console.error(`WRONG PAGE: ${route.path} rendered a system state instead of the page (URL now ${page.url()})`)
    process.exit(1)
  }
}

async function runAxe(page, lang, route) {
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
  const violations = await page.evaluate(async () => {
    const r = await window.axe.run(document.body, {
      runOnly: { type: 'tag', values: ['wcag22aa', 'wcag21aa'] },
    })
    return r.violations
      .filter((v) => ['critical', 'serious'].includes(v.impact))
      .map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, description: v.description }))
  })
  results.push({ lang, route, violations })
  console.log(`${lang.toUpperCase()} ${route.padEnd(32)} ${violations.length === 0 ? 'clean' : violations.length + ' serious/critical'}`)
  for (const v of violations) console.log(`   - ${v.id} [${v.impact}] (${v.nodes} nodes): ${v.description}`)
}

for (const lang of ['en', 'ur']) {
  // One signed-in page per role, reused across that role's routes.
  const pages = new Map()
  async function pageFor(role) {
    if (role === 'public') {
      if (!pages.has('public')) {
        const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: lang === 'ur' ? 'ur-PK' : 'en-US' })
        await page.addInitScript(({ l, theme }) => {
          localStorage.setItem('paperbuilder.lang', l)
          localStorage.setItem('paperbuilder.theme', theme)
        }, { l: lang, theme: THEME })
        pages.set('public', page)
      }
      return pages.get('public')
    }
    if (!pages.has(role)) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: lang === 'ur' ? 'ur-PK' : 'en-US' })
      await signInAs(page, lang, role)
      pages.set(role, page)
    }
    return pages.get(role)
  }

  for (const route of CHECK) {
    const page = await pageFor(route.role)
    if (route.viaOpen) {
      // Teacher paper detail: open the first paper from My papers.
      await page.goto(`${BASE}/teacher/papers`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
      const openName = lang === 'ur' ? 'کھولیں' : 'Open'
      const open = page.getByRole('button', { name: openName }).first()
      if (!(await open.count())) {
        console.error(`MISSING: no '${openName}' button on /teacher/papers (${lang}) — detail route not axe-checked`)
        process.exit(1)
      }
      await open.click()
      await page.waitForTimeout(1500)
      await guardRoute(page, route)
      await page.waitForTimeout(1200)
      await runAxe(page, lang, route.path)
      continue
    }
    await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded' })
    await guardRoute(page, route)
    await page.waitForTimeout(1500)
    await runAxe(page, lang, route.path)
  }
  for (const page of pages.values()) await page.close()
}

const bad = results.filter((r) => r.violations.length > 0)
const total = results.reduce((n, r) => n + r.violations.length, 0)
if (bad.length > 0) {
  console.error(`\naxe-core: ${total} serious/critical violation(s) across ${bad.length} route(s) x lang`)
  process.exit(1)
}
console.log(`\n✓ axe-core: ${THEME} theme — all ${results.length} route x lang checks clean (serious/critical)`)
await browser.close()
