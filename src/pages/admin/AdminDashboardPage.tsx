import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { PageHeader } from '../../shell/PageHeader'
import { Banner, Button, Card, EmptyState, Skeleton } from '../../design-system'
import { ApprovalRequestService, PaperService, PlatformService, SchoolService } from '../../services/mock-store'
import type { AuditAction, SchoolStatus } from '../../mock/data'
import { Bidi } from '../../utils/bidi'
import { formatDate, formatDateTime } from '../../utils/date'
import type { AppLanguage } from '../../i18n'
import '../../styles/admin-dashboard.css'

/** Audit action values (hyphenated/dotted) map to camelCase i18n keys. */
const ACTION_KEY: Record<AuditAction, string> = {
  'school.approved': 'schoolApproved',
  'school.rejected': 'schoolRejected',
  'school.suspended': 'schoolSuspended',
  'school.reactivated': 'schoolReactivated',
  'school.plan-changed': 'schoolPlanChanged',
  'school.info-requested': 'schoolInfoRequested',
  'school.settings-changed': 'schoolSettingsChanged',
  'school.plan-upgrade-requested': 'schoolPlanUpgradeRequested',
  'paper.approved': 'paperApproved',
  'paper.submitted': 'paperSubmitted',
  'paper.printed': 'paperPrinted',
  'paper.changes-requested': 'paperChangesRequested',
  'paper.archived': 'paperArchived',
  'paper.in-review': 'paperInReview',
  'teacher.invited': 'teacherInvited',
  'teacher.assignment-changed': 'teacherAssignmentChanged',
  'user.invited': 'userInvited',
  'user.deactivated': 'userDeactivated',
  'user.profile-updated': 'userProfileUpdated',
  'user.password-changed': 'userPasswordChanged',
  'plan.limit-changed': 'planLimitChanged',
  'template.created': 'templateCreated',
  'template.default-changed': 'templateDefaultChanged',
  'announcement.published': 'announcementPublished',
  'announcement.scheduled': 'announcementScheduled',
}

const STATUS_ROWS: SchoolStatus[] = ['active', 'pending', 'suspended']

type DemoMode = 'loading' | 'empty' | 'error' | null

function demoModeOf(value: string | null): DemoMode {
  return value === 'loading' || value === 'empty' || value === 'error' ? value : null
}

