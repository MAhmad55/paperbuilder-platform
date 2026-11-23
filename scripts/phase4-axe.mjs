// Axe-core serious/critical check for every Phase 4 School Admin route × both languages.
// Usage (from the repo root): node scripts/phase4-axe.mjs
//   BASE_URL env (default http://localhost:5173). Exits 1 on any violation.
//   THEME env: 'light' (default, all 10 routes) or 'dark' (dashboard +
//   approvals only — the prototype-adoption screens — with the dark theme
//   forced via localStorage before load).
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const THEME = process.env.THEME === 'dark' ? 'dark' : 'light'

const AXE_ROUTES = [
  '/school',
  '/school/approvals',
  '/school/teachers',
  '/school/classes',
  '/school/calendar',
  '/school/papers',
  '/school/templates',
  '/school/reports',
  '/school/settings',
  '/school/plan',
]

const ROUTES = THEME === 'dark' ? ['/school', '/school/approvals'] : AXE_ROUTES

const browser = await chromium.launch()
const results = []

for (const lang of ['en', 'ur']) {
  for (const route of ROUTES) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: lang === 'ur' ? 'ur-PK' : 'en-US' })
    await page.addInitScript(({ l, theme }) => {
      localStorage.setItem('paperbuilder.lang', l)
      localStorage.setItem('paperbuilder.theme', theme)
      localStorage.setItem('paperbuilder.v1', JSON.stringify({
        papers: [],
        audit: [],
        notifications: [],
        schoolOverrides: {},
        session: { role: 'school-admin', userId: 'u-adm-03', schoolId: 'sch-beacon', signedInAt: '2026-11-22T00:00:00.000Z' },
      }))
    }, { l: lang, theme: THEME })
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1800)
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
    await page.close()
  }
}

const bad = results.filter((r) => r.violations.length > 0)
const total = results.reduce((n, r) => n + r.violations.length, 0)
if (bad.length > 0) {
  console.error(`\naxe-core: ${total} serious/critical violation(s) across ${bad.length} route(s) x lang`)
  process.exit(1)
}
console.log(`\n✓ axe-core: ${THEME} theme — all checked Phase 4 routes clean (serious/critical) in both languages`)
await browser.close()
