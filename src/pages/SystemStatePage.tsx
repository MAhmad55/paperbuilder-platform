import {
  FileQuestion, ShieldX, WifiOff, TimerOff, Wrench, type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../design-system'
import { useAuth } from '../shell/AuthContext'

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

function roleHome(role: string | null): string {
  return role === 'super-admin' ? '/admin' : role === 'school-admin' ? '/school' : '/teacher'
}

export function SystemStatePage({ kind, onHome }: { kind: SystemStateKind; onHome?: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { role, signOut } = useAuth()
  const Icon = ICONS[kind]

  const goHome = onHome ?? (() => navigate(roleHome(role), { replace: true }))
  const tryAgain = () => window.location.reload()
  const signInAgain = () => {
    signOut()
    navigate('/sign-in', { replace: true })
  }

  return (
    <div className="system-state" role="alert" aria-live="assertive">
      <div className="pb-empty" style={{ borderRadius: 18, background: 'var(--paper)', border: '1px solid var(--line)' }}>
        <div className="pb-empty__icon" aria-hidden="true"><Icon size={26} /></div>
        <div className="pb-empty__title">{t(`system.${KEYS[kind].title}`)}</div>
        <div className="pb-empty__body">{t(`system.${KEYS[kind].lead}`)}</div>
        <div className="pb-empty__actions">
          {kind === 'offline' || kind === 'maintenance' ? (
            <>
              <Button variant="primary" onClick={tryAgain}>
                {t('system.tryAgain')}
              </Button>
              <Button variant="secondary" onClick={goHome}>
                {t('system.goHome')}
              </Button>
            </>
          ) : kind === 'session-expired' ? (
            <>
              <Button variant="primary" onClick={signInAgain}>
                {t('system.signInAgain')}
              </Button>
              <Button variant="secondary" onClick={goHome}>
                {t('system.goHome')}
              </Button>
            </>
          ) : kind === 'no-permission' ? (
            <>
              <Button variant="primary" onClick={goHome}>
                {t('system.goHome')}
              </Button>
              <Button variant="secondary" onClick={signInAgain}>
                {t('system.signInAgain')}
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={goHome}>
              {t('system.goHome')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default SystemStatePage
