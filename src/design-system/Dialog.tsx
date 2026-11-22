import { useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFocusTrap, useEscape } from './hooks'

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  closeOnBackdrop?: boolean
  ariaLabel?: string
}

const SIZE_MAX: Record<NonNullable<DialogProps['size']>, string> = {
  sm: '400px',
  md: '460px',
  lg: '640px',
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  ariaLabel,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const { t } = useTranslation()

  useFocusTrap(dialogRef, open)
  useEscape(onClose, open)

  if (!open) return null

  return (
    <div
      className="pb-dialog-backdrop"
      onMouseDown={e => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="pb-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : titleId}
        tabIndex={-1}
        style={{ maxWidth: SIZE_MAX[size] }}
      >
        <div className="pb-dialog__header">
          <h2 className="pb-dialog__title" id={titleId}>{title}</h2>
          <button type="button" className="pb-icon-btn" aria-label={t('common.closeDialog')} onClick={onClose}>
            <X size={19} aria-hidden="true" />
          </button>
        </div>
        {children && <div className="pb-dialog__body">{children}</div>}
        {footer && <div className="pb-dialog__footer">{footer}</div>}
      </div>
    </div>
  )
}

export default Dialog
