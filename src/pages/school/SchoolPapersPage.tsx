import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../shell/PageHeader'
import {
  Banner, Button, Card, Dialog, EmptyState, SearchField, Select, Skeleton, Table,
} from '../../design-system'
import type { TableColumn } from '../../design-system'
import { PaperService } from '../../services/mock-store'
import { currentMarks } from '../../services/mock-store'
import type { Paper, PaperStatus } from '../../mock/data'
import { Bidi } from '../../utils/bidi'
import { formatDate } from '../../utils/date'
import type { AppLanguage } from '../../i18n'
import {
  classLabel, demoModeOf, demoSchool, PaperPreview, paperStatusChip, subjectLabel, teacherName,
  useSchoolDemo,
} from './shared'
import '../../styles/school.css'

type StatusFilter = 'all' | PaperStatus
type SortKey = 'newest' | 'oldest' | 'title' | 'marks'

const STATUS_FILTERS: StatusFilter[] = [
  'all', 'draft', 'submitted', 'in-review', 'approved', 'changes-requested', 'printed', 'archived',
]

const STATUS_KEY: Record<PaperStatus, string> = {
  draft: 'draft',
  submitted: 'submitted',
  'in-review': 'inReview',
  approved: 'approved',
  'changes-requested': 'changesRequested',
  printed: 'printed',
  archived: 'archived',
}

/** All papers — Phase 4. School-wide library with status filter chips,
    search, sort and mobile cards. */
