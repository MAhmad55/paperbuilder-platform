import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Download } from 'lucide-react'
import {
  Banner,
  Button,
  Card,
  DatePicker,
  EmptyState,
  Pagination,
  Select,
  Skeleton,
  Table,
  useToast,
  type TableColumn,
} from '../../design-system'
import { PageHeader } from '../../shell/PageHeader'
import { PlatformService, SchoolService } from '../../services/mock-store'
import type { AuditEvent } from '../../services/mock-store'

/** AuditAction is declared in mock/data but not re-exported by mock-store;
    derive it from the event instead of touching the service. */
type AuditAction = AuditEvent['action']
import { Bidi } from '../../utils/bidi'
import { formatDateTime } from '../../utils/date'
import type { AppLanguage } from '../../i18n'
import '../../styles/admin-audit.css'

const PAGE_SIZE = 10

/** All audit actions in canonical order; the filter lists the ones present in the data. */
const ALL_ACTIONS: AuditAction[] = [
  'school.approved',
  'school.rejected',
  'school.suspended',
  'school.reactivated',
  'school.plan-changed',
  'school.info-requested',
  'paper.approved',
  'paper.submitted',
  'paper.printed',
  'teacher.invited',
  'user.invited',
  'user.deactivated',
  'plan.limit-changed',
  'template.created',
  'announcement.published',
  'announcement.scheduled',
]

