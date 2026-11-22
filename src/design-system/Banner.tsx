import { AlertCircle, CheckCircle2, Info, AlertTriangle, X, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

export type BannerVariant = 'info' | 'success' | 'warning' | 'error'

export interface BannerProps {
  variant?: BannerVariant
  title?: string
  children?: ReactNode
  onClose?: () => void
  icon?: LucideIcon
}

const VARIANT_ICONS: Record<BannerVariant, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
}

export function Banner({ variant = 'info', title, children, onClose, icon }: BannerProps) {
  const { t } = useTranslation()
  const Icon = icon ?? VARIANT_ICONS[variant]
  return (
    <div className={`pb-banner pb-banner--${variant}`} role={variant === 'error' || variant === 'warning' ? 'alert' : 'status'}>
      <span className="pb-banner__icon" aria-hidden="true"><Icon size={20} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div className="pb-banner__title">{title}</div>}
        {children && <div className="pb-banner__message">{children}</div>}
      </div>
      {onClose && (
        <button type="button" className="pb-banner__close" aria-label={t('common.dismissBanner')} onClick={onClose}>
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

export default Banner
