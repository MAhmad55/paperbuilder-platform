// Phase 2 screenshots: every public screen/state at 390 + 1280 px, en + ur,
// deviceScaleFactor 2, one viewport shot per screen/state (top of page),
// plus per-section landing shots and 100% hero-paper crops.
// Usage (from the repo root): node scripts/phase2-shots.mjs
//   BASE_URL env (default http://localhost:5173)
//   OUT_DIR  env (default ./screenshots/phase2)
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const OUT = path.resolve(process.env.OUT_DIR ?? './screenshots/phase2')
mkdirSync(OUT, { recursive: true })

const DRAFT_KEY = 'paperbuilder.request-draft.v1'
const DEMO_EMAIL = 'adnan.butt@paperbuilder.example.pk'

const SCHOOL_DRAFT = {
  schoolName: 'Beacon Model School',
  city: 'Lahore',
  address: '12 Garden Town, Lahore',
  board: 'bise-lahore',
  studentsRange: '301-600',
  schoolType: 'high',
  contactName: '',
  contactRole: '',
  contactPhone: '',
  contactEmail: '',
  certificate: [],
  additional: [],
  planId: '',
  notes: '',
  consent: false,
}

const FULL_DRAFT = {
  ...SCHOOL_DRAFT,
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

const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1280, height: 900 },
]

const LANDING_SECTIONS = [
  { name: 'hero', selector: '.landing-hero' },
  { name: 'how', selector: '#how' },
  { name: 'roles', selector: '.landing-role' },
  { name: 'trust', selector: '.landing__band--dark' },
  { name: 'plans', selector: '#plans' },
  { name: 'faq', selector: '#faq' },
  { name: 'cta', selector: '.landing__band--cta' },
]

function shotName(screen, state, lang, width) {
  return `phase2-${screen}-${state}-${lang}-${width}.png`
}

async function newPage(browser, lang, width, height, draft) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    locale: lang === 'ur' ? 'ur-PK' : 'en-US',
  })
  const page = await ctx.newPage()
  await page.addInitScript(
    ({ lang, draft, key }) => {
      localStorage.setItem('paperbuilder.lang', lang)
      if (draft) localStorage.setItem(key, JSON.stringify(draft))
    },
    { lang, draft: draft ?? null, key: DRAFT_KEY },
  )
  return { ctx, page }
}

async function shoot(page, file) {
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(OUT, file) })
  console.log(`✓ ${file}`)
}

async function continueRequest(page) {
  await page.locator('.req-actions .pb-btn--primary').click()
  await page.waitForTimeout(500)
}

const browser = await chromium.launch()

for (const lang of ['en', 'ur']) {
  for (const { width, height } of WIDTHS) {
    // ---- landing: populated + per-section ----
    {
      const { ctx, page } = await newPage(browser, lang, width, height)
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
      await shoot(page, shotName('landing', 'populated', lang, width))
      for (const { name, selector } of LANDING_SECTIONS) {
        await page.locator(selector).first().scrollIntoViewIfNeeded()
        await page.waitForTimeout(500)
        await page.screenshot({ path: path.join(OUT, `phase2-landing-${name}-${lang}-${width}.png`) })
        console.log(`✓ phase2-landing-${name}-${lang}-${width}.png`)
      }
      await ctx.close()
    }

    // ---- sign-in: populated + error (empty submit) ----
    {
      const { ctx, page } = await newPage(browser, lang, width, height)
      await page.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(900)
      await page.locator('input[type="email"]').fill(DEMO_EMAIL)
      await shoot(page, shotName('sign-in', 'populated', lang, width))
      await page.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(900)
      await page.locator('form button[type="submit"]').click()
      await page.waitForTimeout(500)
      await shoot(page, shotName('sign-in', 'error', lang, width))
      await ctx.close()
    }

    // ---- request-access: populated + error + review ----
    {
      const { ctx, page } = await newPage(browser, lang, width, height, SCHOOL_DRAFT)
      await page.goto(`${BASE}/request-access`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(900)
      await shoot(page, shotName('request-access', 'populated', lang, width))
      await ctx.close()
    }
    {
      const { ctx, page } = await newPage(browser, lang, width, height)
      await page.goto(`${BASE}/request-access`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(900)
      await continueRequest(page)
      await shoot(page, shotName('request-access', 'error', lang, width))
      await ctx.close()
    }
    {
      const { ctx, page } = await newPage(browser, lang, width, height, FULL_DRAFT)
      await page.goto(`${BASE}/request-access`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(900)
      for (let i = 0; i < 4; i++) await continueRequest(page)
      await shoot(page, shotName('request-access', 'review', lang, width))
      await ctx.close()
    }

    // ---- request-status: four states via ?state= ----
    for (const state of ['pending', 'info', 'rejected', 'approved']) {
      const { ctx, page } = await newPage(browser, lang, width, height)
      await page.goto(`${BASE}/request-status?state=${state}`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)
      await shoot(page, shotName('request-status', state, lang, width))
      await ctx.close()
    }

    // ---- forgot-password: step1 + step2 + success ----
    {
      const { ctx, page } = await newPage(browser, lang, width, height)
      await page.goto(`${BASE}/forgot-password`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(900)
      await shoot(page, shotName('forgot-password', 'step1', lang, width))
      await page.locator('input[type="email"]').fill(DEMO_EMAIL)
      await page.locator('form button[type="submit"]').click()
      await page.waitForTimeout(600)
      await shoot(page, shotName('forgot-password', 'step2', lang, width))
      await page.locator('#root input').first().fill('123456')
      await page.locator('#reset-password').fill('NewPass1!')
      await page.locator('#reset-confirm-password').fill('NewPass1!')
      await page.locator('form button[type="submit"]').click()
      await page.waitForTimeout(900)
      await shoot(page, shotName('forgot-password', 'success', lang, width))
      await ctx.close()
    }

    // ---- invite: populated + error (terms unchecked) ----
    {
      const { ctx, page } = await newPage(browser, lang, width, height)
      await page.goto(`${BASE}/invite`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(900)
      await page.locator('#invite-password').fill('Teach123!')
      await page.locator('#invite-confirm-password').fill('Teach123!')
      await page.locator('input[type="checkbox"]').check()
      await shoot(page, shotName('invite', 'populated', lang, width))
      await ctx.close()
    }
    {
      const { ctx, page } = await newPage(browser, lang, width, height)
      await page.goto(`${BASE}/invite`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(900)
      await page.locator('#invite-password').fill('Teach123!')
      await page.locator('#invite-confirm-password').fill('Teach123!')
      await page.locator('form button[type="submit"]').click()
      await page.waitForTimeout(500)
      await shoot(page, shotName('invite', 'error', lang, width))
      await ctx.close()
    }

    // ---- public-preview: populated ----
    {
      const { ctx, page } = await newPage(browser, lang, width, height)
      await page.goto(`${BASE}/public-preview`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(900)
      await shoot(page, shotName('public-preview', 'populated', lang, width))
      await ctx.close()
    }
  }
}

/* ---------- 100%-zoom hero paper crops (A4 element only) ---------- */
for (const lang of ['en', 'ur']) {
  const { ctx, page } = await newPage(browser, lang, 1280, 900)
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  const el = page.locator('.landing-hero__paper .pb-paper').first()
  await el.scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  await el.screenshot({ path: path.join(OUT, `phase2-hero-paper-${lang}.png`), scale: 'css' })
  const box = await el.boundingBox()
  if (box) console.log(`✓ phase2-hero-paper-${lang}.png (${Math.round(box.width)}x${Math.round(box.height)} @100%)`)
  await ctx.close()
}

await browser.close()
console.log('done')