/** Super Admin dashboard — Phase 3 B1. KPI cards + recent activity. */
export function AdminDashboardPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage
  const demoMode = demoModeOf(params.get('demo'))

  /* Simulated fetch so the loading state is real (mock data is synchronous). */
  useEffect(() => {
    if (demoMode === 'loading') {
      setLoading(true)
      setLoadFailed(false)
      return
    }
    if (demoMode === 'error') {
      setLoading(false)
      setLoadFailed(true)
      return
    }
    setLoadFailed(false)
    setLoading(true)
    const handle = window.setTimeout(() => setLoading(false), 350)
    return () => window.clearTimeout(handle)
  }, [demoMode])

  const retry = () => {
    const next = new URLSearchParams(params)
    next.delete('demo')
    setParams(next, { replace: true })
  }

  const isEmptyDemo = demoMode === 'empty'

  const schools = useMemo(() => (isEmptyDemo ? [] : SchoolService.list()), [isEmptyDemo])
  const approvalsWaiting = useMemo(
    () => (isEmptyDemo ? 0 : ApprovalRequestService.list().filter((r) => r.status === 'pending').length),
    [isEmptyDemo],
  )
  const papersThisMonth = useMemo(() => {
    if (isEmptyDemo) return 0
    const now = new Date()
    return PaperService.list().filter((p) => {
      const d = new Date(p.createdAt)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    }).length
  }, [isEmptyDemo])
  const queue = useMemo(
    () =>
      isEmptyDemo
        ? []
        : ApprovalRequestService.list().filter((r) => r.status === 'pending').slice(0, 3),
    [isEmptyDemo],
  )
  const activeTeachers = useMemo(
    () => (isEmptyDemo ? 0 : PlatformService.listUsers().filter((u) => u.role === 'teacher' && u.status === 'active').length),
    [isEmptyDemo],
  )
  const activity = useMemo(
    () =>
      isEmptyDemo
        ? []
        : [...PlatformService.listAudit()]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 8),
    [isEmptyDemo],
  )

  const schoolCount = (status: SchoolStatus) => schools.filter((s) => s.status === status).length

  return (
    <div className="admin-dash">
      <PageHeader title={t('nav.dashboard')} lead={t('admin.dashboard.lead')} />

      {loading ? (
        <div className="admin-dash__loading" aria-label={t('common.loading')} role="status">
          <div className="admin-dash__kpis">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="admin-kpi">
                <Skeleton variant="rect" height={36} width="40%" />
                <Skeleton variant="rect" height={20} width="70%" />
              </div>
            ))}
          </div>
          <Card>
            <Skeleton variant="rect" height={24} width="35%" />
            <Skeleton variant="rect" height={56} count={4} />
          </Card>
          <Card>
            <Skeleton variant="rect" height={24} width="30%" />
            <Skeleton variant="rect" height={56} count={3} />
          </Card>
        </div>
      ) : loadFailed ? (
        <div className="admin-dash__error">
          <Banner variant="error" title={t('admin.dashboard.error.title')}>
            {t('admin.dashboard.error.body')}
          </Banner>
          <Button variant="primary" size="lg" onClick={retry}>
            {t('common.retry')}
          </Button>
        </div>
      ) : (
        <>
          <div className="admin-dash__kpis">
            <article className="admin-kpi">
              <Link to="/admin/schools" className="admin-kpi__main">
                <span className="admin-kpi__value"><Bidi>{schools.length}</Bidi></span>
                <span className="admin-kpi__label">{t('admin.dashboard.kpi.schools')}</span>
              </Link>
              <ul className="admin-kpi__rows">
                {STATUS_ROWS.map((status) => (
                  <li key={status}>
                    <Link to={`/admin/schools?status=${status}`}>
                      <span>{t(`status.${status}`)}</span>
                      <Bidi>{schoolCount(status)}</Bidi>
                    </Link>
                  </li>
                ))}
              </ul>
            </article>

            <Link to="/admin/approvals" className="admin-kpi admin-kpi--primary">
              <span className="admin-kpi__value"><Bidi>{approvalsWaiting}</Bidi></span>
              <span className="admin-kpi__label">{t('admin.dashboard.kpi.approvals')}</span>
            </Link>

            <Link to="/admin/audit" className="admin-kpi">
              <span className="admin-kpi__value"><Bidi>{papersThisMonth}</Bidi></span>
              <span className="admin-kpi__label">{t('admin.dashboard.kpi.papers')}</span>
            </Link>

            <Link to="/admin/users?role=teacher" className="admin-kpi">
              <span className="admin-kpi__value"><Bidi>{activeTeachers}</Bidi></span>
              <span className="admin-kpi__label">{t('admin.dashboard.kpi.teachers')}</span>
            </Link>
          </div>

          <Card title={t('admin.dashboard.queue.title')}>
            {queue.length === 0 ? (
              <p className="admin-queue__empty">{t('admin.dashboard.queue.empty')}</p>
            ) : (
              <ul className="admin-queue">
                {queue.map((req) => (
                  <li key={req.id} className="admin-queue__row">
                    <span>
                      <span className="admin-queue__name"><Bidi>{req.schoolName}</Bidi></span>
                      <span className="admin-queue__meta">
                        <Bidi>{req.city}</Bidi>
                        {' · '}
                        {formatDate(req.submittedAt, lang)}
                      </span>
                    </span>
                    <Button
                      variant="primary"
                      onClick={() => navigate(`/admin/approvals?selected=${req.id}`)}
                    >
                      {t('admin.dashboard.queue.review')}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t('admin.dashboard.activity.title')}>
            {activity.length === 0 ? (
              <EmptyState
                title={t('admin.dashboard.activity.emptyTitle')}
                body={t('admin.dashboard.activity.emptyBody')}
              >
                <Button variant="secondary" onClick={() => navigate('/admin/audit')}>
                  {t('admin.dashboard.activity.viewAll')}
                </Button>
              </EmptyState>
            ) : (
              <>
                <ul className="admin-activity">
                  {activity.map((event) => (
                    <li key={event.id} className="admin-activity__item">
                      <span className="admin-activity__actor"><Bidi>{event.actorName}</Bidi></span>
                      <span className="admin-activity__action">
                        {t(`admin.dashboard.activityAction.${ACTION_KEY[event.action]}`)}
                      </span>
                      <span className="admin-activity__target"><Bidi>{event.targetLabel}</Bidi></span>
                      <time className="admin-activity__time">
                        <Bidi>{formatDateTime(event.createdAt, lang)}</Bidi>
                      </time>
                    </li>
                  ))}
                </ul>
                <div className="admin-activity__more">
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/admin/audit')}
                    trailingIcon={<ArrowRight size={18} className="flip-rtl" aria-hidden="true" />}
                  >
                    {t('admin.dashboard.activity.viewAll')}
                  </Button>
                </div>
              </>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

export default AdminDashboardPage
