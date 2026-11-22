import {
  FileQuestion, ShieldX, WifiOff, TimerOff, Wrench, type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../design-system'

export type SystemStateKind = 'not-found' | 'no-permission' | 'offline' | 'session-expired' | 'maintenance'

const ICONS: Record<SystemStateKind, LucideIcon> = {
  'not-found': FileQuestion,
  'no-permission': ShieldX,
  'offline': WifiOff,
  'session-expired': TimerOff,
  'maintenance': Wrench,
}

const KEYS: Record<SystemStateKind, { title: string; lead: string }> = {
  'not-found': { title: 'notFound', lead: 'notFoundLead' },
  'no-permission': { title: 'noPermission', lead: 'noPermissionLead' },
  'offline': { title: 'offline', lead: 'offlineLead' },
  'session-expired': { title: 'sessionExpired', lead: 'sessionExpiredLead' },
  'maintenance': { title: 'maintenance', lead: 'maintenanceLead' },
}

export function SystemStatePage({ kind, onHome }: { kind: SystemStateKind; onHome?: () => void }) {
  const { t } = useTranslation()
  const Icon = ICONS[kind]

  return (
    <div className="system-state" role="alert" aria-live="assertive">
      <div className="pb-empty" style={{ borderRadius: 18, background: 'var(--paper)', border: '1px solid var(--line)' }}>
        <div className="pb-empty__icon" aria-hidden="true"><Icon size={26} /></div>
        <div className="pb-empty__title">{t(`system.${KEYS[kind].title}`)}</div>
        <div className="pb-empty__body">{t(`system.${KEYS[kind].lead}`)}</div>
        <div className="pb-empty__actions">
          <Button variant="primary" onClick={onHome}>
            {t('system.goHome')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default SystemStatePage
