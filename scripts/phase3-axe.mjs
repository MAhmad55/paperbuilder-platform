// Axe-core serious/critical check for every Phase 3 Super Admin route × both languages.
// Usage (from the repo root): node scripts/phase3-axe.mjs
//   BASE_URL env (default http://localhost:5173). Exits 1 on any violation.
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'

const AXE_ROUTES = [
  '/admin',
  '/admin/schools',
  '/admin/schools/sch-beacon',
  '/admin/approvals',
  '/admin/plans',
  '/admin/bank',
  '/admin/users',
  '/admin/announcements',
  '/admin/audit',
  '/admin/settings',
]

const browser = await chromium.launch()
const results = []

for (const lang of ['en', 'ur']) {
  for (const route of AXE_ROUTES) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: lang === 'ur' ? 'ur-PK' : 'en-US' })
    await page.addInitScript((l) => {
      localStorage.setItem('paperbuilder.lang', l)
      localStorage.setItem('paperbuilder.v1', JSON.stringify({
        papers: [],
        audit: [],
        notifications: [],
        schoolOverrides: {},
        session: { role: 'super-admin', userId: 'u-adm-01', schoolId: null, signedInAt: '2026-11-22T00:00:00.000Z' },
      }))
    }, lang)
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
console.log('\n✓ axe-core: all Phase 3 routes clean (serious/critical) in both languages')
await browser.close()
