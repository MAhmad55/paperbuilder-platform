import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/**
 * Route announcer (Phase 7 screen-reader check).
 *
 * Until Phase 7 the app announced toasts (the toast viewport is a polite
 * live region) and form errors (`role="alert"` on Input/Select/Textarea),
 * but navigating between pages announced nothing: no live region changed
 * and `document.title` never moved. This component closes that gap for
 * every route, public and in-app, in both languages:
 *
 * - after each navigation it reads the page's own `<h1>` (every app page
 *   renders one through PageHeader; public pages render their own), sets
 *   `document.title` from it, and puts the same text into a visually
 *   hidden polite live region, so a screen reader announces the new page;
 * - the text is cleared first and set on a short delay, so navigating
 *   between two pages with the same heading still announces;
 * - the 600ms wait covers the ~350ms skeleton on demo pages, so the
 *   heading is read after the real content lands, not the skeleton; if
 *   the heading is still absent it retries every 250ms (up to 2s) instead
 *   of announcing nothing.
 *
 * Verified live by `scripts/phase7-announcer.mjs`, which reads the live
 * region's text after real navigations (no screen reader is available in
 * this sandbox, so the check asserts the mechanism — the exact text a
 * screen reader would announce — rather than a screen-reader run).
 */
export function RouteAnnouncer() {
  const location = useLocation()
  const { t } = useTranslation()
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    let cancelled = false
    let attempts = 0
    const tick = () => {
      if (cancelled) return
      const h1 = document.querySelector('main h1, h1')
      const text = h1?.textContent?.trim() ?? ''
      if (text) {
        document.title = `${text} · ${t('app.name')}`
        setAnnouncement('')
        window.setTimeout(() => {
          if (!cancelled) setAnnouncement(text)
        }, 60)
        return
      }
      // The heading is not in the DOM yet (slow first paint, skeleton
      // still up): retry briefly instead of announcing nothing.
      attempts++
      if (attempts < 8) window.setTimeout(tick, 250)
    }
    const id = window.setTimeout(tick, 600)
    return () => {
      cancelled = true
      window.clearTimeout(id)
    }
  }, [location.pathname, t])

  return (
    <div className="sr-only" aria-live="polite" role="status" data-testid="route-announcer">
      {announcement}
    </div>
  )
}

export default RouteAnnouncer
