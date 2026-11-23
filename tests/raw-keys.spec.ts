import { test, expect, type Page } from 'playwright/test'

const ROLE_SESSIONS: Record<string, { userId: string; schoolId: string | null }> = {
  'super-admin': { userId: 'u-adm-01', schoolId: null },
  'school-admin': { userId: 'u-adm-03', schoolId: 'sch-beacon' },
  teacher: { userId: 'u-tch-01', schoolId: 'sch-beacon' },
}

const ROLE_ROUTES: Record<string, string[]> = {
  'super-admin': ['/admin', '/admin/schools', '/admin/approvals', '/admin/plans', '/admin/bank', '/admin/users', '/admin/announcements', '/admin/audit', '/admin/settings'],
  'school-admin': ['/school', '/school/approvals', '/school/teachers', '/school/classes', '/school/calendar', '/school/papers', '/school/templates', '/school/reports', '/school/settings'],
  teacher: ['/teacher', '/teacher/studio', '/teacher/papers', '/teacher/templates', '/teacher/questions'],
}

const SHARED_ROUTES = ['/design-system', '/foundation-test', '/profile', '/settings', '/history', '/notifications', '/session-expired', '/does-not-exist']

/** Phase 2 public & access screens — no session, language only. */
const PUBLIC_ROUTES = ['/', '/sign-in', '/request-access', '/request-status', '/forgot-password', '/invite', '/legal/terms', '/legal/privacy', '/public-preview']

/** Scan the visible DOM for raw i18n keys. Sample-paper regions (data-sample-artifact) are excluded: they are bilingual fixtures, not demo copy. */
async function scanVisibleText(page: Page) {
  return page.locator('body').evaluate((body) => {
    const out: { text: string; tag: string }[] = []
    const re = /^[a-z0-9_-]+(\.[a-z0-9_-]+)+$/
    const walk = (node: Node) => {
      if (!(node instanceof Element)) return
      const el = node as HTMLElement
      if (el.dataset?.sampleArtifact) return // sample content, not demo copy
      const style = getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return
      const isLeaf = el.children.length === 0
      const text = (el.textContent ?? '').trim()
      if (isLeaf && text && re.test(text)) {
        out.push({ text, tag: el.tagName.toLowerCase() })
      }
      for (const child of Array.from(el.children)) walk(child)
    }
    walk(body)
    return out
  })
}

async function setSession(page: Page, lang: 'en' | 'ur', role: string) {
  await page.addInitScript(
    ({ lang, role, userId, schoolId, signedInAt }) => {
      try {
        localStorage.setItem('paperbuilder.lang', lang)
        localStorage.setItem('paperbuilder.v1', JSON.stringify({
          papers: [],
          audit: [],
          notifications: [],
          schoolOverrides: {},
          session: { role, userId, schoolId, signedInAt },
        }))
      } catch { /* ignore */ }
    },
    { lang, role, ...ROLE_SESSIONS[role], signedInAt: '2026-11-22T00:00:00.000Z' },
  )
}

for (const lang of ['en', 'ur'] as const) {
  test.describe(`raw i18n keys in visible text — ${lang}`, () => {
    test('/sign-in', async ({ page }) => {
      await page.addInitScript((l) => localStorage.setItem('paperbuilder.lang', l), lang)
      await page.goto('/sign-in', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
      const bad = await scanVisibleText(page)
      expect(bad, `raw i18n key(s) visible on /sign-in: ${bad.map(b => b.text).join(', ')}`).toEqual([])
    })

    test.describe('public routes (no session)', () => {
      for (const route of PUBLIC_ROUTES) {
        test(route, async ({ page }) => {
          await page.addInitScript((l) => localStorage.setItem('paperbuilder.lang', l), lang)
          await page.goto(route, { waitUntil: 'domcontentloaded' })
          await page.waitForTimeout(1200)
          const bad = await scanVisibleText(page)
          expect(bad, `raw i18n key(s) visible on ${route}: ${bad.map(b => b.text).join(', ')}`).toEqual([])
        })
      }
    })

    for (const role of Object.keys(ROLE_SESSIONS)) {
      const routes = [...ROLE_ROUTES[role], ...SHARED_ROUTES]
      test.describe(`role: ${role}`, () => {
        for (const route of routes) {
          test(route, async ({ page }) => {
            await setSession(page, lang, role)
            await page.goto(route, { waitUntil: 'domcontentloaded' })
            await page.waitForTimeout(900)
            const bad = await scanVisibleText(page)
            expect(bad, `raw i18n key(s) visible on ${route}: ${bad.map(b => b.text).join(', ')}`).toEqual([])
          })
        }
      })
    }
  })
}
