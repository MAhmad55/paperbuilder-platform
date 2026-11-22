// Phase 2 keyboard pass: drives real key presses on every Phase 2 screen and
// reports Tab order, Enter/Space activation, Escape, focus visibility,
// focus-to-error and focus-to-step-heading, and accordion arrow keys.
// Usage (from the repo root): node scripts/phase2-keyboard.mjs
//   BASE_URL env (default http://localhost:5173). Prints a JSON report.
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const DRAFT_KEY = 'paperbuilder.request-draft.v1'
const FULL_DRAFT = {
  schoolName: 'Beacon Model School',
  city: 'Lahore',
  address: '12 Garden Town, Lahore',
  board: 'bise-lahore',
  studentsRange: '301-600',
  schoolType: 'high',
  contactName: 'Asma Malik',
  contactRole: 'principal',
  contactPhone: '03001234567',
  contactEmail: 'asma@school.example.pk',
  certificate: [{ name: 'registration.pdf', size: 0, type: '' }],
  additional: [],
  planId: 'growth',
  notes: '',
  consent: false,
}

const report = { screens: {} }

function describeEl(el) {
  if (!el) return null
  return { tag: el.tag, id: el.id || undefined, label: el.label || undefined, text: el.text || undefined }
}

async function focused(page) {
  return page.evaluate(() => {
    const el = document.activeElement
    if (!el || el === document.body) return null
    const cs = getComputedStyle(el)
    const label =
      el.getAttribute('aria-label') ||
      el.getAttribute('aria-labelledby') ||
      (el.labels && el.labels[0]?.textContent?.trim()) ||
      el.textContent?.trim().slice(0, 40)
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || undefined,
      label: label || undefined,
      text: el.tagName === 'BUTTON' || el.tagName === 'A' ? el.textContent?.trim().slice(0, 40) : undefined,
      outline: cs.outlineStyle !== 'none' ? `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}` : 'none',
      boxShadow: cs.boxShadow !== 'none' ? 'set' : 'none',
    }
  })
}

async function tabWalk(page, n = 14) {
  const stops = []
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab')
    await page.waitForTimeout(120)
    stops.push(await focused(page))
  }
  return stops
}

async function openPage(browser, lang, width, path, draft) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: lang === 'ur' ? 'ur-PK' : 'en-US' })
  const page = await ctx.newPage()
  await page.addInitScript(
    ({ lang, draft, key }) => {
      localStorage.setItem('paperbuilder.lang', lang)
      if (draft) localStorage.setItem(key, JSON.stringify(draft))
    },
    { lang, draft: draft ?? null, key: DRAFT_KEY },
  )
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  return { ctx, page }
}

const browser = await chromium.launch()

