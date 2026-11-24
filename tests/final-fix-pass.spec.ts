import { test, expect, type Page } from 'playwright/test'

/**
 * Final fix pass — Task 4 (Studio print honesty) + Task 5 (legal text
 * wiring). One spec, one test per task.
 *
 * Task 4: window.print is stubbed (it would block the run) and
 * navigator.webdriver is masked so shouldOpenPrintDialog() lets the print
 * path run. The stub records document.title at print time and fires
 * afterprint, like a real browser dialog closing.
 * Task 5: the admin saves custom Terms text in /admin/settings, then the
 * public /legal/terms page must show it instead of the static copy.
 */

const CUSTOM_TERMS =
  'Terms rewritten for the final fix pass: every school keeps its own papers.'

async function signInAs(page: Page, index: number, urlPattern: string) {
  await page.goto('/sign-in', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  await page.locator('.auth-demo__account').nth(index).click()
  await page.waitForURL(urlPattern, { timeout: 8000 })
  await page.waitForTimeout(1200)
}

async function switchSession(page: Page, role: string, userId: string, schoolId: string | null) {
  await page.evaluate(({ role, userId, schoolId }) => {
    const raw = localStorage.getItem('paperbuilder.v1')
    const state = raw ? JSON.parse(raw) : {}
    state.session = { role, userId, schoolId, signedInAt: '2026-11-24T00:00:00.000Z' }
    localStorage.setItem('paperbuilder.v1', JSON.stringify(state))
  }, { role, userId, schoolId })
}

async function setSession(page: Page, role: string, userId: string, schoolId: string | null) {
  // Seed only once: re-seeding on every navigation would wipe state the
  // test itself saved (e.g. the custom legal text in /admin/settings).
  await page.addInitScript(
    ({ role, userId, schoolId }) => {
      localStorage.setItem('paperbuilder.lang', 'en')
      if (localStorage.getItem('paperbuilder.v1')) return
      localStorage.setItem('paperbuilder.v1', JSON.stringify({
        papers: [],
        audit: [],
        notifications: [],
        schoolOverrides: {},
        session: { role, userId, schoolId, signedInAt: '2026-11-22T00:00:00.000Z' },
      }))
    },
    { role, userId, schoolId },
  )
}

test('print sets a meaningful document title (paper, not PaperBuilder)', async ({ page }) => {
  await page.addInitScript(() => {
    // Let the print path run (it is skipped under automation) and stub the
    // dialog: record the title at print time, then fire afterprint.
    Object.defineProperty(navigator, 'webdriver', { get: () => false, configurable: true })
    const w = window as unknown as { __printTitles: string[] }
    w.__printTitles = []
    window.print = () => {
      w.__printTitles.push(document.title)
      window.dispatchEvent(new Event('afterprint'))
    }
  })

  await signInAs(page, 2, '**/teacher')

  // --- Studio: build a paper end to end (same flow as teacher-flow.spec) ---
  await page.goto('/teacher/studio', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Paper Studio' })).toBeVisible()
  await page.locator('#studio-class').selectOption({ index: 1 })
  await page.locator('#studio-subject').selectOption({ index: 1 })
  await page.locator('#studio-exam-date').fill('2026-12-15')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Select all', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Select all', exact: true }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  const presetGroup = page.getByRole('group', { name: 'Preset', exact: true })
  await expect(presetGroup.getByRole('button', { name: 'Board 75' })).toBeVisible()
  await presetGroup.getByRole('button', { name: 'Board 75' }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Auto-fill all sections' })).toBeVisible()
  await page.getByRole('button', { name: 'Auto-fill all sections' }).click()
  await expect(page.getByText('24 questions').first()).toBeVisible({ timeout: 5000 })
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByText('Everything checks out.')).toBeVisible({ timeout: 5000 })
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Submit for approval' })).toBeVisible()
  await page.getByRole('button', { name: 'Submit for approval' }).click()
  await expect(page.getByRole('heading', { name: 'Paper submitted' })).toBeVisible({ timeout: 8000 })
  await page.getByRole('button', { name: 'View paper' }).click()
  await expect(page).toHaveURL(/\/teacher\/papers\/paper-\d+/)
  const paperId = page.url().split('/').pop()!

  // --- School admin approves it ---
  await switchSession(page, 'school-admin', 'u-adm-03', 'sch-beacon')
  await page.goto(`/school/approvals?selected=${paperId}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: 'Approve', exact: true }).click()
  await expect(page.locator('.pb-toast')).toBeVisible({ timeout: 5000 })

  // --- Back as the teacher: read the real facts, then Print ---
  await switchSession(page, 'teacher', 'u-tch-01', 'sch-beacon')
  await page.goto(`/teacher/papers/${paperId}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Approved').first()).toBeVisible({ timeout: 5000 })
  const fact = async (label: string) =>
    (await page.locator(`.teacher-facts > div:has(dt:text-is("${label}")) dd`).innerText()).trim()
  const expectedTitle = `${await fact('Class')} ${await fact('Subject')} ${await fact('Exam type')} - Beacon Model School`
  // The detail page sets its own route title (paper title · PaperBuilder);
  // print must restore exactly that title when the dialog closes.
  const titleBeforePrint = await page.title()
  await page.getByRole('button', { name: 'Print', exact: true }).click()
  await expect(page.getByText('Printed').first()).toBeVisible({ timeout: 5000 })

  const titles = await page.evaluate(
    () => (window as unknown as { __printTitles: string[] }).__printTitles,
  )
  expect(titles).toEqual([expectedTitle])
  // The title is restored once the dialog closes.
  await expect(page).toHaveTitle(titleBeforePrint)
})

test('admin-saved legal text shows on the public terms page', async ({ page }) => {
  await setSession(page, 'super-admin', 'u-adm-01', null)

  // Default first: the static copy is shown while nothing custom is saved.
  await page.goto('/legal/terms', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.pb-legal')).toContainText(
    'PaperBuilder is a school examination and paper management platform.',
  )

  // Save custom Terms text in Platform settings (B10).
  await page.goto('/admin/settings', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Platform settings' })).toBeVisible()
  await page.locator('#settings-terms-en').fill(CUSTOM_TERMS)
  await page.getByRole('button', { name: 'Save settings', exact: true }).click()
  await expect(page.getByText('Settings saved.')).toBeVisible({ timeout: 5000 })

  // The public page now shows the saved text, not the static copy.
  await page.goto('/legal/terms', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.pb-legal')).toContainText(CUSTOM_TERMS)
  await expect(page.locator('.pb-legal')).not.toContainText(
    'PaperBuilder is a school examination and paper management platform.',
  )
})

/* ------------------------------------------------------------------
   Worker 6 — Task 8 (text-size scaling) + Task 9b (B6 bank coverage).
------------------------------------------------------------------- */

async function computedFontSize(page: Page, selector: string): Promise<number> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return Number.NaN
    return Number.parseFloat(getComputedStyle(el).fontSize)
  }, selector)
}

async function hasNoHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
}