export function SchoolPapersPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage
  const demoMode = demoModeOf(params.get('demo'))
  const { loading, loadFailed, retry } = useSchoolDemo(demoMode)
  const forceEmpty = demoMode === 'empty'

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [preview, setPreview] = useState<Paper | null>(null)

  const school = demoSchool()
  const schoolId = school?.id ?? ''

  /* Deep links from the calendar pre-filter by class and subject. */
  const initialStatus: StatusFilter = (() => {
    const v = params.get('status')
    return (STATUS_FILTERS as string[]).includes(v ?? '') ? (v as StatusFilter) : 'all'
  })()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus)
  const classParam = params.get('class')
  const subjectParam = params.get('subject')

  const papers = useMemo(
    () => (forceEmpty || !schoolId ? [] : PaperService.list({ schoolId })),
    [forceEmpty, schoolId],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = papers.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (classParam && p.classId !== classParam) return false
      if (subjectParam && p.subjectId !== subjectParam) return false
      if (q) {
        const hay = [p.title, subjectLabel(p.subjectId, 'en'), subjectLabel(p.subjectId, 'ur'), teacherName(p.teacherId)]
          .join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    switch (sortKey) {
      case 'newest': return [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      case 'oldest': return [...rows].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      case 'title': return [...rows].sort((a, b) => a.title.localeCompare(b.title))
      case 'marks': return [...rows].sort((a, b) => b.targetMarks - a.targetMarks)
    }
  }, [papers, statusFilter, classParam, subjectParam, search, sortKey])

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: papers.length,
      draft: 0,
      submitted: 0,
      'in-review': 0,
      approved: 0,
      'changes-requested': 0,
      printed: 0,
      archived: 0,
    }
    for (const p of papers) counts[p.status] += 1
    return counts
  }, [papers])

  const clearFilters = () => {
    setStatusFilter('all')
    setSearch('')
    navigate('/school/papers', { replace: true })
  }

  const columns: TableColumn<Paper>[] = [
    {
      id: 'title',
      header: t('common.papers'),
      sortable: false,
      cell: (p) => <Bidi>{p.title}</Bidi>,
    },
    {
      id: 'class',
      header: t('school.calendar.columns.class'),
      sortable: false,
      cell: (p) => classLabel(p.classId),
    },
    {
      id: 'subject',
      header: t('school.calendar.columns.subject'),
      sortable: false,
      cell: (p) => subjectLabel(p.subjectId, lang),
    },
    {
      id: 'teacher',
      header: t('school.approvals.details.teacher'),
      sortable: false,
      cell: (p) => <Bidi>{teacherName(p.teacherId)}</Bidi>,
    },
    {
      id: 'marks',
      header: t('common.marks'),
      sortable: false,
      cell: (p) => <Bidi>{currentMarks(p)} / {p.targetMarks}</Bidi>,
    },
    {
      id: 'status',
      header: t('common.status'),
      sortable: false,
      cell: (p) => paperStatusChip(p.status),
    },
    {
      id: 'date',
      header: t('common.date'),
      sortable: false,
      cell: (p) => formatDate(p.createdAt, lang),
    },
    {
      id: 'actions',
      header: t('common.actions'),
      sortable: false,
      cell: (p) => (p.status === 'submitted' || p.status === 'in-review' ? (
        <Button variant="primary" onClick={() => navigate(`/school/approvals?selected=${p.id}`)}>
          {t('school.papers.review')}
        </Button>
      ) : (
        <Button variant="secondary" onClick={() => setPreview(p)}>
          {t('school.papers.view')}
        </Button>
      )),
    },
  ]

  return (
    <div className="school">
      <PageHeader title={t('school.papers.title')} lead={t('school.papers.lead')} />

      {loading ? (
        <div className="school__skeleton" aria-label={t('common.loading')} role="status">
          <Skeleton variant="rect" height={48} />
          <Skeleton variant="rect" height={120} />
          <Skeleton variant="rect" height={220} />
        </div>
      ) : loadFailed ? (
        <div>
          <Banner variant="error" title={t('school.papers.error.title')}>
            {t('school.papers.error.body')}
          </Banner>
          <div className="school__retry">
            <Button variant="primary" onClick={retry}>
              {t('common.retry')}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="school-filters">
            <div
              className="school-chips"
              role="group"
              aria-label={t('school.papers.filters.statusGroupLabel')}
            >
              {STATUS_FILTERS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className="school-chip"
                  aria-pressed={statusFilter === value}
                  onClick={() => setStatusFilter(value)}
                >
                  {value === 'all' ? t('school.papers.filters.all') : t(`status.${STATUS_KEY[value as PaperStatus]}`)}
                  {' '}
                  <Bidi>{statusCounts[value]}</Bidi>
                </button>
              ))}
            </div>
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder={t('school.papers.filters.searchPlaceholder')}
              ariaLabel={t('school.papers.filters.searchPlaceholder')}
            />
            <Select
              label={t('school.papers.sort.label')}
              aria-label={t('school.papers.sort.label')}
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              options={(['newest', 'oldest', 'title', 'marks'] as SortKey[]).map((k) => ({
                value: k,
                label: t(`school.papers.sort.${k}`),
              }))}
            />
          </div>

          <p className="school-count" role="status">
            <Bidi>{t('school.papers.list.count', { count: filtered.length })}</Bidi>
          </p>

          {filtered.length === 0 ? (
            <Card>
              <EmptyState
                title={t('school.papers.emptyTitle')}
                body={t('school.papers.emptyBody')}
              >
                <Button variant="secondary" onClick={clearFilters}>
                  {t('common.clear')}
                </Button>
              </EmptyState>
            </Card>
          ) : (
            <>
              <div className="school-table-wrap">
                <Table
                  columns={columns}
                  data={filtered}
                  ariaLabel={t('school.papers.title')}
                />
              </div>
              <div className="school-cards">
                {filtered.map((p) => (
                  <article key={p.id} className="school-card">
                    <div className="school-card__head">
                      <span className="school-card__name"><Bidi>{p.title}</Bidi></span>
                      {paperStatusChip(p.status)}
                    </div>
                    <div className="school-card__rows">
                      <span>
                        {classLabel(p.classId)}
                        {' · '}
                        {subjectLabel(p.subjectId, lang)}
                      </span>
                      <span><Bidi>{teacherName(p.teacherId)}</Bidi></span>
                      <span><Bidi>{currentMarks(p)} / {p.targetMarks}</Bidi> · {formatDate(p.createdAt, lang)}</span>
                    </div>
                    <div className="school-card__actions">
                      {p.status === 'submitted' || p.status === 'in-review' ? (
                        <Button variant="primary" onClick={() => navigate(`/school/approvals?selected=${p.id}`)}>
                          {t('school.papers.review')}
                        </Button>
                      ) : (
                        <Button variant="secondary" onClick={() => setPreview(p)}>
                          {t('school.papers.view')}
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <Dialog
        open={preview !== null}
        onClose={() => setPreview(null)}
        title={preview ? preview.title : ''}
        size="lg"
        footer={
          <Button variant="ghost" onClick={() => setPreview(null)}>
            {t('school.papers.preview.close')}
          </Button>
        }
      >
        {preview && <PaperPreview paper={preview} schoolName={school?.name ?? ''} />}
      </Dialog>
    </div>
  )
}

export default SchoolPapersPage
