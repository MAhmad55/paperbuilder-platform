import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../shell/PageHeader'
import {
  Banner, Button, Card, EmptyState, SearchField, Skeleton, Table, useToast,
} from '../../design-system'
import type { TableColumn } from '../../design-system'
import { PlatformService } from '../../services/mock-store'
import type { SavedQuestion } from '../../mock/data'
import { Bidi } from '../../utils/bidi'
import { formatDate } from '../../utils/date'
import type { AppLanguage } from '../../i18n'
import {
  chapterLabel, demoModeOf, demoTeacher, subjectLabel, useSchoolDemo,
} from './shared'
import '../../styles/teacher.css'

type TypeFilter = 'all' | 'mcq' | 'short' | 'long'

const TYPE_FILTERS: TypeFilter[] = ['all', 'mcq', 'short', 'long']

const TYPE_KEY: Record<'mcq' | 'short' | 'long', string> = {
  mcq: 'copy.paper.optionMcq',
  short: 'copy.paper.optionShort',
  long: 'copy.paper.optionLong',
}

/** Saved questions — Phase 5 (blueprint 4.4.6): questions bookmarked
    while building, with search, type filter and a designed empty state
    that leads back to the Studio (never a dead end). */
export function TeacherSavedQuestionsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { toast } = useToast()
  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage
  const demoMode = demoModeOf(params.get('demo'))
  const { loading, loadFailed, retry } = useSchoolDemo(demoMode)
  const forceEmpty = demoMode === 'empty'

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [version, setVersion] = useState(0)

  const teacher = demoTeacher()

  const questions = useMemo(
    () => (forceEmpty ? [] : PlatformService.listSavedQuestions(teacher.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [forceEmpty, teacher.id, version],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return questions.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false
      if (q) {
        const hay = [item.text, subjectLabel(item.subjectId, 'en'), subjectLabel(item.subjectId, 'ur'), chapterLabel(item.chapterId, lang)]
          .join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [questions, typeFilter, search, lang])

  const remove = (item: SavedQuestion) => {
    PlatformService.removeSavedQuestion(teacher.id, item.id)
    setVersion((v) => v + 1)
    toast({ variant: 'success', message: t('teacher.questions.remove') })
  }

  const columns: TableColumn<SavedQuestion>[] = [
    { id: 'text', header: t('common.questions'), sortable: false, cell: (q) => <Bidi>{q.text}</Bidi> },
    { id: 'type', header: t('common.type'), sortable: false, cell: (q) => t(TYPE_KEY[q.type]) },
    { id: 'subject', header: t('school.calendar.columns.subject'), sortable: false, cell: (q) => subjectLabel(q.subjectId, lang) },
    { id: 'chapter', header: t('common.chapters'), sortable: false, cell: (q) => chapterLabel(q.chapterId, lang) },
    { id: 'marks', header: t('common.marks'), sortable: false, cell: (q) => <Bidi>{q.marks}</Bidi> },
    { id: 'date', header: t('common.date'), sortable: false, cell: (q) => formatDate(q.createdAt, lang) },
    {
      id: 'actions', header: t('common.actions'), sortable: false,
      cell: (q) => (
        <div className="teacher-actions">
          <Button variant="secondary" onClick={() => navigate('/teacher/studio')}>
            {t('teacher.questions.useInStudio')}
          </Button>
          <Button variant="ghost" onClick={() => remove(q)}>
            {t('teacher.questions.remove')}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="teacher">
      <PageHeader
        title={t('teacher.questions.title')}
        lead={t('teacher.questions.lead')}
        action={(
          <Button variant="primary" onClick={() => navigate('/teacher/studio')}>
            {t('teacher.questions.goStudio')}
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
          <Banner variant="error" title={t('teacher.questions.error.title')}>
            {t('teacher.questions.error.body')}
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
            <div className="teacher-chips" role="group" aria-label={t('teacher.questions.filters.typeGroupLabel')}>
              {TYPE_FILTERS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className="teacher-chip"
                  aria-pressed={typeFilter === value}
                  onClick={() => setTypeFilter(value)}
                >
                  {value === 'all' ? t('teacher.questions.filters.all') : t(TYPE_KEY[value as 'mcq' | 'short' | 'long'])}
                </button>
              ))}
            </div>
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder={t('teacher.questions.filters.searchPlaceholder')}
              ariaLabel={t('teacher.questions.filters.searchPlaceholder')}
            />
          </div>

          <p className="teacher-count" role="status">
            <Bidi>{t('teacher.questions.list.count', { count: filtered.length })}</Bidi>
          </p>

          {filtered.length === 0 ? (
            <Card>
              <EmptyState title={t('teacher.questions.emptyTitle')} body={t('teacher.questions.emptyBody')}>
                <Button variant="primary" onClick={() => navigate('/teacher/studio')}>
                  {t('teacher.questions.goStudio')}
                </Button>
              </EmptyState>
            </Card>
          ) : (
            <>
              <div className="teacher-table-wrap">
                <Table columns={columns} data={filtered} ariaLabel={t('teacher.questions.title')} />
              </div>
              <div className="teacher-cards">
                {filtered.map((q) => (
                  <article key={q.id} className="teacher-card">
                    <div className="teacher-card__head">
                      <span className="teacher-card__name"><Bidi>{q.text}</Bidi></span>
                      <span>{t(TYPE_KEY[q.type])}</span>
                    </div>
                    <div className="teacher-card__rows">
                      <span>{subjectLabel(q.subjectId, lang)} · {chapterLabel(q.chapterId, lang)}</span>
                      <span><Bidi>{q.marks}</Bidi> · {formatDate(q.createdAt, lang)}</span>
                    </div>
                    <div className="teacher-card__actions">
                      <Button variant="secondary" onClick={() => navigate('/teacher/studio')}>
                        {t('teacher.questions.useInStudio')}
                      </Button>
                      <Button variant="ghost" onClick={() => remove(q)}>
                        {t('teacher.questions.remove')}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default TeacherSavedQuestionsPage
