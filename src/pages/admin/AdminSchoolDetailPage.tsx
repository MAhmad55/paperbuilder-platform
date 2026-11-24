import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FileText } from 'lucide-react'
import { PageHeader } from '../../shell/PageHeader'
import {
  Banner, Button, Card, Dialog, EmptyState, Meter, Select, Skeleton,
  StatusChip, Table, Tabs, Textarea, Timeline, useToast,
} from '../../design-system'
import type { TableColumn, TimelineItem } from '../../design-system'
import {
  ApprovalRequestService, AuthService, PaperService, PlatformService,
  SchoolService, SUPER_ADMINS, SUBJECTS, CLASSES,
} from '../../services/mock-store'
import type { Person, PlanId } from '../../services/mock-store'
import type { SchoolStatus } from '../../mock/data'
import { Bidi } from '../../utils/bidi'
import { formatDate, formatDateTime } from '../../utils/date'
import type { AppLanguage } from '../../i18n'
import '../../styles/admin-detail.css'

const CHIP_STATUS: Record<SchoolStatus, 'pending' | 'active' | 'suspended' | 'rejected'> = {
  pending: 'pending',
  active: 'active',
  suspended: 'suspended',
  rejected: 'rejected',
}

const AUDIT_KEY: Record<string, string> = {
  'school.approved': 'schoolApproved',
  'school.rejected': 'schoolRejected',
  'school.suspended': 'schoolSuspended',
  'school.reactivated': 'schoolReactivated',
  'school.plan-changed': 'schoolPlanChanged',
  'school.info-requested': 'schoolInfoRequested',
}

const TABS = ['overview', 'users', 'usage', 'plan', 'documents', 'activity']

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

