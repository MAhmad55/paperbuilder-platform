import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PublicLayout } from '../features/public/PublicLayout'

type StateKey =
  | 'populated'
  | 'error'
  | 'review'
  | 'pending'
  | 'info'
  | 'rejected'
  | 'approved'
  | 'step1'
  | 'step2'
  | 'success'

interface PreviewLink {
  to: string
  state: StateKey
}

interface PreviewSection {
  titleKey: string
  links: PreviewLink[]
}

/** Dev-only index of Phase 2 screens and their states. */
const SECTIONS: PreviewSection[] = [
  { titleKey: 'public.landing.title', links: [{ to: '/', state: 'populated' }] },
  {
    titleKey: 'auth.signIn.title',
    links: [
      { to: '/sign-in', state: 'populated' },
      { to: '/sign-in', state: 'error' },
    ],
  },
  {
    titleKey: 'public.requestAccess.title',
    links: [
      { to: '/request-access', state: 'populated' },
      { to: '/request-access', state: 'error' },
      { to: '/request-access', state: 'review' },
    ],
  },
  {
    titleKey: 'public.requestStatus.title',
    links: [
      { to: '/request-status?state=pending', state: 'pending' },
      { to: '/request-status?state=info', state: 'info' },
      { to: '/request-status?state=rejected', state: 'rejected' },
      { to: '/request-status?state=approved', state: 'approved' },
    ],
  },
  {
    titleKey: 'public.forgotPassword.title',
    links: [
      { to: '/forgot-password', state: 'step1' },
      { to: '/forgot-password', state: 'step2' },
      { to: '/forgot-password', state: 'success' },
    ],
  },
  {
    titleKey: 'public.invite.title',
    links: [
      { to: '/invite', state: 'populated' },
      { to: '/invite', state: 'error' },
    ],
  },
]

export function PublicPreviewPage() {
  const { t } = useTranslation()
  return (
    <PublicLayout>
      <div className="pb-preview">
        <h1>{t('public.preview.title')}</h1>
        <p className="pb-preview__intro">{t('public.preview.intro')}</p>
        {SECTIONS.map((section) => (
          <section key={section.titleKey} className="pb-preview__section" aria-label={t(section.titleKey)}>
            <h2>{t(section.titleKey)}</h2>
            <ul className="pb-preview__links">
              {section.links.map((link) => (
                <li key={`${link.to}-${link.state}`}>
                  <Link to={link.to}>{t(`public.preview.state.${link.state}`)}</Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PublicLayout>
  )
}

export default PublicPreviewPage