test('task 8: Large text size scales a table cell and a button on /school/papers', async ({ page }) => {
  await signInAs(page, 1, '**/school')
  await page.goto('/school/papers', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.school-table-wrap table tbody tr').first()).toBeVisible()
  const cellStandard = await computedFontSize(page, '.school-table-wrap table tbody td')
  const buttonStandard = await computedFontSize(page, '.school-table-wrap table tbody .pb-btn')
  expect(cellStandard).toBe(14)
  expect(buttonStandard).toBe(14)

  await page.goto('/settings', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
  await page.getByRole('radio', { name: 'Large', exact: true }).click()
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.fontSize)).toBe('large')

  await page.goto('/school/papers', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.school-table-wrap table tbody tr').first()).toBeVisible()
  const cellLarge = await computedFontSize(page, '.school-table-wrap table tbody td')
  const buttonLarge = await computedFontSize(page, '.school-table-wrap table tbody .pb-btn')
  expect(cellLarge).toBeGreaterThan(cellStandard)
  expect(buttonLarge).toBeGreaterThan(buttonStandard)
})

test('task 8: Large text size has no horizontal overflow at 390px in English and Urdu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signInAs(page, 1, '**/school')
  await page.goto('/settings', { waitUntil: 'domcontentloaded' })
  await page.getByRole('radio', { name: 'Large', exact: true }).click()
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.fontSize)).toBe('large')

  await page.goto('/school/papers', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.school-cards .school-card').first()).toBeVisible()
  expect(await hasNoHorizontalOverflow(page)).toBe(true)

  await page.goto('/settings', { waitUntil: 'domcontentloaded' })
  await page.getByRole('radio', { name: 'Urdu', exact: true }).click()
  await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe('rtl')
  await page.goto('/school/papers', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.school-cards .school-card').first()).toBeVisible()
  expect(await hasNoHorizontalOverflow(page)).toBe(true)
})

test('task 9b: bank library coverage differs per class and matches bank data', async ({ page }) => {
  await signInAs(page, 0, '**/admin')
  await page.goto('/admin/bank?source=connected', { waitUntil: 'domcontentloaded' })
  const mathRow = page.locator('table tbody tr', { hasText: 'Mathematics' }).first()
  await expect(mathRow).toBeVisible()
  const englishRow = page.locator('table tbody tr', { hasText: 'English' }).first()

  // Class 1 (default): its papers use no Mathematics chapter, one English chapter.
  await expect(mathRow.locator('td').nth(6)).toHaveText('0 / 4')
  await expect(englishRow.locator('td').nth(6)).toHaveText('1 / 4')

  // Class 4: its papers use all four Mathematics chapters and two English ones.
  await page.locator('#bank-class').selectOption('class-4')
  await expect(mathRow.locator('td').nth(6)).toHaveText('4 / 4')
  await expect(englishRow.locator('td').nth(6)).toHaveText('2 / 4')
})
