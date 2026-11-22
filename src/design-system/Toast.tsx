import { useTranslation } from 'react-i18next'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, Info, AlertTriangle, XCircle, X, type LucideIcon } from 'lucide-react'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  variant: ToastVariant
  title?: string
  message?: string
  duration?: number | null
}

interface ToastApi {
  toast: (opts: Omit<ToastItem, 'id'>) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const VARIANT_ICONS: Record<ToastVariant, LucideIcon> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: string) => {
    setToasts(current => current.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((opts: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now().toString(36)}-${++counter.current}`
    setToasts(current => [...current, { ...opts, id, duration: opts.duration ?? 4500 }])
    if (opts.duration !== 0) {
      window.setTimeout(() => dismiss(id), opts.duration ?? 4500)
    }
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="pb-toast-viewport" aria-live="polite" role="status">
        {toasts.map(item => {
          const Icon = VARIANT_ICONS[item.variant]
          const role = item.variant === 'error' || item.variant === 'warning' ? 'alert' : 'status'
          return (
            <div key={item.id} className={`pb-toast pb-toast--${item.variant}`} role={role}>
              <Icon size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {item.title && <div className="pb-toast__title">{item.title}</div>}
                {item.message && <div className="pb-toast__message">{item.message}</div>}
              </div>
              <button type="button" className="pb-toast__close" aria-label={t('common.dismissNotification')} onClick={() => dismiss(item.id)}>
                <X size={15} aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

export default ToastProvider