function isAuditAction(value: string | null): value is AuditAction {
  return value !== null && (ALL_ACTIONS as string[]).includes(value)
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

/** Audit log — Phase 3 B9. Filterable, paginated, exportable table, newest first. */
export function AdminAuditPage() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const [params, setParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [loadCycle, setLoadCycle] = useState(0)
  const [errorDismissed, setErrorDismissed] = useState(false)

  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage
  const demo = params.get('demo')
  const initialAction = isAuditAction(params.get('action')) ? params.get('action') as AuditAction : ''

  const [actorFilter, setActorFilter] = useState('')
  const [actionFilter, setActionFilter] = useState<AuditAction | ''>(initialAction)
  const [schoolFilter, setSchoolFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)

  /* Simulated fetch so the loading state is real (mock data is synchronous). */
  useEffect(() => {
    if (demo === 'loading') return
    setLoading(true)
    const handle = window.setTimeout(() => setLoading(false), 350)
    return () => window.clearTimeout(handle)
  }, [demo, loadCycle])

  const events: AuditEvent[] = useMemo(() => {
    if (demo === 'empty') return []
    return PlatformService.listAudit()
  }, [demo])

  const schools = useMemo(() => SchoolService.list(), [])

  const actors = useMemo(
    () => [...new Set(events.map((e) => e.actorName))].sort((a, b) => a.localeCompare(b)),
    [events],
  )

  /* Distinct actions present in the data, in canonical order — plus the
     ?action= pre-filter, so the select never holds a value it cannot show. */
  const actionOptions = useMemo(() => {
    const present = new Set(events.map((e) => e.action))
    if (initialAction) present.add(initialAction)
    return ALL_ACTIONS.filter((a) => present.has(a))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events])

  const filtersActive =
    actorFilter !== '' || actionFilter !== '' || schoolFilter !== '' || fromDate !== '' || toDate !== ''

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (actorFilter && e.actorName !== actorFilter) return false
      if (actionFilter && e.action !== actionFilter) return false
      if (schoolFilter && !(e.targetType === 'school' && e.targetId === schoolFilter)) return false
      const day = e.createdAt.slice(0, 10)
      if (fromDate && day < fromDate) return false
      if (toDate && day > toDate) return false
      return true
    })
  }, [events, actorFilter, actionFilter, schoolFilter, fromDate, toDate])

  /* Any filter change returns to the first page. */
  useEffect(() => {
    setPage(1)
  }, [actorFilter, actionFilter, schoolFilter, fromDate, toDate])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const clearFilters = () => {
    setActorFilter('')
    setActionFilter('')
    setSchoolFilter('')
    setFromDate('')
    setToDate('')
    const next = new URLSearchParams(params)
    next.delete('action')
    setParams(next, { replace: true })
  }

  const exportCsv = () => {
    const header = [
      t('admin.audit.columns.date'),
      t('admin.audit.columns.actor'),
      t('admin.audit.columns.action'),
      t('admin.audit.columns.target'),
    ].map(csvCell).join(',')
    const lines = filtered.map((e) =>
      [
        formatDateTime(e.createdAt, lang),
        e.actorName,
        t(`admin.audit.actions.${e.action}`),
        `${e.targetLabel} (${t(`admin.audit.targetTypes.${e.targetType}`)})`,
      ].map(csvCell).join(','),
    )
    /* BOM so Excel opens Urdu text correctly. */
    const blob = new Blob(['\uFEFF' + [header, ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const today = new Date().toISOString().slice(0, 10)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-log-${today}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast({ variant: 'success', message: t('admin.audit.exported', { count: filtered.length }) })
  }

  const retryLoad = () => {
    setErrorDismissed(true)
    setLoadCycle((c) => c + 1)
  }

  const columns: TableColumn<AuditEvent>[] = [
    {
      id: 'date',
      header: t('admin.audit.columns.date'),
      cell: (row) => <Bidi>{formatDateTime(row.createdAt, lang)}</Bidi>,
    },
    {
      id: 'actor',
      header: t('admin.audit.columns.actor'),
      cell: (row) => <Bidi>{row.actorName}</Bidi>,
    },
    {
      id: 'action',
      header: t('admin.audit.columns.action'),
      cell: (row) => t(`admin.audit.actions.${row.action}`),
    },
    {
      id: 'target',
      header: t('admin.audit.columns.target'),
      cell: (row) => (
        <span>
          <span className="admin-audit__target-label"><Bidi>{row.targetLabel}</Bidi></span>
          <span className="admin-audit__target-type">{t(`admin.audit.targetTypes.${row.targetType}`)}</span>
        </span>
      ),
    },
  ]

  const showError = !loading && demo === 'error' && !errorDismissed

  return (
    <div className="admin-audit">
      <PageHeader
        title={t('admin.audit.title')}
        lead={t('admin.audit.lead')}
        action={
          <Button
            variant="secondary"
            size="lg"
            leadingIcon={<Download size={18} aria-hidden="true" />}
            onClick={exportCsv}
            disabled={loading || showError || filtered.length === 0}
          >
            {t('admin.audit.export')}
          </Button>
        }
      />

      {loading ? (
        <div className="admin-audit__skeleton" aria-label={t('common.loading')} role="status">
          <Skeleton variant="rect" height={36} width="55%" />
          <Skeleton variant="rect" height={120} />
          <Skeleton variant="rect" height={320} />
        </div>
      ) : showError ? (
        <div className="admin-audit__error">
          <Banner variant="error" title={t('admin.audit.errorTitle')}>
            {t('admin.audit.errorBody')}
          </Banner>
          <Button variant="primary" size="lg" onClick={retryLoad}>
            {t('common.retry')}
          </Button>
        </div>
      ) : (
        <>
          <section className="admin-audit__filters" aria-label={t('admin.audit.filtersTitle')}>
            <h2 className="admin-audit__filters-title">{t('admin.audit.filtersTitle')}</h2>
            <div className="admin-audit__filters-grid">
              <Select
                id="audit-actor"
                label={t('admin.audit.actorLabel')}
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
                options={[
                  { value: '', label: t('admin.audit.allActors') },
                  ...actors.map((a) => ({ value: a, label: a })),
                ]}
              />
              <Select
                id="audit-action"
                label={t('admin.audit.actionLabel')}
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value as AuditAction | '')}
                options={[
                  { value: '', label: t('admin.audit.allActions') },
                  ...actionOptions.map((a) => ({ value: a, label: t(`admin.audit.actions.${a}`) })),
                ]}
              />
              <Select
                id="audit-school"
                label={t('admin.audit.schoolLabel')}
                value={schoolFilter}
                onChange={(e) => setSchoolFilter(e.target.value)}
                options={[
                  { value: '', label: t('admin.audit.allSchools') },
                  ...schools.map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
              <DatePicker
                id="audit-from"
                label={t('admin.audit.fromLabel')}
                value={fromDate}
                onChange={setFromDate}
              />
              <DatePicker
                id="audit-to"
                label={t('admin.audit.toLabel')}
                value={toDate}
                onChange={setToDate}
              />
              <div className="admin-audit__filters-actions">
                <Button variant="secondary" size="lg" onClick={clearFilters} disabled={!filtersActive}>
                  {t('admin.audit.clearFilters')}
                </Button>
              </div>
            </div>
          </section>

          <p className="admin-audit__count" role="status">
            <Bidi>{t('admin.audit.results', { count: filtered.length })}</Bidi>
          </p>

          {filtered.length === 0 ? (
            <Card className="admin-audit__empty">
              <EmptyState
                title={events.length === 0 ? t('admin.audit.emptyTitle') : t('admin.audit.noResultsTitle')}
                body={events.length === 0 ? t('admin.audit.emptyBody') : t('admin.audit.noResultsBody')}
              >
                {filtersActive && (
                  <Button variant="primary" size="lg" onClick={clearFilters}>
                    {t('admin.audit.clearFilters')}
                  </Button>
                )}
              </EmptyState>
            </Card>
          ) : (
            <Card className="admin-audit__table-card">
              <Table
                columns={columns}
                data={pageRows}
                ariaLabel={t('admin.audit.title')}
              />
              <div className="admin-audit__pagination">
                <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

export default AdminAuditPage