/** School detail — Phase 3 B3. Tabs, suspend/reactivate, change plan. */
export function AdminSchoolDetailPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const { toast } = useToast()

  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage
  const demo = params.get('demo')
  const forceEmpty = demo === 'empty'

  const [loading, setLoading] = useState(demo !== 'error')
  const [demoError, setDemoError] = useState(demo === 'error')
  const [version, setVersion] = useState(0)
  const [tab, setTab] = useState('overview')
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [reactivateOpen, setReactivateOpen] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [planChoice, setPlanChoice] = useState<PlanId | ''>('')

  /* Simulated fetch so the loading state is real (mock data is synchronous). */
  useEffect(() => {
    if (demo === 'loading') return
    setLoading(true)
    const handle = window.setTimeout(() => setLoading(false), 350)
    return () => window.clearTimeout(handle)
  }, [demo, id])

  const actor = AuthService.currentUser() ?? SUPER_ADMINS[0]

  const school = useMemo(() => (id ? SchoolService.get(id) : undefined), [id, version])
  const plans = useMemo(() => PlatformService.listPlans(), [version])
  const plan = plans.find((p) => p.id === school?.plan)
  const teachers = useMemo(
    () => (school && !forceEmpty ? SchoolService.listTeachers(school.id) : []),
    [school, forceEmpty],
  )
  const admins = useMemo(
    () => (school && !forceEmpty ? SchoolService.listAdmins(school.id) : []),
    [school, forceEmpty],
  )
  const users: Person[] = useMemo(() => [...admins, ...teachers], [admins, teachers])
  const papers = useMemo(
    () => (school ? PaperService.list({ schoolId: school.id }) : []),
    [school],
  )
  const papersThisMonth = useMemo(
    () => papers.filter((p) => Date.now() - new Date(p.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000).length,
    [papers],
  )
  const request = useMemo(
    () => (school ? ApprovalRequestService.list().find((r) => r.schoolName === school.name) : undefined),
    [school],
  )
  const documents = forceEmpty ? [] : (request?.documentNames ?? [])
  const audit = useMemo(
    () => (school && !forceEmpty ? PlatformService.listAudit().filter((e) => e.targetId === school.id) : []),
    [school, forceEmpty],
  )

  const retryLoad = () => {
    setDemoError(false)
    setLoading(true)
    window.setTimeout(() => setLoading(false), 350)
  }

  const openSuspend = () => {
    setReason('')
    setReasonError(null)
    setSuspendOpen(true)
  }

  const confirmSuspend = () => {
    if (!school) return
    if (!reason.trim()) {
      setReasonError(t('admin.detail.suspendDialog.reasonRequired'))
      window.setTimeout(() => document.getElementById('suspend-reason')?.focus(), 50)
      return
    }
    const result = SchoolService.setStatus(school.id, 'suspended', actor, reason.trim())
    if (!result.ok) {
      toast({ variant: 'error', message: result.error })
      return
    }
    setSuspendOpen(false)
    setReason('')
    setVersion((v) => v + 1)
    toast({ variant: 'success', message: t('admin.detail.suspendedToast', { reason: reason.trim() }) })
  }

  const confirmReactivate = () => {
    if (!school) return
    const result = SchoolService.setStatus(school.id, 'active', actor)
    if (!result.ok) {
      toast({ variant: 'error', message: result.error })
      return
    }
    setReactivateOpen(false)
    setVersion((v) => v + 1)
    toast({ variant: 'success', message: t('admin.detail.reactivatedToast') })
  }

  const openPlanDialog = () => {
    if (!school) return
    setPlanChoice(school.plan)
    setPlanOpen(true)
  }

  const confirmPlanChange = () => {
    if (!school || !planChoice) return
    const result = SchoolService.setPlan(school.id, planChoice, actor)
    if (!result.ok) {
      toast({ variant: 'error', message: result.error })
      return
    }
    setPlanOpen(false)
    setVersion((v) => v + 1)
    toast({ variant: 'success', message: t('admin.detail.planChanged') })
  }

  const userColumns: TableColumn<Person>[] = [
    {
      id: 'name',
      header: t('admin.detail.users.name'),
      cell: (row) => <Bidi>{row.name}</Bidi>,
    },
    {
      id: 'role',
      header: t('admin.detail.users.role'),
      cell: (row) => t(`roles.${row.role === 'super-admin' ? 'superAdmin' : row.role === 'school-admin' ? 'schoolAdmin' : 'teacher'}`),
    },
    {
      id: 'email',
      header: t('admin.detail.users.email'),
      cell: (row) => <Bidi>{row.email}</Bidi>,
    },
    {
      id: 'status',
      header: t('admin.detail.users.status'),
      cell: (row) =>
        row.status === 'active' ? (
          <StatusChip status="active" />
        ) : (
          t(row.status === 'invited' ? 'admin.detail.users.statusInvited' : 'admin.detail.users.statusInactive')
        ),
    },
    {
      id: 'subjects',
      header: t('admin.detail.users.subjects'),
      cell: (row) => {
        if (row.subjects.length === 0) return t('admin.detail.users.subjectsNone')
        return row.subjects
          .map((sid) => {
            const subject = SUBJECTS.find((s) => s.id === sid)
            return subject ? (lang === 'ur' ? subject.nameUr : subject.nameEn) : sid
          })
          .join(', ')
      },
    },
    {
      id: 'classes',
      header: t('admin.detail.users.classes'),
      cell: (row) => {
        if (row.classes.length === 0) return t('admin.detail.users.subjectsNone')
        return row.classes
          .map((cid) => CLASSES.find((c) => c.id === cid)?.name ?? cid)
          .join(', ')
      },
    },
  ]

  const timelineItems: TimelineItem[] = audit.map((event) => ({
    id: event.id,
    title: t(`admin.detail.activity.audit.${AUDIT_KEY[event.action] ?? event.action}`, {
      defaultValue: event.action,
    }),
    meta: formatDateTime(event.createdAt, lang),
    description: event.reason
      ? `${event.actorName} — ${t('admin.detail.activity.reason', { reason: event.reason })}`
      : event.actorName,
  }))

  const lastActiveLabel =
    !school || school.lastActiveDaysAgo === null
      ? t('admin.detail.overview.lastActiveNever')
      : school.lastActiveDaysAgo === 0
        ? t('admin.detail.overview.lastActiveToday')
        : t('admin.detail.overview.lastActiveDays', { count: school.lastActiveDaysAgo })

  return (
    <div className="admin-detail">
      {loading ? (
        <div className="admin-detail__skeleton" aria-label={t('common.loading')} role="status">
          <Skeleton variant="rect" height={36} width="45%" />
          <Skeleton variant="rect" height={20} width="70%" />
          <Skeleton variant="rect" height={48} />
          <Skeleton variant="rect" height={220} />
        </div>
      ) : demoError ? (
        <div>
          {/* Phase 7: the error state had no page heading — the header
              lives inside the other branches only. A heading keeps the
              error state a real page (and the route announcer working). */}
          <PageHeader
            breadcrumb={[
              { label: t('nav.dashboard'), to: '/admin' },
              { label: t('nav.schools'), to: '/admin/schools' },
            ]}
            title={school?.name ?? t('admin.detail.title')}
          />
          <Banner variant="error" title={t('admin.detail.error.title')}>
            {t('admin.detail.error.body')}
          </Banner>
          <div className="admin-detail__retry">
            <Button variant="primary" onClick={retryLoad}>
              {t('common.retry')}
            </Button>
          </div>
        </div>
      ) : !school ? (
        <div>
          <PageHeader
            breadcrumb={[
              { label: t('nav.dashboard'), to: '/admin' },
              { label: t('nav.schools'), to: '/admin/schools' },
            ]}
            title={t('admin.detail.title')}
          />
          <EmptyState title={t('admin.detail.notFound.title')} body={t('admin.detail.notFound.body')}>
            <Link to="/admin/schools" className="pb-btn pb-btn--primary">
              {t('admin.detail.backToSchools')}
            </Link>
          </EmptyState>
        </div>
      ) : (
        <div>
          <PageHeader
            breadcrumb={[
              { label: t('nav.dashboard'), to: '/admin' },
              { label: t('nav.schools'), to: '/admin/schools' },
              { label: school.name },
            ]}
            title={school.name}
            lead={school.city}
            action={
              school.status === 'suspended' ? (
                <Button variant="primary" onClick={() => setReactivateOpen(true)}>
                  {t('admin.detail.actions.reactivate')}
                </Button>
              ) : school.status === 'active' || school.status === 'pending' ? (
                <Button variant="destructive" onClick={openSuspend}>
                  {t('admin.detail.actions.suspend')}
                </Button>
              ) : undefined
            }
          />

          <Tabs
            tabs={TABS.map((value) => ({ value, label: t(`admin.detail.tabs.${value}`) }))}
            value={tab}
            onChange={setTab}
            ariaLabel={t('admin.detail.title')}
          />

          {tab === 'overview' && (
            <Card className="admin-detail__card" title={t('admin.detail.overview.title')}>
              <dl className="admin-detail__facts">
                <div>
                  <dt>{t('admin.detail.overview.name')}</dt>
                  <dd><Bidi>{school.name}</Bidi></dd>
                </div>
                <div>
                  <dt>{t('admin.detail.overview.city')}</dt>
                  <dd><Bidi>{school.city}</Bidi></dd>
                </div>
                <div>
                  <dt>{t('admin.detail.overview.status')}</dt>
                  <dd><StatusChip status={CHIP_STATUS[school.status]} /></dd>
                </div>
                <div>
                  <dt>{t('admin.detail.overview.plan')}</dt>
                  <dd>{plan ? (lang === 'ur' ? plan.nameUr : plan.name) : <Bidi>{school.plan}</Bidi>}</dd>
                </div>
                <div>
                  <dt>{t('admin.detail.overview.approvalPolicy')}</dt>
                  <dd>
                    {t(
                      school.approvalPolicy === 'required'
                        ? 'admin.detail.overview.policyRequired'
                        : 'admin.detail.overview.policyOptional',
                    )}
                  </dd>
                </div>
                <div>
                  <dt>{t('admin.detail.overview.defaultMedium')}</dt>
                  <dd>{t(`medium.${school.defaultMedium}`)}</dd>
                </div>
                <div>
                  <dt>{t('admin.detail.overview.createdOn')}</dt>
                  <dd>{formatDate(isoDaysAgo(school.createdDaysAgo), lang)}</dd>
                </div>
                <div>
                  <dt>{t('admin.detail.overview.lastActive')}</dt>
                  <dd>{lastActiveLabel}</dd>
                </div>
                <div>
                  <dt>{t('admin.detail.overview.adminContact')}</dt>
                  <dd>
                    {admins.length > 0 ? (
                      <>
                        <Bidi>{admins[0].name}</Bidi>
                        {' · '}
                        <Bidi>{admins[0].email}</Bidi>
                      </>
                    ) : (
                      t('admin.detail.overview.adminNone')
                    )}
                  </dd>
                </div>
              </dl>
            </Card>
          )}

          {tab === 'users' && (
            <Card className="admin-detail__card" title={t('admin.detail.users.title')}>
              <Table
                columns={userColumns}
                data={users}
                ariaLabel={t('admin.detail.users.title')}
                emptyTitle={t('admin.detail.users.emptyTitle')}
                emptyBody={t('admin.detail.users.emptyBody')}
              />
            </Card>
          )}

          {tab === 'usage' && plan && (
            <Card className="admin-detail__card" title={t('admin.detail.usage.title')}>
              <div className="admin-detail__meters">
                <Meter
                  target={typeof plan.maxPapersPerMonth === 'number' ? plan.maxPapersPerMonth : 0}
                  current={papersThisMonth}
                  label={t('admin.detail.usage.papersThisMonth')}
                />
                {plan.maxTeachers === 'unlimited' ? (
                  <p className="admin-detail__unlimited">
                    {t('admin.detail.usage.teachers')}: {t('admin.detail.usage.unlimited')} (
                    <Bidi>{school.teacherCount}</Bidi>)
                  </p>
                ) : (
                  <Meter
                    target={plan.maxTeachers}
                    current={school.teacherCount}
                    label={t('admin.detail.usage.teachers')}
                  />
                )}
                <p className="admin-detail__total">
                  {t('admin.detail.usage.totalPapers')}: <Bidi>{papers.length}</Bidi>
                </p>
              </div>
            </Card>
          )}

          {tab === 'plan' && plan && (
            <Card className="admin-detail__card" title={t('admin.detail.plan.title')}>
              <h3 className="admin-detail__plan-name">
                {lang === 'ur' ? plan.nameUr : plan.name}
              </h3>
              <dl className="admin-detail__facts">
                <div>
                  <dt>{t('admin.detail.plan.teachers')}</dt>
                  <dd>
                    {plan.maxTeachers === 'unlimited' ? (
                      t('admin.detail.plan.unlimited')
                    ) : (
                      <Bidi>{plan.maxTeachers}</Bidi>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>{t('admin.detail.plan.papersPerMonth')}</dt>
                  <dd>
                    {plan.maxPapersPerMonth === 'unlimited' ? (
                      t('admin.detail.plan.unlimited')
                    ) : (
                      <Bidi>{plan.maxPapersPerMonth}</Bidi>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>{t('admin.detail.plan.templates')}</dt>
                  <dd>
                    {plan.maxTemplates === 'unlimited' ? (
                      t('admin.detail.plan.unlimited')
                    ) : (
                      <Bidi>{plan.maxTemplates}</Bidi>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>{t('admin.detail.plan.branding')}</dt>
                  <dd>{t(plan.customBranding ? 'admin.detail.plan.yes' : 'admin.detail.plan.no')}</dd>
                </div>
                <div>
                  <dt>{t('admin.detail.plan.prioritySupport')}</dt>
                  <dd>{t(plan.prioritySupport ? 'admin.detail.plan.yes' : 'admin.detail.plan.no')}</dd>
                </div>
              </dl>
              <div className="admin-detail__actions">
                <Button variant="secondary" onClick={openPlanDialog}>
                  {t('admin.detail.plan.changePlan')}
                </Button>
              </div>
            </Card>
          )}

          {tab === 'documents' && (
            <Card className="admin-detail__card" title={t('admin.detail.documents.title')}>
              {documents.length > 0 ? (
                <ul className="admin-detail__docs">
                  {documents.map((name) => (
                    <li key={name}>
                      <FileText size={18} aria-hidden="true" />
                      <Bidi>{name}</Bidi>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title={t('admin.detail.documents.emptyTitle')}
                  body={t('admin.detail.documents.emptyBody')}
                />
              )}
            </Card>
          )}

          {tab === 'activity' && (
            <Card className="admin-detail__card" title={t('admin.detail.activity.title')}>
              {timelineItems.length > 0 ? (
                <Timeline items={timelineItems} ariaLabel={t('admin.detail.activity.title')} />
              ) : (
                <EmptyState
                  title={t('admin.detail.activity.emptyTitle')}
                  body={t('admin.detail.activity.emptyBody')}
                />
              )}
            </Card>
          )}

          <Dialog
            open={suspendOpen}
            onClose={() => setSuspendOpen(false)}
            title={t('admin.detail.suspendDialog.title')}
            footer={
              <>
                <Button variant="ghost" onClick={() => setSuspendOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button variant="destructive" onClick={confirmSuspend}>
                  {t('admin.detail.suspendDialog.confirm')}
                </Button>
              </>
            }
          >
            <Textarea
              id="suspend-reason"
              label={t('admin.detail.suspendDialog.reasonLabel')}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                if (reasonError) setReasonError(null)
              }}
              error={reasonError}
              required
              rows={3}
            />
          </Dialog>

          <Dialog
            open={reactivateOpen}
            onClose={() => setReactivateOpen(false)}
            title={t('admin.detail.reactivateDialog.title')}
            footer={
              <>
                <Button variant="ghost" onClick={() => setReactivateOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button variant="primary" onClick={confirmReactivate}>
                  {t('admin.detail.reactivateDialog.confirm')}
                </Button>
              </>
            }
          >
            <p>{t('admin.detail.reactivateDialog.body')}</p>
          </Dialog>

          <Dialog
            open={planOpen}
            onClose={() => setPlanOpen(false)}
            title={t('admin.detail.planDialog.title')}
            footer={
              <>
                <Button variant="ghost" onClick={() => setPlanOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button variant="primary" onClick={confirmPlanChange} disabled={!planChoice}>
                  {t('common.save')}
                </Button>
              </>
            }
          >
            <Select
              id="admin-plan-select"
              label={t('admin.detail.planDialog.label')}
              value={planChoice}
              onChange={(e) => setPlanChoice(e.target.value as PlanId)}
              options={plans.map((p) => ({
                value: p.id,
                label: lang === 'ur' ? p.nameUr : p.name,
              }))}
            />
          </Dialog>
        </div>
      )}
    </div>
  )
}

export default AdminSchoolDetailPage
