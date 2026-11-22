import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { PageHeader } from '../shell/PageHeader'
import { EmptyState } from '../design-system'
import { Compass } from 'lucide-react'

export interface PlaceholderPageProps {
  title?: string
  lead?: string
  breadcrumb?: { label: string; to?: string }[]
}

export function PlaceholderPage({ title, lead, breadcrumb }: PlaceholderPageProps) {
  const { t } = useTranslation()
  return (
    <div>
      <PageHeader
        breadcrumb={breadcrumb}
        title={title ?? t('nav.dashboard')}
        lead={lead ?? t('placeholder.lead')}
      />
      <EmptyState
        icon={<Compass size={26} aria-hidden="true" />}
        title={title ?? t('placeholder.title')}
        body={lead ?? t('placeholder.lead')}
      >
        <Link to="/" className="pb-btn pb-btn--primary">{t('placeholder.back')}</Link>
      </EmptyState>
    </div>
  )
}

export default PlaceholderPage
