import { useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFocusTrap, useEscape } from './hooks'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children?: ReactNode
  footer?: ReactNode
  ariaLabel?: string
}

export function Drawer({ open, onClose, title, children, footer, ariaLabel }: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

  useFocusTrap(drawerRef, open)
  useEscape(onClose, open)

  if (!open) return null

  return (
    <div
      className="pb-drawer-backdrop"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <aside className="pb-drawer" role="dialog" aria-modal="true" aria-label={ariaLabel ?? (typeof title === 'string' ? title : undefined)} ref={drawerRef}>
        <div className="pb-drawer__header">
          <h2 className="pb-drawer__title">{title}</h2>
          <button type="button" className="pb-icon-btn" aria-label={t('common.closeDrawer')} onClick={onClose}>
            <X size={19} aria-hidden="true" />
          </button>
        </div>
        <div className="pb-drawer__body">{children}</div>
        {footer && <div className="pb-dialog__footer" style={{ borderRadius: 0 }}>{footer}</div>}
      </aside>
    </div>
  )
}

export default Drawer
