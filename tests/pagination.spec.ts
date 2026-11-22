import { test, expect, type Page } from 'playwright/test'

/**
 * Pagination below 480px (blueprint fix A4) — compact form "‹ 3 / 7 ›",
 * one row, no wrapping. In RTL the "previous" arrow points right and the
 * "next" arrow points left (via the .flip-rtl mirror).
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
  test.describe(`pagination compact — ${lang}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await setSession(page, lang)
      await page.goto('/design-system', { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('.pb-pagination', { timeout: 15000 })
      await page.waitForTimeout(1500)
    })

    test('shows "3 / 7" compact, one row, numbered buttons hidden', async ({ page }) => {
      const nav = page.locator('.pb-pagination').first()
      await expect(nav).toBeVisible()
      // move to page 3 via the next arrow (twice)
      const next = nav.locator('.pb-pagination__btn--next')
      await next.click()
      await next.click()
      const compact = nav.locator('.pb-pagination__compact')
      await expect(compact).toBeVisible()
      await expect(compact).toHaveText('3 / 7')
      // numbered page buttons are hidden below 480px
      const numbered = nav.locator('.pb-pagination__btn:not(.pb-pagination__btn--prev):not(.pb-pagination__btn--next)')
      await expect(numbered.first()).toBeHidden()
      // single row: nav height is one button tall
      const box = await nav.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.height).toBeLessThanOrEqual(42)
    })

    test('arrows point the right way for the direction', async ({ page }) => {
      const nav = page.locator('.pb-pagination').first()
      const prevSvg = nav.locator('.pb-pagination__btn--prev svg')
      const nextSvg = nav.locator('.pb-pagination__btn--next svg')
      const prevTransform = await prevSvg.evaluate(el => getComputedStyle(el).transform)
      const nextTransform = await nextSvg.evaluate(el => getComputedStyle(el).transform)
      if (lang === 'ur') {
        // .flip-rtl mirrors both chevrons: previous points right, next points left
        expect(prevTransform).toBe('matrix(-1, 0, 0, 1, 0, 0)')
        expect(nextTransform).toBe('matrix(-1, 0, 0, 1, 0, 0)')
      } else {
        expect(prevTransform).toBe('none')
        expect(nextTransform).toBe('none')
      }
    })
  })
}
