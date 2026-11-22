import { test, expect, type Page } from 'playwright/test'

/**
 * Urdu script guard — rendered output (fix A5). The Urdu sample paper must
 * contain no Hangul, CJK or other foreign script in its rendered text.
 */
const FOREIGN =
  /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\u0400-\u04FF\u0590-\u05FF\u0900-\u097F\u0E00-\u0E7F]/u

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

test('Urdu sample paper renders no foreign script', async ({ page }) => {
  await setSession(page, 'ur')
  await page.goto('/design-system', { waitUntil: 'domcontentloaded' })
  const paper = page.locator('.pb-paper[lang="ur"]').first()
  await expect(paper).toBeVisible()
  const text = (await paper.innerText()) ?? ''
  expect(text).not.toMatch(FOREIGN)
  // Section B question 3 uses the Urdu word for graph
  expect(text).toContain('گراف')
  expect(text).not.toContain('그래프')
})
