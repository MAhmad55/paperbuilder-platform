import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { PageHeader } from '../../shell/PageHeader'
import { Banner, Button, Card, Skeleton } from '../../design-system'
import { PaperService, PlatformService, SchoolService } from '../../services/mock-store'
import { Bidi } from '../../utils/bidi'
import { formatDate } from '../../utils/date'
import type { AppLanguage } from '../../i18n'
import {
  classLabel, demoModeOf, demoSchool, paperStatusChip, subjectLabel, useSchoolDemo,
} from './shared'
import '../../styles/school.css'

/** School Admin dashboard — Phase 4. Papers waiting for approval are the primary KPI. */
export function SchoolDashboardPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage
  const demoMode = demoModeOf(params.get('demo'))
  const { loading, loadFailed, retry } = useSchoolDemo(demoMode)
  const isEmptyDemo = demoMode === 'empty'

  const school = demoSchool()
  const schoolId = school?.id ?? ''

  const papers = useMemo(
    () => (isEmptyDemo || !schoolId ? [] : PaperService.list({ schoolId })),
    [isEmptyDemo, schoolId],
  )
  const waiting = useMemo(
    () => papers.filter((p) => p.status === 'submitted' || p.status === 'in-review'),
    [papers],
  )
  const queue = useMemo(() => waiting.slice(0, 3), [waiting])
  const exams = useMemo(
    () => (isEmptyDemo || !schoolId ? [] : PlatformService.listExams({ schoolId }).slice(0, 3)),
    [isEmptyDemo, schoolId],
  )
  const examsCount = useMemo(
    () => (isEmptyDemo || !schoolId ? 0 : PlatformService.listExams({ schoolId }).length),
    [isEmptyDemo, schoolId],
  )
  const activeTeachers = useMemo(
    () => (isEmptyDemo || !schoolId
      ? 0
      : SchoolService.listTeachers(schoolId).filter((u) => u.status === 'active').length),
    [isEmptyDemo, schoolId],
  )
  const papersThisMonth = useMemo(() => {
    if (isEmptyDemo) return 0
    const now = new Date()
    return papers.filter((p) => {
      const d = new Date(p.createdAt)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    }).length
  }, [isEmptyDemo, papers])
  const recent = useMemo(
    () => [...papers].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [papers],
  )

  return (
    <div className="school">
      <PageHeader title={t('nav.dashboard')} lead={t('school.dashboard.lead')} />

      {loading ? (
        <div className="school__skeleton" aria-label={t('common.loading')} role="status">
          <div className="school-kpis">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="school-kpi">
                <Skeleton variant="rect" height={36} width="40%" />
                <Skeleton variant="rect" height={20} width="70%" />
              </div>
            ))}
          </div>
          <Card>
            <Skeleton variant="rect" height={24} width="35%" />
            <Skeleton variant="rect" height={56} count={3} />
          </Card>
        </div>
      ) : loadFailed ? (
        <div>
          <Banner variant="error" title={t('school.dashboard.error.title')}>
            {t('school.dashboard.error.body')}
          </Banner>
          <div className="school__retry">
            <Button variant="primary" size="lg" onClick={retry}>
              {t('common.retry')}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="school-kpis">
            <Link to="/school/approvals" className="school-kpi school-kpi--primary">
              <span className="school-kpi__value"><Bidi>{waiting.length}</Bidi></span>
              <span className="school-kpi__label">{t('school.dashboard.kpi.waiting')}</span>
            </Link>
            <Link to="/school/calendar" className="school-kpi">
              <span className="school-kpi__value"><Bidi>{examsCount}</Bidi></span>
              <span className="school-kpi__label">{t('school.dashboard.kpi.exams')}</span>
            </Link>
            <Link to="/school/teachers" className="school-kpi">
              <span className="school-kpi__value"><Bidi>{activeTeachers}</Bidi></span>
              <span className="school-kpi__label">{t('school.dashboard.kpi.teachers')}</span>
            </Link>
            <Link to="/school/papers" className="school-kpi">
              <span className="school-kpi__value"><Bidi>{papersThisMonth}</Bidi></span>
              <span className="school-kpi__label">{t('school.dashboard.kpi.papers')}</span>
            </Link>
          </div>

          <div className="school-grid">
            <Card title={t('school.dashboard.queue.title')}>
              {queue.length === 0 ? (
                <p className="school-empty-text">{t('school.dashboard.queue.empty')}</p>
              ) : (
                <ul className="school-rows">
                  {queue.map((paper) => (
                    <li key={paper.id} className="school-rows__row">
                      <span className="school-rows__main">
                        <span className="school-rows__name"><Bidi>{paper.title}</Bidi></span>
                        <span className="school-rows__meta">
                          {classLabel(paper.classId)}
                          {' · '}
                          {subjectLabel(paper.subjectId, lang)}
                          {' · '}
                          {formatDate(paper.examDate, lang)}
                        </span>
                      </span>
                      <span>
                        {paperStatusChip(paper.status)}
                        {' '}
                        <Button
                          variant="primary"
                          onClick={() => navigate(`/school/approvals?selected=${paper.id}`)}
                        >
                          {t('school.dashboard.queue.review')}
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="school-rows__more">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/school/approvals')}
                  trailingIcon={<ArrowRight size={18} className="flip-rtl" aria-hidden="true" />}
                >
                  {t('school.dashboard.queue.viewAll')}
                </Button>
              </div>
            </Card>

            <Card title={t('school.dashboard.exams.title')}>
              {exams.length === 0 ? (
                <p className="school-empty-text">{t('school.dashboard.exams.empty')}</p>
              ) : (
                <ul className="school-rows">
                  {exams.map((exam) => (
                    <li key={exam.id} className="school-rows__row">
                      <span className="school-rows__main">
                        <span className="school-rows__name">
                          {classLabel(exam.classId)}
                          {' · '}
                          {subjectLabel(exam.subjectId, lang)}
                        </span>
                        <span className="school-rows__meta">
                          {t(`term.${exam.term}`)}
                          {' · '}
                          {t(`examType.${exam.examType === 'board-pattern' ? 'boardPattern' : exam.examType === 'chapter-test' ? 'chapterTest' : exam.examType}`)}
                        </span>
                      </span>
                      <span><Bidi>{formatDate(exam.examDate, lang)}</Bidi></span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="school-rows__more">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/school/calendar')}
                  trailingIcon={<ArrowRight size={18} className="flip-rtl" aria-hidden="true" />}
                >
                  {t('school.dashboard.exams.viewAll')}
                </Button>
              </div>
            </Card>
          </div>

          <div className="school__section" style={{ marginBlockStart: 16 }}>
            <Card title={t('school.dashboard.recent.title')}>
              {recent.length === 0 ? (
                <p className="school-empty-text">{t('school.dashboard.recent.empty')}</p>
              ) : (
                <ul className="school-rows">
                  {recent.map((paper) => (
                    <li key={paper.id} className="school-rows__row">
                      <span className="school-rows__main">
                        <span className="school-rows__name"><Bidi>{paper.title}</Bidi></span>
                        <span className="school-rows__meta">
                          {classLabel(paper.classId)}
                          {' · '}
                          {subjectLabel(paper.subjectId, lang)}
                          {' · '}
                          {formatDate(paper.createdAt, lang)}
                        </span>
                      </span>
                      {paperStatusChip(paper.status)}
                    </li>
                  ))}
                </ul>
              )}
              <div className="school-rows__more">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/school/papers')}
                  trailingIcon={<ArrowRight size={18} className="flip-rtl" aria-hidden="true" />}
                >
                  {t('school.dashboard.recent.viewAll')}
                </Button>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

export default SchoolDashboardPage
