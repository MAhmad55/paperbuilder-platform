import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface PageHeaderProps {
  breadcrumb?: { label: string; to?: string }[]
  title: string
  lead?: string
  action?: ReactNode
}

export function PageHeader({ breadcrumb, title, lead, action }: PageHeaderProps) {
  const { t } = useTranslation()
  return (
    <div className="page-header">
      <div className="page-header__body">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="page-header__breadcrumb" aria-label={t('common.breadcrumb')}>
            {breadcrumb.map((item, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && <ChevronRight size={13} className="flip-rtl" aria-hidden="true" />}
                {item.to ? <Link to={item.to}>{item.label}</Link> : <span>{item.label}</span>}
              </span>
            ))}
          </nav>
        )}
        <h1>{title}</h1>
        {lead && <p className="page-header__lead">{lead}</p>}
      </div>
      {action && <div className="page-header__action">{action}</div>}
    </div>
  )
}

export default PageHeader
