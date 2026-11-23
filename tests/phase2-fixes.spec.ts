import { test, expect, type Page } from 'playwright/test'

/**
 * Phase 2 fixes (Part A) — regression tests:
 *   A1 — no paper text overlaps the footer rule (ur + en); Urdu question
 *        line-height >= 2.0 (blueprint 7.3). Checked on the landing hero
 *        paper, the sheet the owner flagged.
 *   A2 — hero H1 has no orphan word on the last line (390/768/1280, ur + en).
 *   A4 — dev-only state switcher hidden unless ?dev=1.
 */

async function setLang(page: Page, lang: 'en' | 'ur') {
  await page.addInitScript(
    ({ lang }) => {
      localStorage.setItem('paperbuilder.lang', lang)
    },
    { lang },
  )
}

for (const lang of ['en', 'ur'] as const) {
  test.describe(`phase 2 fixes — ${lang}`, () => {
    test('A1: no paper text overlaps the footer rule', async ({ page }) => {
      await setLang(page, lang)
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await page.locator('.landing-hero__paper .pb-paper').waitFor({ state: 'visible' })
      await page.waitForTimeout(1200)

      const result = await page.evaluate(() => {
        const paper = document.querySelector('.landing-hero__paper .pb-paper') as HTMLElement
        const footer = paper.querySelector('.pb-paper__footer') as HTMLElement
        const footerTop = footer.getBoundingClientRect().top
        const paperBottom = paper.getBoundingClientRect().bottom
        const offenders: Array<{ text: string; bottom: number }> = []
        // Every text-bearing leaf above the footer must end above its rule.
        const scope = paper.querySelector('.pb-paper__body') as HTMLElement
        const walker = document.createTreeWalker(scope, NodeFilter.SHOW_ELEMENT)
        let node: Element | null = walker.nextNode() as Element | null
        while (node) {
          const el = node as HTMLElement
          const text = (el.textContent ?? '').trim()
          const isLeaf = el.children.length === 0
          if (isLeaf && text) {
            const rect = el.getBoundingClientRect()
            if (rect.bottom > footerTop + 1 || rect.bottom > paperBottom + 1) {
              offenders.push({ text: text.slice(0, 40), bottom: Math.round(rect.bottom) })
            }
          }
          node = walker.nextNode() as Element | null
        }
        return { footerTop: Math.round(footerTop), paperBottom: Math.round(paperBottom), offenders }
      })

      expect(result.offenders, `text crossing the footer rule: ${JSON.stringify(result.offenders)}`).toEqual([])
    })

    test('A1: Urdu paper questions use line-height >= 2.0', async ({ page }) => {
      test.skip(lang !== 'ur', 'Urdu-only rule (blueprint 7.3)')
      await setLang(page, lang)
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await page.locator('.landing-hero__paper .pb-paper').waitFor({ state: 'visible' })
      await page.waitForTimeout(1200)

      const ratio = await page.evaluate(() => {
        const q = document.querySelector('.landing-hero__paper .pb-paper--ur .pb-paper__question') as HTMLElement
        const cs = getComputedStyle(q)
        return parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)
      })
      expect(ratio).toBeGreaterThanOrEqual(2.0)
    })

    for (const width of [390, 768, 1280]) {
      test(`A2: hero H1 has no orphan word at ${width}px`, async ({ page }) => {
        await setLang(page, lang)
        await page.setViewportSize({ width, height: 900 })
        await page.goto('/', { waitUntil: 'domcontentloaded' })
        await page.locator('#landing-hero-title').waitFor({ state: 'visible' })
        await page.waitForTimeout(800)

        const result = await page.evaluate(() => {
          const h1 = document.querySelector('#landing-hero-title') as HTMLElement
          const textNode = h1.firstChild as Text
          const text = textNode.textContent ?? ''
          const range = document.createRange()
          const lines = new Map<number, number>()
          let pos = 0
          for (const word of text.split(/\s+/).filter(Boolean)) {
            const start = text.indexOf(word, pos)
            const end = start + word.length
            range.setStart(textNode, start)
            range.setEnd(textNode, end)
            const top = Math.round(range.getBoundingClientRect().top)
            lines.set(top, (lines.get(top) ?? 0) + 1)
            pos = end
          }
          const tops = [...lines.keys()].sort((a, b) => a - b)
          return { lineCount: tops.length, lastLineWords: lines.get(tops[tops.length - 1]) ?? 0 }
        })

        expect(result.lastLineWords).toBeGreaterThanOrEqual(2)
      })
    }
  })
}

test.describe('phase 2 fixes — dev switcher (A4)', () => {
  test('switcher hidden by default, visible with ?dev=1', async ({ page }) => {
    await setLang(page, 'en')

    await page.goto('/request-status?state=pending', { waitUntil: 'domcontentloaded' })
    await page.locator('.req-status__head').waitFor({ state: 'visible' })
    await expect(page.locator('.req-dev')).toHaveCount(0)

    await page.goto('/request-status?state=pending&dev=1', { waitUntil: 'domcontentloaded' })
    await page.locator('.req-dev').waitFor({ state: 'visible' })
    await expect(page.locator('.req-dev button')).toHaveCount(4)

    // ?state= still renders the state without the switcher.
    await page.goto('/request-status?state=info', { waitUntil: 'domcontentloaded' })
    await page.locator('.req-status__head').waitFor({ state: 'visible' })
    await expect(page.locator('.req-dev')).toHaveCount(0)
    await expect(page.locator('.req-missing')).toBeVisible()
  })
})
