import { useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFocusTrap, useEscape } from './hooks'

export interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children?: ReactNode
  ariaLabel?: string
}

export function BottomSheet({ open, onClose, title, children, ariaLabel }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const { t } = useTranslation()

  useFocusTrap(sheetRef, open)
  useEscape(onClose, open)

  if (!open) return null

  return (
    <div
      className="pb-bottom-sheet-backdrop"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={sheetRef}
        className="pb-bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel || !title ? undefined : titleId}
        tabIndex={-1}
      >
        <div className="pb-bottom-sheet__handle" aria-hidden="true" />
        {title && (
          <div className="pb-bottom-sheet__header">
            <h2 className="pb-bottom-sheet__title" id={titleId}>{title}</h2>
            <button type="button" className="pb-icon-btn" aria-label={t('common.closeBottomSheet')} onClick={onClose}>
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="pb-bottom-sheet__body">{children}</div>
      </div>
    </div>
  )
}

export default BottomSheet
