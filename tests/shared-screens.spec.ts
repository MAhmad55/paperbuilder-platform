import { test, expect } from 'playwright/test'

/**
 * Shared screens end to end (blueprint §11 phase 6): every role reaches
 * Profile, Settings, History, Notifications and Help from the rail;
 * settings language switch flips the layout; mark-all-read clears the
 * TopBar badge; unknown routes show 404 and wrong-role routes show
 * no-permission; a profile edit survives navigation.
 */

const ROLES = [
  { name: 'super-admin', account: 0, home: '/admin', heading: 'Profile' },
  { name: 'school-admin', account: 1, home: '/school', heading: 'Profile' },
  { name: 'teacher', account: 2, home: '/teacher', heading: 'Profile' },
] as const

const SHARED = [
  { route: '/profile', heading: 'Profile' },
  { route: '/settings', heading: 'Settings' },
  { route: '/history', heading: 'History' },
  { route: '/notifications', heading: 'Notifications' },
  { route: '/help', heading: 'Help' },
] as const

async function signInAs(page, index: number, urlPattern: string) {
  await page.goto('/sign-in', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  await page.locator('.auth-demo__account').nth(index).click()
  await page.waitForURL(urlPattern, { timeout: 8000 })
  await page.waitForTimeout(1200)
}

for (const role of ROLES) {
  test(`${role.name} reaches all five shared screens`, async ({ page }) => {
    await signInAs(page, role.account, `**${role.home}`)
    for (const { route, heading } of SHARED) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('heading', { name: heading, exact: true }).first()).toBeVisible()
    }
  })

  test(`${role.name} rail links to all five shared screens`, async ({ page }) => {
    await signInAs(page, role.account, `**${role.home}`)
    const rail = page.locator('.app-rail')
    for (const { heading } of SHARED) {
      await expect(rail.getByRole('link', { name: heading, exact: true })).toBeVisible()
    }
  })
}

test('settings language switch flips the layout to RTL and back', async ({ page }) => {
  await signInAs(page, 2, '**/teacher')
  await page.goto('/settings', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
  await page.getByRole('radio', { name: 'Urdu', exact: true }).click()
  await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe('rtl')
  await expect(page.getByRole('heading', { name: 'ترتیبات', exact: true })).toBeVisible()
  await page.getByRole('radio', { name: 'انگریزی', exact: true }).click()
  await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe('ltr')
})

test('mark-all-read clears the unread count and the TopBar badge', async ({ page }) => {
  await signInAs(page, 2, '**/teacher')
  await page.goto('/notifications', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(/unread/)).toBeVisible()
  await page.getByRole('button', { name: 'Mark all read', exact: true }).click()
  await expect(page.getByText('All caught up')).toBeVisible()
  await expect(page.getByLabel('Notifications (0)')).toBeVisible()
})

test('opening a notification navigates to the paper it refers to', async ({ page }) => {
  await signInAs(page, 2, '**/teacher')
  await page.goto('/notifications', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Paper approved/ }).first().click()
  await expect(page).toHaveURL(/\/teacher\/papers\/paper-\d+/)
})

test('profile name edit persists across navigation', async ({ page }) => {
  await signInAs(page, 2, '**/teacher')
  await page.goto('/profile', { waitUntil: 'domcontentloaded' })
  const nameInput = page.locator('#profile-name')
  await expect(nameInput).toBeVisible()
  await nameInput.fill('Usman Rizwan Edited')
  await page.getByRole('button', { name: 'Save profile', exact: true }).click()
  await expect(page.getByText('Profile saved.')).toBeVisible()
  await expect(page.locator('.app-topbar__profile-name')).toContainText('Usman Rizwan Edited')
  await page.goto('/teacher', { waitUntil: 'domcontentloaded' })
  await page.goto('/profile', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('#profile-name')).toHaveValue('Usman Rizwan Edited')
})

test('unknown route shows the 404 state', async ({ page }) => {
  await signInAs(page, 2, '**/teacher')
  await page.goto('/no-such-page', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Page not found')).toBeVisible()
  await page.getByRole('button', { name: 'Go home', exact: true }).click()
  await expect(page).toHaveURL(/\/teacher$/)
})

test('wrong-role route shows the no-permission state', async ({ page }) => {
  await signInAs(page, 2, '**/teacher')
  await page.goto('/admin', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('No permission')).toBeVisible()
  await page.goto('/school', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('No permission')).toBeVisible()
})

test('system states demo shows each state with a recovery action', async ({ page }) => {
  await signInAs(page, 2, '**/teacher')
  await page.goto('/system-states?demo=offline', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.pb-empty__title', { hasText: 'Offline' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible()
  await page.goto('/system-states?demo=session-expired', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.pb-empty__title', { hasText: 'Session expired' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in again', exact: true })).toBeVisible()
})
