import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Database } from 'lucide-react'
import { PageHeader } from '../../shell/PageHeader'
import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  SearchField,
  Select,
  Skeleton,
  StatusChip,
  Table,
  useToast,
  type TableColumn,
} from '../../design-system'
import { QuestionBankProvider } from '../../services/mock-store'
import type { SubjectDef } from '../../mock/data'
import { Bidi } from '../../utils/bidi'
import '../../styles/admin-bank.css'

interface SubjectRow {
  id: string
  nameEn: string
  nameUr: string
  chapters: number
  mcq: number
  short: number
  long: number
  total: number
}

function buildRows(subjects: SubjectDef[]): SubjectRow[] {
  return subjects.map((subject) => {
    const chapters = QuestionBankProvider.getChapters(subject.id)
    const mcq = chapters.reduce((sum, c) => sum + c.counts.mcq, 0)
    const short = chapters.reduce((sum, c) => sum + c.counts.short, 0)
    const long = chapters.reduce((sum, c) => sum + c.counts.long, 0)
    return {
      id: subject.id,
      nameEn: subject.nameEn,
      nameUr: subject.nameUr,
      chapters: chapters.length,
      mcq,
      short,
      long,
      total: mcq + short + long,
    }
  })
}

/** Question bank library — Phase 3 B6. Connect empty state, then coverage by subject. */
export function AdminBankPage() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const [params] = useSearchParams()
  const demo = params.get('demo')
  const lang = i18n.language === 'ur' ? 'ur' : 'en'

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [connected, setConnected] = useState(() => params.get('source') === 'connected')
  const [classId, setClassId] = useState(() => QuestionBankProvider.getClasses()[0]?.id ?? '')
  const [query, setQuery] = useState('')

  /* Simulated fetch so the loading state is real (mock data is synchronous). */
  useEffect(() => {
    setLoading(true)
    setLoadError(false)
    if (demo === 'loading') return
    const handle = window.setTimeout(() => {
      if (demo === 'error' && attempt === 0) setLoadError(true)
      setLoading(false)
    }, 350)
    return () => window.clearTimeout(handle)
  }, [demo, attempt])

  const classes = useMemo(() => QuestionBankProvider.getClasses(), [])
  const subjects = useMemo(
    () => (demo === 'empty' ? [] : QuestionBankProvider.getSubjects()),
    [demo],
  )
  const rows = useMemo(() => buildRows(subjects), [subjects])

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => row.nameEn.toLowerCase().includes(q) || row.nameUr.includes(q))
  }, [rows, query])

  const totalQuestions = filteredRows.reduce((sum, row) => sum + row.total, 0)
  const selectedClass = classes.find((c) => c.id === classId)

  const subjectName = (row: SubjectRow) => (lang === 'ur' ? row.nameUr : row.nameEn)

  const reimport = (row: SubjectRow) => {
    toast({ variant: 'success', message: t('admin.bank.reimportToast', { subject: subjectName(row) }) })
  }

  const columns: TableColumn<SubjectRow>[] = [
    {
      id: 'subject',
      header: t('admin.bank.columns.subject'),
      cell: (row) => <Bidi>{subjectName(row)}</Bidi>,
    },
    {
      id: 'chapters',
      header: t('admin.bank.columns.chapters'),
      align: 'end',
      cell: (row) => <Bidi>{row.chapters}</Bidi>,
    },
    {
      id: 'mcq',
      header: t('admin.bank.columns.mcq'),
      align: 'end',
      cell: (row) => <Bidi>{row.mcq}</Bidi>,
    },
    {
      id: 'short',
      header: t('admin.bank.columns.short'),
      align: 'end',
      cell: (row) => <Bidi>{row.short}</Bidi>,
    },
    {
      id: 'long',
      header: t('admin.bank.columns.long'),
      align: 'end',
      cell: (row) => <Bidi>{row.long}</Bidi>,
    },
    {
      id: 'total',
      header: t('admin.bank.columns.total'),
      align: 'end',
      cell: (row) => <Bidi>{row.total}</Bidi>,
    },
    {
      id: 'status',
      header: t('admin.bank.columns.status'),
      cell: (row) =>
        row.chapters > 0 ? (
          <StatusChip status="approved" label={t('admin.bank.imported')} />
        ) : (
          <Badge tone="neutral">{t('admin.bank.notImported')}</Badge>
        ),
    },
    {
      id: 'actions',
      header: t('admin.bank.columns.actions'),
      sortable: false,
      cell: (row) => (
        <Button variant="secondary" onClick={() => reimport(row)}>
          {t('admin.bank.reimport')}
        </Button>
      ),
    },
  ]

  return (
    <div className="admin-bank">
      <PageHeader
        breadcrumb={[{ label: t('nav.dashboard'), to: '/admin' }]}
        title={t('admin.bank.title')}
        lead={t('admin.bank.lead')}
        action={
          connected ? (
            <Button variant="ghost" onClick={() => setConnected(false)}>
              {t('admin.bank.disconnect')}
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="admin-bank__skeleton" aria-label={t('common.loading')} role="status">
          <Skeleton variant="rect" height={36} width="45%" />
          <Skeleton variant="rect" height={20} width="70%" />
          <Skeleton variant="rect" height={48} />
          <Skeleton variant="rect" height={220} />
        </div>
      ) : loadError ? (
        <div className="admin-bank__error">
          <Banner variant="error" title={t('admin.bank.errorTitle')}>
            {t('admin.bank.errorBody')}
          </Banner>
          <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
            {t('common.retry')}
          </Button>
        </div>
      ) : !connected ? (
        <Card>
          <EmptyState
            icon={<Database size={26} aria-hidden="true" />}
            title={t('admin.bank.connectTitle')}
            body={t('admin.bank.connectBody')}
          >
            <Button variant="primary" onClick={() => setConnected(true)}>
              {t('admin.bank.connect')}
            </Button>
          </EmptyState>
          <p className="admin-bank__mock-note">{t('admin.bank.mockNote')}</p>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState title={t('admin.bank.emptyTitle')} body={t('admin.bank.emptyBody')} />
        </Card>
      ) : (
        <>
          <div className="admin-bank__controls">
            <Select
              id="bank-class"
              label={t('admin.bank.classLabel')}
              value={classId}
              options={classes.map((c) => ({ value: c.id, label: c.name }))}
              onChange={(e) => setClassId(e.target.value)}
            />
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder={t('admin.bank.searchPlaceholder')}
              clearable
            />
          </div>
          <p className="admin-bank__note">
            {selectedClass && (
              <>
                <Bidi>{selectedClass.name}</Bidi>
                {' · '}
              </>
            )}
            {t('admin.bank.classNote')}
          </p>
          <p className="admin-bank__summary">
            {t('admin.bank.summary', { total: totalQuestions, subjects: filteredRows.length })}
          </p>
          <Card>
            <Table
              columns={columns}
              data={filteredRows}
              ariaLabel={t('admin.bank.title')}
              emptyTitle={t('admin.bank.noResultsTitle')}
              emptyBody={t('admin.bank.noResultsBody')}
            />
          </Card>
        </>
      )}
    </div>
  )
}

export default AdminBankPage
