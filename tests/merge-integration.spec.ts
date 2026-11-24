import { test, expect, type Page } from 'playwright/test'

/**
 * Merge integration pass: lazy KaTeX, MathText, font strategy.
 * Seeded paper-007 (physics, class 6, approved, teacher u-tch-02,
 * Beacon) carries both physics TeX questions
 * (bq-physics-mechanics-mcq-1 / short-1), so it is the deterministic
 * math paper for these tests — no Studio build needed.
 */

async function signInAs(page: Page, index: number, urlPattern: string) {
  await page.goto('/sign-in', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  await page.locator('.auth-demo__account').nth(index).click()
  await page.waitForURL(urlPattern, { timeout: 8000 })
  await page.waitForTimeout(1200)
}

async function switchSession(page: Page, role: string, userId: string, schoolId: string) {
  await page.evaluate(({ role, userId, schoolId }) => {
    const raw = localStorage.getItem('paperbuilder.v1')
    const state = raw ? JSON.parse(raw) : {}
    state.session = { role, userId, schoolId, signedInAt: '2026-11-24T00:00:00.000Z' }
    localStorage.setItem('paperbuilder.v1', JSON.stringify(state))
  }, { role, userId, schoolId })
}

function collectRequests(page: Page) {
  const urls: string[] = []
  page.on('request', (r) => urls.push(r.url()))
  return urls
}

const isKatex = (u: string) => u.includes('/vendor/katex')
const isJameel = (u: string) => u.includes('/fonts/jameel')
const isLocalFont = (u: string) => u.includes('/fonts/')

test.describe('merge integration', () => {
  test('(a) landing, sign-in, admin and school request no KaTeX and no local fonts', async ({ page }) => {
    const urls = collectRequests(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    expect(urls.filter(isKatex)).toHaveLength(0)
    expect(urls.filter(isJameel)).toHaveLength(0)
    expect(urls.filter(isLocalFont)).toHaveLength(0)

    urls.length = 0
    await page.goto('/sign-in', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)
    expect(urls.filter(isKatex)).toHaveLength(0)
    expect(urls.filter(isJameel)).toHaveLength(0)
    expect(urls.filter(isLocalFont)).toHaveLength(0)

    urls.length = 0
    await signInAs(page, 0, '**/admin')
    await page.goto('/admin', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)
    expect(urls.filter(isKatex)).toHaveLength(0)
    expect(urls.filter(isLocalFont)).toHaveLength(0)

    urls.length = 0
    await switchSession(page, 'school-admin', 'u-adm-03', 'sch-beacon')
    await page.goto('/school', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)
    expect(urls.filter(isKatex)).toHaveLength(0)
    expect(urls.filter(isLocalFont)).toHaveLength(0)
  })

  test('(b/c) math paper: KaTeX loads lazily, math renders ltr; Urdu keeps the sheet, answer key renders math', async ({ page }) => {
    const urls = collectRequests(page)
    const katexStatuses: number[] = []
    page.on('response', (r) => {
      if (r.url().includes('/vendor/katex/')) katexStatuses.push(r.status())
    })
    await signInAs(page, 2, '**/teacher')
    await switchSession(page, 'teacher', 'u-tch-02', 'sch-beacon')
    await page.goto('/teacher/papers/paper-007', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Physics — third (Class 6)' })).toBeVisible({ timeout: 8000 })

    // KaTeX was fetched exactly once (js + css) once the math question rendered.
    await expect(page.locator('.katex').first()).toBeVisible({ timeout: 10000 })
    expect(urls.filter((u) => u.includes('/vendor/katex/katex.min.js'))).toHaveLength(1)
    expect(urls.filter((u) => u.includes('/vendor/katex/katex.min.css'))).toHaveLength(1)
    // The KaTeX font files the css references resolve (no 404s).
    const katexFontUrls = urls.filter((u) => u.includes('/vendor/katex/fonts/'))
    expect(katexFontUrls.length).toBeGreaterThan(0)
    expect(katexStatuses.length).toBeGreaterThan(0)
    expect(katexStatuses.every((s) => s < 400)).toBe(true)
    // Math is always dir=ltr, including the raw-TeX spans.
    const mathSpans = page.locator('.math-inline-span, .math-display-block')
    await expect(mathSpans.first()).toHaveAttribute('dir', 'ltr')
    // The Urdu paper font (local Noto Nastaliq) is NOT needed for the
    // English preview.
    expect(urls.filter((u) => u.includes('/fonts/noto-nastaliq'))).toHaveLength(0)

    // (c) Same paper in Urdu: the A4 sheet stays intact (no horizontal
    // overflow, sheet visible) and math still renders.
    await page.getByRole('button', { name: 'Urdu', exact: true }).click()
    await expect(page.locator('.pb-paper--ur')).toBeVisible({ timeout: 5000 })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    await expect(page.locator('.pb-paper--ur .katex').first()).toBeVisible({ timeout: 10000 })
    // The Urdu paper font was requested exactly once.
    expect(urls.filter((u) => u.includes('/fonts/noto-nastaliq'))).toHaveLength(1)
    expect(urls.filter(isJameel)).toHaveLength(0)

    // Answer-key tab renders math too.
    await page.getByRole('tab', { name: 'Answer key' }).click()
    await expect(page.locator('.teacher-list .katex').first()).toBeVisible({ timeout: 10000 })
  })

  test('(d) print waits for KaTeX when the paper has math', async ({ page }) => {
    const events: { type: string; at: number }[] = []
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, 'webdriver', { get: () => false, configurable: true })
      const w = window as unknown as { __printCalls: number[] }
      w.__printCalls = []
      window.print = () => {
        w.__printCalls.push(Date.now())
      }
    })
    page.on('request', (r) => {
      if (r.url().includes('/vendor/katex/katex.min.js')) {
        events.push({ type: 'katex-js', at: Date.now() })
      }
    })
    await signInAs(page, 2, '**/teacher')
    await switchSession(page, 'teacher', 'u-tch-02', 'sch-beacon')
    await page.goto('/teacher/papers', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)
    // The list renders no question text, so KaTeX has not loaded yet.
    expect(events.filter((e) => e.type === 'katex-js')).toHaveLength(0)
    // u-tch-02 has exactly one printable paper (paper-007, approved).
    await page.getByRole('button', { name: 'Print', exact: true }).click()
    await page.waitForFunction(() => (window as unknown as { __printCalls?: number[] }).__printCalls?.length === 1, undefined, { timeout: 10000 })
    // KaTeX was requested, and print was only called after it loaded.
    expect(events.filter((e) => e.type === 'katex-js')).toHaveLength(1)
    const printAt = await page.evaluate(() => (window as unknown as { __printCalls: number[] }).__printCalls[0])
    expect(printAt).toBeGreaterThan(events[0].at)
    await expect(page.locator('.pb-toast')).toBeVisible({ timeout: 5000 })
  })
})
