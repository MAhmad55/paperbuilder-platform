import { test, expect, type Page } from 'playwright/test'

/**
 * Bidi checks (blueprint §8) — numeric/Latin runs must stay in the right
 * order inside Urdu (RTL) sentences:
 *   - "1 KB" must stay "1 KB"
 *   - "3 chapters are still pending" — number inside the sentence
 *   - "4 chapters · 41 questions" — correct grouping
 *   - dates as "15 Dec 2026" (day, month name, year) in both languages
 */
async function setSession(page: Page, lang: 'en' | 'ur') {
  await page.addInitScript(
    ({ lang }) => {
      localStorage.setItem('paperbuilder.lang', lang)
      localStorage.setItem('paperbuilder.v1', JSON.stringify({
        papers: [], audit: [], notifications: [], schoolOverrides: {},
        session: { role: 'teacher', userId: 'u-tch-01', schoolId: 'sch-beacon', signedInAt: '2026-11-22T00:00:00.000Z' },
      }))
    },
    { lang },
  )
}

for (const lang of ['en', 'ur'] as const) {
  test.describe(`bidi — ${lang}`, () => {
    test.beforeEach(async ({ page }) => {
      await setSession(page, lang)
      await page.goto('/design-system', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2500)
    })

    test('"1 KB" stays "1 KB" (FileUpload)', async ({ page }) => {
      // FileUpload demo error state shows the file list with the size
      const el = page.locator('.pb-file-list__item .pb-muted', { hasText: 'KB' }).first()
      await expect(el).toBeVisible()
      await expect(el).toHaveText(/^1 KB$/)
      // and it is wrapped in a dir="auto" bdi
      await expect(el.locator('bdi[dir="auto"]')).toHaveCount(1)
    })

    test('"3 chapters are still pending" is inside the Urdu sentence', async ({ page }) => {
      const expected = lang === 'en' ? '3 chapters are still pending' : '3 باب ابھی باقی ہیں'
      const banner = page.locator('.pb-banner--warning .pb-banner__message', { hasText: expected.startsWith('3') ? expected.slice(0, 3) : '3' }).first()
      await expect(page.locator('.pb-banner--warning .pb-banner__message').first()).toHaveText(expected)
    })

    test('"4 chapters · 41 questions" keeps its order', async ({ page }) => {
      const expected = lang === 'en' ? '4 chapters · 41 questions' : '4 باب · 41 سوالات'
      const summary = page.locator('.pb-stepper__summary').filter({ hasText: '41' }).first()
      await expect(summary).toBeVisible()
      await expect(summary).toHaveText(expected)
    })

    test('dates render as "15 Dec 2026" — never numeric', async ({ page }) => {
      const expected = lang === 'en' ? '15 Dec 2026' : '15 دسمبر 2026'
      const dateBtn = page.locator('.pb-date').first()
      await expect(dateBtn).toBeVisible()
      await expect(dateBtn).toHaveText(expected)
    })

    test('Latin runs are wrapped in dir="auto" bidi', async ({ page }) => {
      // at least one bidi-wrapped numeric/Latin run is present (timeline meta)
      const bdi = page.locator('bdi[dir="auto"]').first()
      await expect(bdi).toBeVisible()
      const meta = page.locator('.pb-timeline__meta bdi[dir="auto"]').first()
      await expect(meta).toBeVisible()
      const metaText = (await meta.innerText()).trim()
      expect(metaText).toMatch(/\d{1,2} \S+ \d{4}/) // e.g. "8 Nov 2026" / "8 نومبر 2026"
    })
  })
}
