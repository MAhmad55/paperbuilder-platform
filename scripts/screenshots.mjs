// Captures showcase screenshots + 100%-zoom paper crops + axe-core checks.
// Usage (from the repo root): node scripts/screenshots.mjs
import { chromium } from 'playwright'
import { mkdirSync, rmSync, rmSync as rmSyncFn } from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const OUT = path.resolve(process.env.OUT_DIR ?? './screenshots')
mkdirSync(OUT, { recursive: true })

// Clean previous captures (only our own filenames)
for (const f of [
  'design-system-en-1280.png', 'design-system-ur-1280.png',
  'design-system-en-390.png', 'design-system-ur-390.png',
  'design-system-en-1280-composite.png', 'design-system-ur-1280-composite.png',
  'design-system-en-390-composite.png', 'design-system-ur-390-composite.png',
  'paper-en-100.png', 'paper-ur-100.png',
]) {
  rmSync(path.join(OUT, f), { force: true })
}

const combos = [
  { lang: 'en', width: 1280, height: 900, file: 'design-system-en-1280.png', comp: 'design-system-en-1280-composite.png' },
  { lang: 'ur', width: 1280, height: 900, file: 'design-system-ur-1280.png', comp: 'design-system-ur-1280-composite.png' },
  { lang: 'en', width: 390, height: 844, file: 'design-system-en-390.png', comp: 'design-system-en-390-composite.png' },
  { lang: 'ur', width: 390, height: 844, file: 'design-system-ur-390.png', comp: 'design-system-ur-390-composite.png' },
]

const axeRoutes = [
  { path: '/sign-in', needsAuth: false },
  { path: '/design-system', needsAuth: true },
  { path: '/foundation-test', needsAuth: true },
  { path: '/teacher', needsAuth: true },
  { path: '/teacher/studio', needsAuth: true },
  { path: '/admin', needsAuth: true }, // wrong-role guard → no-permission
  { path: '/notifications', needsAuth: true },
  { path: '/profile', needsAuth: true },
  { path: '/settings', needsAuth: true },
  { path: '/history', needsAuth: true },
  { path: '/session-expired', needsAuth: true },
  { path: '/does-not-exist', needsAuth: true }, // not-found system state
]

const browser = await chromium.launch()

/* ---------- screenshots + crops (en/ur × 1280/390) ---------- */
for (const { lang, width, height, file, comp, scrolls } of combos) {
  const page = await browser.newPage({ viewport: { width, height }, locale: lang === 'ur' ? 'ur-PK' : 'en-US' })
  await page.addInitScript((l) => localStorage.setItem('paperbuilder.lang', l), lang)
  await page.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  await page.locator('form button[type="submit"]').click().catch(() => {})
  await page.waitForTimeout(1500)
  await page.goto(`${BASE}/design-system`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3000)
  await page.waitForSelector('.ds-group', { timeout: 15000 }).catch(() => console.log('  (ds-group not found)'))

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(OUT, file) })

  // Coverage: capture every viewport-height slice from the page top to the bottom.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(400)
  const docHeight = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight))
  const scrolls = []
  for (let y = 0; y < docHeight; y += height) scrolls.push(Math.min(y, Math.max(0, docHeight - height)))

  const frames = []
  for (const s of scrolls) {
    await page.evaluate((y) => window.scrollTo(0, y), s)
    await page.waitForTimeout(600)
    frames.push(`/tmp/frame-${lang}-${width}-${s}.png`)
    await page.screenshot({ path: frames[frames.length - 1] })
  }
  execFileSync('python3', ['./scripts/stitch-frames.py', ...frames, path.join(OUT, comp)], { stdio: 'inherit' })
  console.log(`✓ ${file} + composite`)
  await page.close()
}

/* ---------- 100%-zoom paper crops ---------- */
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'en-US' })
  await page.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)
  await page.locator('form button[type="submit"]').click()
  await page.waitForTimeout(1800)
  await page.goto(`${BASE}/design-system`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.pb-paper[lang="en"]', { timeout: 15000 })
  await page.waitForTimeout(1500)
  // Hide app chrome so the crop shows the pure paper at 1x
  await page.addStyleTag({ content: '.app-rail, .app-topbar { display: none !important; } .app-body { margin-left: 0 !important; }' })
  await page.waitForTimeout(400)
  for (const mode of ['en', 'ur']) {
    const el = page.locator(`.pb-paper[lang="${mode}"]`).first()
    await el.scrollIntoViewIfNeeded()
    await page.waitForTimeout(400)
    await el.screenshot({ path: path.join(OUT, `paper-${mode}-100.png`), scale: 'css' })
    const box = await el.boundingBox()
    if (box) console.log(`✓ paper-${mode}-100.png (${Math.round(box.width)}x${Math.round(box.height)} @100%)`)
  }
  await page.close()
}

/* ---------- axe-core violations for every route × both languages ---------- */
const results = []
for (const lang of ['en', 'ur']) {
  for (const { path: route, needsAuth } of axeRoutes) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: lang === 'ur' ? 'ur-PK' : 'en-US' })
    await page.addInitScript((l) => localStorage.setItem('paperbuilder.lang', l), lang)
    await page.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(900)
    if (needsAuth) {
      await page.locator('form button[type="submit"]').click().catch(() => {})
      await page.waitForTimeout(1400)
    }
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
    const violations = await page.evaluate(async () => {
      const r = await window.axe.run(document.body, {
        runOnly: { type: 'tag', values: ['wcag22aa', 'wcag21aa'] },
      })
      return r.violations.filter(v => ['critical', 'serious'].includes(v.impact)).map(v => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.length,
        summary: v.helpUrl ? v.description : v.description,
      }))
    })
    results.push({ lang, route, violations })
    const total = violations.length
    console.log(`${lang.toUpperCase()} ${route.padEnd(28)} ${total === 0 ? 'clean' : total + ' serious/critical'}`)
    if (total > 0) {
      for (const v of violations) console.log(`   - ${v.id} [${v.impact}] (${v.nodes} nodes)`)
    }
    await page.close()
  }
}
const bad = results.filter(r => r.violations.length > 0)
if (bad.length > 0) {
  console.error(`\n❌ axe-core: ${bad.length} route(s) × lang with serious/critical violations`)
  process.exit(1)
}
console.log('\n✓ axe-core: all routes clean (serious/critical) in both languages')

await browser.close()
console.log('done')
