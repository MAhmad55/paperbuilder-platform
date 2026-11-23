import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeader } from '../../shell/PageHeader'
import {
  Banner, Button, Card, EmptyState, IconButton, SearchField, SegmentedControl, Select, Skeleton,
} from '../../design-system'
import { PaperService, PlatformService } from '../../services/mock-store'
import type { Exam } from '../../mock/data'
import { Bidi } from '../../utils/bidi'
import { formatDate } from '../../utils/date'
import type { AppLanguage } from '../../i18n'
import {
  classLabel, demoModeOf, demoSchool, subjectLabel, useSchoolDemo,
} from './shared'
import '../../styles/school.css'

type ViewMode = 'month' | 'list'

/** Exam calendar — Phase 4. Month view + list view of the school's exams,
    each exam linking to its paper(s) where a matching paper exists. */
export function SchoolCalendarPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage
  const demoMode = demoModeOf(params.get('demo'))
  const { loading, loadFailed, retry } = useSchoolDemo(demoMode)
  const forceEmpty = demoMode === 'empty'

  const now = new Date()
  const school = demoSchool()
  const schoolId = school?.id ?? ''

  /* Default month: the month of the next upcoming exam (listExams is
     date-sorted), so the first view shows content; current month otherwise. */
  const initialMonth = (() => {
    const list = schoolId ? PlatformService.listExams({ schoolId }) : []
    if (list.length > 0) {
      const d = new Date(list[0].examDate)
      if (!Number.isNaN(d.getTime())) return { year: d.getFullYear(), month: d.getMonth() }
    }
    return { year: now.getFullYear(), month: now.getMonth() }
  })()
  const [year, setYear] = useState(initialMonth.year)
  const [month, setMonth] = useState(initialMonth.month)
  const [view, setView] = useState<ViewMode>('month')
  const [search, setSearch] = useState('')
  const [termFilter, setTermFilter] = useState('all')

  const exams = useMemo(
    () => (forceEmpty || !schoolId ? [] : PlatformService.listExams({ schoolId })),
    [forceEmpty, schoolId],
  )
  const papers = useMemo(
    () => (forceEmpty || !schoolId ? [] : PaperService.list({ schoolId })),
    [forceEmpty, schoolId],
  )

  const monthExams = useMemo(
    () => exams.filter((e) => {
      const d = new Date(e.examDate)
      return d.getFullYear() === year && d.getMonth() === month
    }),
    [exams, year, month],
  )

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase()
    return exams.filter((e) => {
      if (termFilter !== 'all' && e.term !== termFilter) return false
      if (q) {
        const hay = [classLabel(e.classId), subjectLabel(e.subjectId, 'en'), subjectLabel(e.subjectId, 'ur')]
          .join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [exams, termFilter, search])

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  const monthTitle = new Intl.DateTimeFormat(lang === 'ur' ? 'ur-PK' : 'en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month, 1))

  const weekdayNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(lang === 'ur' ? 'ur-PK' : 'en-US', { weekday: 'short' })
    /* Week starting Sunday (Pakistan weekend is Sat/Sun). */
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2026, 10, 1 + i)))
  }, [lang])

  const days = useMemo(() => {
    const first = new Date(year, month, 1)
    const startDay = first.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrev = new Date(year, month, 0).getDate()
    const cells: { date: Date; inMonth: boolean }[] = []
    for (let i = startDay - 1; i >= 0; i--) {
      cells.push({ date: new Date(year, month - 1, daysInPrev - i), inMonth: false })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month, d), inMonth: true })
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1].date
      cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false })
    }
    return cells
  }, [year, month])

  const examsOn = (date: Date) =>
    monthExams.filter((e) => {
      const d = new Date(e.examDate)
      return d.getFullYear() === date.getFullYear()
        && d.getMonth() === date.getMonth()
        && d.getDate() === date.getDate()
    })

  const matchingPaper = (exam: Exam) =>
    papers.find((p) => p.classId === exam.classId && p.subjectId === exam.subjectId)

  const examTypeKey = (exam: Exam) =>
    exam.examType === 'board-pattern' ? 'boardPattern'
      : exam.examType === 'chapter-test' ? 'chapterTest' : exam.examType

  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`

  return (
    <div className="school">
      <PageHeader title={t('school.calendar.title')} lead={t('school.calendar.lead')} />

      {loading ? (
        <div className="school__skeleton" aria-label={t('common.loading')} role="status">
          <Skeleton variant="rect" height={48} />
          <Skeleton variant="rect" height={320} />
        </div>
      ) : loadFailed ? (
        <div>
          <Banner variant="error" title={t('school.calendar.error.title')}>
            {t('school.calendar.error.body')}
          </Banner>
          <div className="school__retry">
            <Button variant="primary" onClick={retry}>
              {t('common.retry')}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="school-filters">
            <SegmentedControl
              ariaLabel={t('school.calendar.view.label')}
              value={view}
              onChange={(v) => setView(v as ViewMode)}
              options={[
                { value: 'month', label: t('school.calendar.view.month') },
                { value: 'list', label: t('school.calendar.view.list') },
              ]}
            />
            {view === 'list' && (
              <>
                <SearchField
                  value={search}
                  onChange={setSearch}
                  placeholder={t('school.calendar.columns.subject')}
                  ariaLabel={t('school.calendar.columns.subject')}
                />
                <Select
                  label={t('school.calendar.columns.term')}
                  aria-label={t('school.calendar.columns.term')}
                  value={termFilter}
                  onChange={(e) => setTermFilter(e.target.value)}
                  options={[
                    { value: 'all', label: t('school.approvals.filters.all') },
                    { value: 'first', label: t('term.first') },
                    { value: 'second', label: t('term.second') },
                    { value: 'third', label: t('term.third') },
                  ]}
                />
              </>
            )}
          </div>

          {view === 'month' ? (
            <div className="school-cal">
              <div className="school-cal__head">
                <IconButton
                  icon={<ChevronLeft size={20} className="flip-rtl" aria-hidden="true" />}
                  label={t('common.previous')}
                  onClick={() => shiftMonth(-1)}
                />
                <h2><Bidi>{monthTitle}</Bidi></h2>
                <IconButton
                  icon={<ChevronRight size={20} className="flip-rtl" aria-hidden="true" />}
                  label={t('common.next')}
                  onClick={() => shiftMonth(1)}
                />
              </div>
              <p className="school-count" role="status">
                <Bidi>{t('school.calendar.examCount', { count: monthExams.length })}</Bidi>
              </p>
              {monthExams.length === 0 ? (
                <p className="school-empty-text">{t('school.calendar.emptyMonth')}</p>
              ) : null}
              <div className="school-cal__grid">
                {weekdayNames.map((day) => (
                  <div key={day} className="school-cal__weekday">{day}</div>
                ))}
                {days.map(({ date, inMonth }) => {
                  const dayExams = examsOn(date)
                  const isToday = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` === todayKey
                  return (
                    <div
                      key={date.toISOString()}
                      className={[
                        'school-cal__day',
                        !inMonth && 'school-cal__day--other',
                        isToday && 'school-cal__day--today',
                      ].filter(Boolean).join(' ')}
                    >
                      <span className="school-cal__day-num"><Bidi>{date.getDate()}</Bidi></span>
                      {dayExams.map((exam) => {
                        const paper = matchingPaper(exam)
                        return paper ? (
                          <Link
                            key={exam.id}
                            className="school-cal__exam"
                            to={`/school/papers?class=${exam.classId}&subject=${exam.subjectId}`}
                          >
                            {subjectLabel(exam.subjectId, lang)}
                          </Link>
                        ) : (
                          <span key={exam.id} className="school-cal__exam">
                            {subjectLabel(exam.subjectId, lang)}
                          </span>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : filteredList.length === 0 ? (
            <Card>
              <EmptyState
                title={t('school.calendar.emptyList')}
                body={t('school.calendar.emptyMonth')}
              />
            </Card>
          ) : (
            <Card>
              <ul className="school-rows">
                {filteredList.map((exam) => {
                  const paper = matchingPaper(exam)
                  return (
                    <li key={exam.id} className="school-rows__row">
                      <span className="school-rows__main">
                        <span className="school-rows__name">
                          {classLabel(exam.classId)}
                          {' · '}
                          {subjectLabel(exam.subjectId, lang)}
                        </span>
                        <span className="school-rows__meta">
                          <Bidi>{formatDate(exam.examDate, lang)}</Bidi>
                          {' · '}
                          {t(`term.${exam.term}`)}
                          {' · '}
                          {t(`examType.${examTypeKey(exam)}`)}
                        </span>
                      </span>
                      {paper ? (
                        <Button
                          variant="secondary"
                          onClick={() => navigate(`/school/papers?class=${exam.classId}&subject=${exam.subjectId}`)}
                        >
                          {t('school.calendar.paperLink')}
                        </Button>
                      ) : (
                        <span className="school-rows__meta">{t('school.calendar.noPaper')}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

export default SchoolCalendarPage
