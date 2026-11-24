import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PublicLayout } from '../features/public/PublicLayout'
import { getLegalText } from '../services/mock-store'

/**
 * Short public legal pages linked from the footer (Phase 2 fixes A5).
 * Phase 7 (B10 gap): the body reads the text saved in Platform settings
 * when the admin has saved custom text; otherwise it falls back to the
 * static i18n copy (public.legal.*).
 */
export function LegalPage() {
  const { t, i18n } = useTranslation()
  const { doc } = useParams()
  const isPrivacy = doc === 'privacy'
  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as 'en' | 'ur'
  const custom = getLegalText(isPrivacy ? 'privacy' : 'terms', lang)
  const paragraphs = custom
    ? custom.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    : null
  return (
    <PublicLayout>
      <div className="pb-legal">
        <h1>{t(isPrivacy ? 'public.legal.privacyTitle' : 'public.legal.termsTitle')}</h1>
        {paragraphs ? (
          paragraphs.map((p, i) => <p key={i}>{p}</p>)
        ) : (
          <>
            <p>{t(isPrivacy ? 'public.legal.privacyBody1' : 'public.legal.termsBody1')}</p>
            <p>{t(isPrivacy ? 'public.legal.privacyBody2' : 'public.legal.termsBody2')}</p>
          </>
        )}
      </div>
    </PublicLayout>
  )
}

export default LegalPage
