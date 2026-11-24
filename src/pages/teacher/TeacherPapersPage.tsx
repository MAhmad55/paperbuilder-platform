import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../shell/PageHeader'
import {
  Banner, Button, Card, Dialog, EmptyState, SearchField, Select, Skeleton, Table, useToast,
} from '../../design-system'
import type { TableColumn } from '../../design-system'
import { PaperService } from '../../services/mock-store'
import { currentMarks } from '../../services/mock-store'
import type { Paper, PaperStatus } from '../../mock/data'
import { Bidi } from '../../utils/bidi'
import { formatDate } from '../../utils/date'
import type { AppLanguage } from '../../i18n'
import {
  classLabel, demoModeOf, demoTeacher, paperStatusChip, subjectLabel, useSchoolDemo,
} from './shared'
import { shouldOpenPrintDialog } from './shared'
import '../../styles/teacher.css'

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

/** My papers — Phase 5 (blueprint 4.4.3): the teacher's own library with
    status filter, search, sort, mobile cards; open / duplicate / print /
    archive all act on real mock state. */
export function TeacherPapersPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { toast } = useToast()
  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage
  const demoMode = demoModeOf(params.get('demo'))
  const { loading, loadFailed, retry } = useSchoolDemo(demoMode)
  const forceEmpty = demoMode === 'empty'

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [version, setVersion] = useState(0)
  const [archiveTarget, setArchiveTarget] = useState<Paper | null>(null)

  const teacher = demoTeacher()

  const initialStatus: StatusFilter = (() => {
    const v = params.get('status')
    return (STATUS_FILTERS as string[]).includes(v ?? '') ? (v as StatusFilter) : 'all'
  })()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus)

  const papers = useMemo(
    () => (forceEmpty ? [] : PaperService.list({ teacherId: teacher.id })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [forceEmpty, teacher.id, version],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = papers.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (q) {
        const hay = [p.title, subjectLabel(p.subjectId, 'en'), subjectLabel(p.subjectId, 'ur')]
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
  }, [papers, statusFilter, search, sortKey])

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: papers.length, draft: 0, submitted: 0, 'in-review': 0,
      approved: 0, 'changes-requested': 0, printed: 0, archived: 0,
    }
    for (const p of papers) counts[p.status] += 1
    return counts
  }, [papers])

  const clearFilters = () => {
    setStatusFilter('all')
    setSearch('')
    navigate('/teacher/papers', { replace: true })
  }

  const duplicate = (paper: Paper) => {
    const result = PaperService.duplicate(paper.id, teacher)
    if (!result.ok) {
      toast({ variant: 'error', message: result.error })
      return
    }
    setVersion((v) => v + 1)
    toast({ variant: 'success', message: t('teacher.studio.toasts.duplicated') })
  }

  const print = (paper: Paper) => {
    const result = PaperService.transition(paper.id, 'printed', teacher)
    if (!result.ok) {
      toast({ variant: 'error', message: result.error })
      return
    }
    if (shouldOpenPrintDialog()) window.print()
    setVersion((v) => v + 1)
    toast({ variant: 'success', message: t('teacher.studio.toasts.printed') })
  }

  const confirmArchive = () => {
    if (!archiveTarget) return
    const result = PaperService.transition(archiveTarget.id, 'archived', teacher)
    if (!result.ok) {
      toast({ variant: 'error', message: result.error })
    } else {
      setVersion((v) => v + 1)
    }
    setArchiveTarget(null)
  }

  const columns: TableColumn<Paper>[] = [
    { id: 'title', header: t('common.papers'), sortable: false, cell: (p) => <Bidi>{p.title}</Bidi> },
    { id: 'class', header: t('school.calendar.columns.class'), sortable: false, cell: (p) => classLabel(p.classId) },
    { id: 'subject', header: t('school.calendar.columns.subject'), sortable: false, cell: (p) => subjectLabel(p.subjectId, lang) },
    { id: 'marks', header: t('common.marks'), sortable: false, cell: (p) => <Bidi>{currentMarks(p)} / {p.targetMarks}</Bidi> },
    { id: 'status', header: t('common.status'), sortable: false, cell: (p) => paperStatusChip(p.status) },
    { id: 'date', header: t('common.date'), sortable: false, cell: (p) => formatDate(p.createdAt, lang) },
    {
      id: 'actions', header: t('common.actions'), sortable: false,
      cell: (p) => (
        <div className="teacher-actions">
          <Button variant="secondary" onClick={() => navigate(`/teacher/papers/${p.id}`)}>
            {t('teacher.papers.open')}
          </Button>
          <Button variant="ghost" onClick={() => duplicate(p)}>
            {t('teacher.papers.duplicate')}
          </Button>
          {p.status === 'approved' && (
            <Button variant="ghost" onClick={() => print(p)}>
              {t('teacher.papers.print')}
            </Button>
          )}
          {(p.status === 'approved' || p.status === 'printed') && (
            <Button variant="ghost" onClick={() => setArchiveTarget(p)}>
              {t('teacher.papers.archive')}
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="teacher">
      <PageHeader
        title={t('teacher.papers.title')}
        lead={t('teacher.papers.lead')}
        action={(
          <Button variant="primary" onClick={() => navigate('/teacher/studio')}>
            {t('teacher.dashboard.startNew')}
          </Button>
        )}
      />

      {loading ? (
        <div className="teacher__skeleton" aria-label={t('common.loading')} role="status">
          <Skeleton variant="rect" height={48} />
          <Skeleton variant="rect" height={120} />
          <Skeleton variant="rect" height={220} />
        </div>
      ) : loadFailed ? (
        <div>
          <Banner variant="error" title={t('teacher.papers.error.title')}>
            {t('teacher.papers.error.body')}
          </Banner>
          <div className="teacher__retry">
            <Button variant="primary" onClick={retry}>
              {t('common.retry')}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="teacher-filters">
            <div className="teacher-chips" role="group" aria-label={t('teacher.papers.filters.statusGroupLabel')}>
              {STATUS_FILTERS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className="teacher-chip"
                  aria-pressed={statusFilter === value}
                  onClick={() => setStatusFilter(value)}
                >
                  {value === 'all' ? t('teacher.papers.filters.all') : t(`status.${STATUS_KEY[value as PaperStatus]}`)}
                  {' '}
                  <Bidi>{statusCounts[value]}</Bidi>
                </button>
              ))}
            </div>
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder={t('teacher.papers.filters.searchPlaceholder')}
              ariaLabel={t('teacher.papers.filters.searchPlaceholder')}
            />
            <Select
              label={t('teacher.papers.sort.label')}
              aria-label={t('teacher.papers.sort.label')}
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              options={(['newest', 'oldest', 'title', 'marks'] as SortKey[]).map((k) => ({
                value: k,
                label: t(`teacher.papers.sort.${k}`),
              }))}
            />
          </div>

          <p className="teacher-count" role="status">
            <Bidi>{t('teacher.papers.list.count', { count: filtered.length })}</Bidi>
          </p>

          {filtered.length === 0 ? (
            <Card>
              <EmptyState title={t('teacher.papers.emptyTitle')} body={t('teacher.papers.emptyBody')}>
                <Button variant="secondary" onClick={clearFilters}>
                  {t('common.clear')}
                </Button>
                <Button variant="primary" onClick={() => navigate('/teacher/studio')}>
                  {t('teacher.dashboard.startNew')}
                </Button>
              </EmptyState>
            </Card>
          ) : (
            <>
              <div className="teacher-table-wrap">
                <Table columns={columns} data={filtered} ariaLabel={t('teacher.papers.title')} />
              </div>
              <div className="teacher-cards">
                {filtered.map((p) => (
                  <article key={p.id} className="teacher-card">
                    <div className="teacher-card__head">
                      <span className="teacher-card__name"><Bidi>{p.title}</Bidi></span>
                      {paperStatusChip(p.status)}
                    </div>
                    <div className="teacher-card__rows">
                      <span>{classLabel(p.classId)} · {subjectLabel(p.subjectId, lang)}</span>
                      <span><Bidi>{currentMarks(p)} / {p.targetMarks}</Bidi> · {formatDate(p.createdAt, lang)}</span>
                    </div>
                    <div className="teacher-card__actions">
                      <Button variant="secondary" onClick={() => navigate(`/teacher/papers/${p.id}`)}>
                        {t('teacher.papers.open')}
                      </Button>
                      <Button variant="ghost" onClick={() => duplicate(p)}>
                        {t('teacher.papers.duplicate')}
                      </Button>
                      {p.status === 'approved' && (
                        <Button variant="ghost" onClick={() => print(p)}>
                          {t('teacher.papers.print')}
                        </Button>
                      )}
                      {(p.status === 'approved' || p.status === 'printed') && (
                        <Button variant="ghost" onClick={() => setArchiveTarget(p)}>
                          {t('teacher.papers.archive')}
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
        open={archiveTarget !== null}
        onClose={() => setArchiveTarget(null)}
        title={t('teacher.papers.archiveTitle')}
        footer={(
          <>
            <Button variant="primary" onClick={confirmArchive}>
              {t('teacher.papers.archiveConfirm')}
            </Button>
            <Button variant="ghost" onClick={() => setArchiveTarget(null)}>
              {t('teacher.papers.archiveCancel')}
            </Button>
          </>
        )}
      >
        <p>{t('teacher.papers.archiveBody')}</p>
      </Dialog>
    </div>
  )
}

export default TeacherPapersPage
