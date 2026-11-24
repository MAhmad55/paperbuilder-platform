import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../shell/PageHeader'
import { SystemStatePage, type SystemStateKind } from '../SystemStatePage'
import { useSharedUser } from './shared'

const KINDS: SystemStateKind[] = ['not-found', 'no-permission', 'offline', 'session-expired', 'maintenance']

function kindOf(value: string | null): SystemStateKind {
  return (KINDS as string[]).includes(value ?? '') ? (value as SystemStateKind) : 'maintenance'
}

/** System states (blueprint 4.5.6) — the offline, session-expired and
    maintenance states are reachable here via ?demo=, with a designed
    recovery action on each. 404 and no-permission are wired to real
    routing (unknown route, wrong-role route). */
export function SystemStatesPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const kind = kindOf(params.get('demo'))
  const user = useSharedUser()

  const breadcrumb = [
    { label: t('nav.dashboard'), to: user?.role === 'super-admin' ? '/admin' : user?.role === 'school-admin' ? '/school' : '/teacher' },
    { label: t('shared.system.demoTitle') },
  ]

  return (
    <div className="shared">
      <PageHeader
        breadcrumb={breadcrumb}
        title={t('shared.system.demoTitle')}
        lead={t('shared.system.demoLead')}
      />
      <p className="shared__note">{t('shared.system.demoNote')}</p>
      <div className="shared-system__chips" role="group" aria-label={t('shared.system.demoTitle')}>
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            className="shared-chip"
            aria-pressed={kind === k}
            onClick={() => setParams({ demo: k }, { replace: true })}
          >
            {t(`system.${k === 'not-found' ? 'notFound' : k === 'no-permission' ? 'noPermission' : k === 'offline' ? 'offline' : k === 'session-expired' ? 'sessionExpired' : 'maintenance'}`)}
          </button>
        ))}
      </div>
      <SystemStatePage kind={kind} />
    </div>
  )
}

export default SystemStatesPage
