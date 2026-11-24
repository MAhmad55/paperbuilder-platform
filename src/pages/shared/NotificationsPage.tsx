import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, CheckCheck, Megaphone, MessageSquare, UserPlus, type LucideIcon } from 'lucide-react'
import { PageHeader } from '../../shell/PageHeader'
import { Banner, Button, Card, EmptyState, SearchField, Skeleton, useToast } from '../../design-system'
import { PlatformService } from '../../services/mock-store'
import { notificationTarget } from '../../services/shared'
import type { AppNotification } from '../../mock/data'
import type { AppLanguage } from '../../i18n'
import { Bidi } from '../../utils/bidi'
import { formatDateTime } from '../../utils/date'
import { demoModeOf, useSchoolDemo, useSharedUser } from './shared'

const TYPE_ICONS: Record<AppNotification['type'], LucideIcon> = {
  approval: CheckCheck,
  comment: MessageSquare,
  announcement: Megaphone,
  invitation: UserPlus,
}

/** Notifications (blueprint 4.5.4) — approvals, comments, announcements,
    invitations. Mark all read, individual read/unread, and clicking one
    opens the paper, approval, announcement or teachers list it refers to.
    The TopBar badge re-counts via the store's notification event. */
export function NotificationsPage() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage
  const demoMode = demoModeOf(params.get('demo'))
  const { loading, loadFailed, retry } = useSchoolDemo(demoMode)
  const forceEmpty = demoMode === 'empty'

  const user = useSharedUser()
  const [search, setSearch] = useState('')
  const [tick, setTick] = useState(0)

  const all = useMemo(
    () => (forceEmpty || !user ? [] : PlatformService.listNotifications(user.id)),
    [forceEmpty, user, tick], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const unread = all.filter((n) => !n.read).length
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return all
    return all.filter((n) => {
      const title = lang === 'ur' ? n.titleUr : n.titleEn
      const body = lang === 'ur' ? n.bodyUr : n.bodyEn
      return title.toLowerCase().includes(q) || body.toLowerCase().includes(q)
    })
  }, [all, search, lang])

  if (!user) {
    return (
      <div className="shared">
        <Banner variant="error" title={t('shared.notifications.error.title')}>
          {t('shared.notifications.error.body')}
        </Banner>
      </div>
    )
  }

  const openNotification = (n: AppNotification) => {
    PlatformService.markNotificationRead(n.id)
    setTick((v) => v + 1)
    const target = notificationTarget(n, user.role)
    if (target) navigate(target)
    else toast({ variant: 'info', message: t('shared.notifications.noTarget') })
  }

  const markOneRead = (n: AppNotification) => {
    PlatformService.markNotificationRead(n.id)
    setTick((v) => v + 1)
  }

  const markAllRead = () => {
    PlatformService.markAllNotificationsRead(user.id)
    setTick((v) => v + 1)
    toast({ variant: 'success', message: t('shared.notifications.markedAll') })
  }

  const breadcrumb = [
    { label: t('nav.dashboard'), to: user.role === 'super-admin' ? '/admin' : user.role === 'school-admin' ? '/school' : '/teacher' },
    { label: t('shared.notifications.title') },
  ]

  return (
    <div className="shared">
      <PageHeader
        breadcrumb={breadcrumb}
        title={t('shared.notifications.title')}
        lead={t('shared.notifications.lead')}
        action={unread > 0 ? (
          <Button variant="secondary" onClick={markAllRead}>
            {t('shared.notifications.markAll')}
          </Button>
        ) : undefined}
      />

      {loading ? (
        <div className="shared__skeleton" aria-label={t('common.loading')} role="status">
          <Skeleton variant="rect" height={64} />
          <Skeleton variant="rect" height={88} />
          <Skeleton variant="rect" height={88} />
          <Skeleton variant="rect" height={88} />
        </div>
      ) : loadFailed ? (
        <div>
          <Banner variant="error" title={t('shared.notifications.error.title')}>
            {t('shared.notifications.error.body')}
          </Banner>
          <div className="shared__retry">
            <Button variant="primary" onClick={retry}>{t('common.retry')}</Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="shared-filters">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder={t('common.search')}
              ariaLabel={t('common.search')}
            />
          </div>

          <p className="shared-count" role="status">
            <Bidi>{unread > 0 ? t('shared.notifications.count', { count: unread }) : t('shared.notifications.allRead')}</Bidi>
          </p>

          {filtered.length === 0 ? (
            <Card>
              <EmptyState
                title={t('shared.notifications.emptyTitle')}
                body={t('shared.notifications.emptyBody')}
              />
            </Card>
          ) : (
            <div className="shared__stack">
              {filtered.map((n) => {
                const Icon = TYPE_ICONS[n.type] ?? Bell
                const title = lang === 'ur' ? n.titleUr : n.titleEn
                const body = lang === 'ur' ? n.bodyUr : n.bodyEn
                return (
                  <div key={n.id} className={n.read ? 'shared-notif' : 'shared-notif shared-notif--unread'}>
                    <button
                      type="button"
                      className="shared-notif__body"
                      style={{ background: 'none', border: 0, padding: 0, textAlign: 'start', cursor: 'pointer', color: 'inherit', font: 'inherit' }}
                      onClick={() => openNotification(n)}
                      aria-label={`${title} — ${n.read ? t('shared.notifications.read') : t('shared.notifications.unread')}`}
                    >
                      <span className="shared-notif__row">
                        <span className="shared-notif__icon" aria-hidden="true"><Icon size={18} /></span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span className="shared-notif__title">
                            {!n.read && <span className="shared-notif__dot" aria-hidden="true" />}
                            <Bidi>{title}</Bidi>
                            <span className="shared-card__meta">{t(`shared.notifications.types.${n.type}`)}</span>
                          </span>
                          <span className="shared-notif__text" style={{ display: 'block' }}><Bidi>{body}</Bidi></span>
                        </span>
                        <span className="shared-notif__time">{formatDateTime(n.createdAt, lang)}</span>
                      </span>
                    </button>
                    {!n.read && (
                      <Button variant="ghost" onClick={() => markOneRead(n)}>
                        {t('shared.notifications.markRead')}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationsPage
