import { test, expect } from 'playwright/test'

/**
 * Teacher flow end to end (blueprint §11 phase 5): a teacher builds a
 * complete paper in the Studio, submits it, sees it change status in
 * My papers and in the School Admin approvals queue, the school admin
 * approves it, and the teacher prints it and sees Printed.
 */

async function signInAs(page, index: number, urlPattern: string) {
  await page.goto('/sign-in', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  await page.locator('.auth-demo__account').nth(index).click()
  await page.waitForURL(urlPattern, { timeout: 8000 })
  await page.waitForTimeout(1200)
}

async function switchSession(page, role: string, userId: string, schoolId: string) {
  await page.evaluate(({ role, userId, schoolId }) => {
    const raw = localStorage.getItem('paperbuilder.v1')
    const state = raw ? JSON.parse(raw) : {}
    state.session = { role, userId, schoolId, signedInAt: '2026-11-24T00:00:00.000Z' }
    localStorage.setItem('paperbuilder.v1', JSON.stringify(state))
  }, { role, userId, schoolId })
}

test('teacher builds, submits, gets approval, prints', async ({ page }) => {
  await signInAs(page, 2, '**/teacher')

  // --- Studio: step 1 Setup (only assigned classes/subjects are offered) ---
  await page.goto('/teacher/studio', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Paper Studio' })).toBeVisible()
  await page.locator('#studio-class').selectOption({ index: 1 })
  await page.locator('#studio-subject').selectOption({ index: 1 })
  await page.locator('#studio-exam-date').fill('2026-12-15')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  // --- Step 2 Scope: select all chapters ---
  await expect(page.getByRole('button', { name: 'Select all', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Select all', exact: true }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  // --- Step 3 Blueprint: Board 75 preset ---
  const presetGroup = page.getByRole('group', { name: 'Preset', exact: true })
  await expect(presetGroup.getByRole('button', { name: 'Board 75' })).toBeVisible()
  await presetGroup.getByRole('button', { name: 'Board 75' }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  // --- Step 4 Questions: auto-fill every section ---
  await expect(page.getByRole('button', { name: 'Auto-fill all sections' })).toBeVisible()
  await page.getByRole('button', { name: 'Auto-fill all sections' }).click()
  await expect(page.getByText('24 questions').first()).toBeVisible({ timeout: 5000 })
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  // --- Step 5 Review: checklist passes ---
  await expect(page.getByText('Everything checks out.')).toBeVisible({ timeout: 5000 })
  // Phase 7: the Review preview renders the attempt rule (Board 75 longs
  // are "attempt any 2 of 3"), like the paper itself will. It appears
  // twice on this step (main preview + side rail), so match the first.
  await expect(page.getByText('Attempt any 2 of 3').first()).toBeVisible()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  // --- Step 6 Finish: submit for approval ---
  await expect(page.getByRole('button', { name: 'Submit for approval' })).toBeVisible()
  await page.getByRole('button', { name: 'Submit for approval' }).click()
  await expect(page.getByRole('heading', { name: 'Paper submitted' })).toBeVisible({ timeout: 8000 })

  // --- The paper exists in My papers as Submitted ---
  await page.getByRole('button', { name: 'View paper' }).click()
  await expect(page).toHaveURL(/\/teacher\/papers\/paper-\d+/)
  const paperId = page.url().split('/').pop()!
  await expect(page.getByText('Submitted').first()).toBeVisible()

  // --- School admin approves it from the approvals queue ---
  await switchSession(page, 'school-admin', 'u-adm-03', 'sch-beacon')
  await page.goto(`/school/approvals?selected=${paperId}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  // Phase 7: the approvals preview renders the same attempt rule as the
  // Studio preview — the approver checks attempted marks, not just totals.
  await expect(page.getByText('Attempt any 2 of 3').first()).toBeVisible({ timeout: 5000 })
  await page.getByRole('button', { name: 'Approve', exact: true }).click()
  await expect(page.locator('.pb-toast')).toBeVisible({ timeout: 5000 })

  // --- Back as the teacher: the paper is Approved, then Printed ---
  await switchSession(page, 'teacher', 'u-tch-01', 'sch-beacon')
  await page.goto(`/teacher/papers/${paperId}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Approved').first()).toBeVisible({ timeout: 5000 })
  await page.getByRole('button', { name: 'Print', exact: true }).click()
  await expect(page.getByText('Printed').first()).toBeVisible({ timeout: 5000 })
})

test('studio blocks Continue on an empty setup', async ({ page }) => {
  await signInAs(page, 2, '**/teacher')
  await page.goto('/teacher/studio', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByText('Choose a class, a subject and an exam date first.')).toBeVisible()
})