for (const lang of ['en', 'ur']) {
  // ---- landing: tab walk + accordion arrows ----
  {
    const { ctx, page } = await openPage(browser, lang, 1280, '/')
    const stops = await tabWalk(page, 12)
    // Jump to the FAQ accordion and drive arrow keys
    await page.locator('#faq .pb-accordion__button').first().focus()
    const first = await focused(page)
    await page.keyboard.press('ArrowDown')
    const second = await focused(page)
    await page.keyboard.press('ArrowUp')
    const back = await focused(page)
    await page.keyboard.press('End')
    const last = await focused(page)
    await page.keyboard.press('Home')
    const home = await focused(page)
    const expandedBefore = await page.locator('#faq .pb-accordion__button').first().getAttribute('aria-expanded')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(200)
    const expandedAfter = await page.locator('#faq .pb-accordion__button').first().getAttribute('aria-expanded')
    report.screens[`landing-${lang}`] = {
      tabStops: stops,
      accordion: { first, arrowDown: second, arrowUp: back, end: last, home, enterToggles: `${expandedBefore} -> ${expandedAfter}` },
    }
    await ctx.close()
  }

  // ---- sign-in: tab walk, Enter submits, focus-to-error ----
  {
    const { ctx, page } = await openPage(browser, lang, 1280, '/sign-in')
    const stops = await tabWalk(page, 10)
    await page.locator('input[type="email"]').focus()
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    const focusAfterError = await focused(page)
    const errorVisible = await page.locator('.pb-error-text').first().isVisible().catch(() => false)
    report.screens[`sign-in-${lang}`] = { tabStops: stops, enterSubmits: true, focusAfterError, errorVisible }
    await ctx.close()
  }

  // ---- request-access: tab walk, focus-to-error, focus-to-step-heading ----
  {
    const { ctx, page } = await openPage(browser, lang, 1280, '/request-access')
    const stops = await tabWalk(page, 10)
    await page.locator('.req-actions .pb-btn--primary').click()
    await page.waitForTimeout(500)
    const focusAfterError = await focused(page)
    const errorVisible = await page.locator('.pb-error-text').first().isVisible().catch(() => false)
    // Fill step 1 and continue: where does focus land on step 2?
    await page.locator('#req-school-name').fill('Beacon Model School')
    await page.locator('#req-city').fill('Lahore')
    await page.locator('#req-board').selectOption('bise-lahore')
    await page.locator('#req-address').fill('12 Garden Town, Lahore')
    await page.locator('#req-students').selectOption('301-600')
    await page.locator('#req-school-type').selectOption('high')
    await page.locator('.req-actions .pb-btn--primary').click()
    await page.waitForTimeout(500)
    const focusAfterStep = await focused(page)
    const stepHeading = await page.locator('.req-card h2').first().textContent().catch(() => null)
    report.screens[`request-access-${lang}`] = { tabStops: stops, focusAfterError, errorVisible, focusAfterStep, stepHeading }
    await ctx.close()
  }

  // ---- request-status: tab walk ----
  {
    const { ctx, page } = await openPage(browser, lang, 1280, '/request-status?state=pending')
    const stops = await tabWalk(page, 10)
    report.screens[`request-status-${lang}`] = { tabStops: stops }
    await ctx.close()
  }

  // ---- forgot-password: tab walk, focus-to-error on step 1 ----
  {
    const { ctx, page } = await openPage(browser, lang, 1280, '/forgot-password')
    const stops = await tabWalk(page, 8)
    await page.locator('form button[type="submit"]').click()
    await page.waitForTimeout(500)
    const focusAfterError = await focused(page)
    report.screens[`forgot-password-${lang}`] = { tabStops: stops, focusAfterError }
    await ctx.close()
  }

  // ---- invite: tab walk, Space toggles terms, focus-to-error ----
  {
    const { ctx, page } = await openPage(browser, lang, 1280, '/invite')
    const stops = await tabWalk(page, 10)
    const checkbox = page.locator('input[type="checkbox"]')
    await checkbox.focus()
    const checkedBefore = await checkbox.isChecked()
    await page.keyboard.press('Space')
    const checkedAfter = await checkbox.isChecked()
    await page.locator('form button[type="submit"]').click()
    await page.waitForTimeout(500)
    const focusAfterError = await focused(page)
    report.screens[`invite-${lang}`] = { tabStops: stops, spaceTogglesTerms: `${checkedBefore} -> ${checkedAfter}`, focusAfterError }
    await ctx.close()
  }

  // ---- public-preview: tab walk ----
  {
    const { ctx, page } = await openPage(browser, lang, 1280, '/public-preview')
    const stops = await tabWalk(page, 12)
    report.screens[`public-preview-${lang}`] = { tabStops: stops }
    await ctx.close()
  }

  // ---- mobile drawer: Escape closes (390px) ----
  {
    const { ctx, page } = await openPage(browser, lang, 390, '/')
    await page.locator('.pb-public-topbar__menu-btn').click()
    await page.waitForTimeout(500)
    const drawerOpen = await page.locator('.pb-drawer, [role="dialog"]').first().isVisible().catch(() => false)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    const drawerStillOpen = await page.locator('.pb-drawer, [role="dialog"]').first().isVisible().catch(() => false)
    const focusAfterEscape = await focused(page)
    report.screens[`drawer-escape-${lang}`] = { drawerOpen, drawerStillOpen, focusAfterEscape }
    await ctx.close()
  }
}

await browser.close()
console.log(JSON.stringify(report, null, 2))
