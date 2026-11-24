// Axe-core serious/critical check for every Phase 6 Shared screens route × both languages.
// Usage (from the repo root): node scripts/phase6-axe.mjs
//   BASE_URL env (default http://localhost:5173). Exits 1 on any violation.
//   THEME env: 'light' (default, all 6 routes) or 'dark' (profile +
//   notifications only, dark theme forced via localStorage before load).
// Sign-in uses the one-click teacher demo account so screenshots show
// full seed data (no localStorage paper wipe).
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const THEME = process.env.THEME === 'dark' ? 'dark' : 'light'

const AXE_ROUTES = [
  '/profile',
  '/settings',
  '/history',
  '/notifications',
  '/help',
  '/system-states',
]

const ROUTES = THEME === 'dark' ? ['/profile', '/notifications'] : AXE_ROUTES

const browser = await chromium.launch()
const results = []

async function signInAs(page, lang, account, homePattern) {
  await page.addInitScript(({ l, theme }) => {
    localStorage.setItem('paperbuilder.lang', l)
    localStorage.setItem('paperbuilder.theme', theme)
  }, { l: lang, theme: THEME })
  await page.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  await page.locator('.auth-demo__account').nth(account).click()
  await page.waitForURL(homePattern, { timeout: 5000 })
  await page.waitForTimeout(1200)
}

/** Sign in as Teacher via the one-click demo account (third = u-tch-01, Usman Rizwan). */
async function signInAsTeacher(page, lang) {
  await signInAs(page, lang, 2, '**/teacher')
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
  for (const route of ROUTES) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: lang === 'ur' ? 'ur-PK' : 'en-US' })
    await signInAsTeacher(page, lang)
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' })
    // Route guard: a missing/broken route renders the 404 state, not
    // `.shared` — fail loudly instead of axing the wrong page clean.
    await page.locator('.shared').first().waitFor({ state: 'visible', timeout: 5000 })
    await page.waitForTimeout(1800)
    await runAxe(page, lang, route)
    await page.close()
  }
  // Admin History variant: the compact table (teachers get roomy cards).
  if (THEME === 'light') {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: lang === 'ur' ? 'ur-PK' : 'en-US' })
    await signInAs(page, lang, 1, '**/school')
    await page.goto(`${BASE}/history`, { waitUntil: 'domcontentloaded' })
    await page.locator('.shared').first().waitFor({ state: 'visible', timeout: 5000 })
    await page.waitForTimeout(1800)
    await runAxe(page, lang, '/history (school-admin table)')
    await page.close()
  }
}

const bad = results.filter((r) => r.violations.length > 0)
const total = results.reduce((n, r) => n + r.violations.length, 0)
if (bad.length > 0) {
  console.error(`\naxe-core: ${total} serious/critical violation(s) across ${bad.length} route(s) x lang`)
  process.exit(1)
}
console.log(`\n✓ axe-core: ${THEME} theme — all checked Phase 6 routes clean (serious/critical) in both languages`)
await browser.close()
