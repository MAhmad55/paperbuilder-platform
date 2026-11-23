import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PublicLayout } from '../features/public/PublicLayout'

/**
 * Short public legal pages linked from the footer (Phase 2 fixes A5).
 * Copy is placeholder until Phase 3 B10 (platform settings: legal text).
 */
export function LegalPage() {
  const { t } = useTranslation()
  const { doc } = useParams()
  const isPrivacy = doc === 'privacy'
  return (
    <PublicLayout>
      <div className="pb-legal">
        <h1>{t(isPrivacy ? 'public.legal.privacyTitle' : 'public.legal.termsTitle')}</h1>
        <p>{t(isPrivacy ? 'public.legal.privacyBody1' : 'public.legal.termsBody1')}</p>
        <p>{t(isPrivacy ? 'public.legal.privacyBody2' : 'public.legal.termsBody2')}</p>
      </div>
    </PublicLayout>
  )
}

export default LegalPage
