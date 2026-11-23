import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu as MenuIcon } from 'lucide-react'
import { Button, Drawer } from '../../design-system'
import { setLanguage } from '../../i18n'
import { useAuth } from '../../shell/AuthContext'

/**
 * PublicLayout — chrome for the public & access screens (Phase 2, blueprint 4.1).
 * No sidebar: top bar with logo, nav links, language toggle and a Sign in
 * (or Go to dashboard, when signed in) button; mobile menu in a Drawer;
 * footer with links and a language toggle. Dark footer text is pure white
 * or ink-100.
 */
export function PublicLayout({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation()
  const { role } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const isUrdu = i18n.language === 'ur'

  /* Scroll to a landing section (e.g. /#plans) after navigation. */
  useEffect(() => {
    if (!location.hash) return
    const el = document.querySelector(location.hash)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.pathname, location.hash])

  const roleHome = role === 'super-admin' ? '/admin' : role === 'school-admin' ? '/school' : '/teacher'

  const navLinks = [
    { to: '/#how', label: t('public.nav.howItWorks') },
    { to: '/#plans', label: t('public.nav.plans') },
    { to: '/#faq', label: t('public.nav.faq') },
  ]

  const footerColumns: Array<{ title: string; links: Array<{ to: string; label: string }> }> = [
    {
      title: t('public.footer.productTitle'),
      links: navLinks,
    },
    {
      title: t('public.footer.accessTitle'),
      links: [
        { to: '/request-access', label: t('public.nav.requestAccess') },
        { to: '/sign-in', label: t('signIn.signIn') },
      ],
    },
    {
      title: t('public.footer.legalTitle'),
      links: [
        { to: '/legal/terms', label: t('public.footer.terms') },
        { to: '/legal/privacy', label: t('public.footer.privacy') },
      ],
    },
  ]

  const langToggle = (
    <div className="lang-toggle" role="group" aria-label={t('demo.chooseLanguage')}>
      <button
        type="button"
        className="lang-toggle__option"
        aria-pressed={!isUrdu}
        onClick={() => setLanguage('en')}
      >
        English
      </button>
      <button
        type="button"
        className="lang-toggle__option"
        aria-pressed={isUrdu}
        onClick={() => setLanguage('ur')}
        lang="ur"
      >
        اردو
      </button>
    </div>
  )

  return (
    <div className="pb-public">
      <a className="skip-link" href="#pb-public-main">{t('shell.skipToContent')}</a>
      <header className="pb-public-topbar">
        <div className="pb-public-topbar__inner">
          <Link to="/" className="pb-public-brand" aria-label="PaperBuilder">
            <span className="app-rail__logo" aria-hidden="true">PB</span>
            <span className="pb-public-brand__name">PaperBuilder</span>
          </Link>

          <nav className="pb-public-nav" aria-label={t('public.nav.primary')}>
            {navLinks.map(l => (
              <Link key={l.to} to={l.to} className="pb-public-nav__link">{l.label}</Link>
            ))}
          </nav>

          <div className="pb-public-topbar__actions">
            {langToggle}
            {role ? (
              <Button variant="primary" onClick={() => navigate(roleHome)}>
                {t('public.nav.dashboard')}
              </Button>
            ) : (
              <Button variant="primary" onClick={() => navigate('/sign-in')}>
                {t('signIn.signIn')}
              </Button>
            )}
            <button
              type="button"
              className="pb-icon-btn pb-public-topbar__menu-btn"
              aria-label={t('shell.openMenu')}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <MenuIcon size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <Drawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={t('public.nav.menu')}
        ariaLabel={t('public.nav.menu')}
      >
        <nav className="pb-public-menu" aria-label={t('public.nav.primary')}>
          {navLinks.map(l => (
            <Link key={l.to} to={l.to} className="pb-public-menu__link" onClick={() => setMenuOpen(false)}>
              {l.label}
            </Link>
          ))}
          <Link to="/request-access" className="pb-public-menu__link" onClick={() => setMenuOpen(false)}>
            {t('public.nav.requestAccess')}
          </Link>
          <div className="pb-public-menu__actions">
            {role ? (
              <Button variant="primary" onClick={() => { setMenuOpen(false); navigate(roleHome) }} style={{ width: '100%' }}>
                {t('public.nav.dashboard')}
              </Button>
            ) : (
              <Button variant="primary" onClick={() => { setMenuOpen(false); navigate('/sign-in') }} style={{ width: '100%' }}>
                {t('signIn.signIn')}
              </Button>
            )}
            <div className="pb-public-menu__lang">
              <span className="pb-public-menu__lang-label">{t('demo.chooseLanguage')}</span>
              {langToggle}
            </div>
          </div>
        </nav>
      </Drawer>

      <main id="pb-public-main" className="pb-public-main">{children}</main>

      <footer className="pb-public-footer">
        <div className="pb-public-footer__inner">
          <div className="pb-public-footer__brand">
            <span className="pb-public-brand__name">PaperBuilder</span>
            <p className="pb-public-footer__tagline">{t('public.footer.tagline')}</p>
          </div>
          <nav className="pb-public-footer__nav" aria-label={t('public.nav.primary')}>
            {footerColumns.map((col) => (
              <div key={col.title} className="pb-public-footer__col">
                <h2 className="pb-public-footer__col-title">{col.title}</h2>
                {col.links.map((l) => (
                  <Link key={l.to} to={l.to} className="pb-public-footer__link">{l.label}</Link>
                ))}
              </div>
            ))}
          </nav>
          <div className="pb-public-footer__lang">{langToggle}</div>
        </div>
        <div className="pb-public-footer__bottom">
          <span>{t('public.footer.copyright')}</span>
        </div>
      </footer>
    </div>
  )
}

export default PublicLayout
