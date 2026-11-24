import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../shell/PageHeader'
import { Banner, Button, Card, EmptyState, Skeleton } from '../../design-system'
import { PaperService, PlatformService } from '../../services/mock-store'
import type { PaperStatus } from '../../mock/data'
import { Bidi } from '../../utils/bidi'
import { formatDate } from '../../utils/date'
import type { AppLanguage } from '../../i18n'
import {
  classLabel, demoModeOf, demoTeacher, demoTeacherSchool, paperStatusChip,
  subjectLabel, useSchoolDemo,
} from './shared'
import '../../styles/teacher.css'

const STATUS_ORDER: PaperStatus[] = ['draft', 'submitted', 'approved', 'printed']

/** Teacher dashboard — Phase 5 (blueprint 4.4.1): continue the latest
    draft, start a new paper, my papers by status, my upcoming exams. */
export function TeacherDashboardPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage
  const demoMode = demoModeOf(params.get('demo'))
  const { loading, loadFailed, retry } = useSchoolDemo(demoMode)
  const forceEmpty = demoMode === 'empty'

  const teacher = demoTeacher()
  const school = demoTeacherSchool()

  const papers = useMemo(
    () => (forceEmpty || !teacher.id ? [] : PaperService.list({ teacherId: teacher.id })),
    [forceEmpty, teacher.id],
  )

  const latestDraft = useMemo(
    () => [...papers].filter((p) => p.status === 'draft' || p.status === 'changes-requested')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0],
    [papers],
  )

  const counts = useMemo(() => {
    const c: Record<PaperStatus, number> = {
      draft: 0, submitted: 0, 'in-review': 0, approved: 0,
      'changes-requested': 0, printed: 0, archived: 0,
    }
    for (const p of papers) c[p.status] += 1
    return c
  }, [papers])

  const exams = useMemo(() => {
    if (forceEmpty || !school) return []
    const today = new Date().toISOString().split('T')[0]
    return PlatformService.listExams({ schoolId: school.id })
      .filter((e) => e.examDate >= today && teacher.classes.includes(e.classId) && teacher.subjects.includes(e.subjectId))
      .slice(0, 5)
  }, [forceEmpty, school, teacher.classes, teacher.subjects])

  return (
    <div className="teacher">
      <PageHeader
        title={t('teacher.dashboard.title')}
        lead={t('teacher.dashboard.lead')}
        action={(
          <Button variant="primary" onClick={() => navigate('/teacher/studio')}>
            {t('teacher.dashboard.startNew')}
          </Button>
        )}
      />

      {loading ? (
        <div className="teacher__skeleton" aria-label={t('common.loading')} role="status">
          <Skeleton variant="rect" height={120} />
          <Skeleton variant="rect" height={104} />
          <Skeleton variant="rect" height={220} />
        </div>
      ) : loadFailed ? (
        <div>
          <Banner variant="error" title={t('teacher.dashboard.error.title')}>
            {t('teacher.dashboard.error.body')}
          </Banner>
          <div className="teacher__retry">
            <Button variant="primary" onClick={retry}>
              {t('common.retry')}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="teacher-grid">
            <Card title={t('teacher.dashboard.continueTitle')}>
              {latestDraft ? (
                <div className="teacher-flow">
                  <div>
                    <strong><Bidi>{latestDraft.title}</Bidi></strong>
                    <p className="teacher-note">
                      {classLabel(latestDraft.classId)}
                      {' · '}
                      {subjectLabel(latestDraft.subjectId, lang)}
                      {' · '}
                      {formatDate(latestDraft.updatedAt, lang)}
                    </p>
                  </div>
                  <div className="teacher-actions">
                    <Button variant="primary" onClick={() => navigate(`/teacher/studio?paper=${latestDraft.id}`)}>
                      {t('teacher.dashboard.continueOpen')}
                    </Button>
                    <Button variant="secondary" onClick={() => navigate(`/teacher/papers/${latestDraft.id}`)}>
                      {t('teacher.papers.open')}
                    </Button>
                  </div>
                </div>
              ) : (
                <EmptyState
                  title={t('teacher.dashboard.continueEmptyTitle')}
                  body={t('teacher.dashboard.continueEmptyBody')}
                >
                  <Button variant="primary" onClick={() => navigate('/teacher/studio')}>
                    {t('teacher.dashboard.startNew')}
                  </Button>
                </EmptyState>
              )}
            </Card>

            <Card title={t('teacher.dashboard.examsTitle')}>
              {exams.length === 0 ? (
                <p className="teacher-note">{t('teacher.dashboard.examsEmpty')}</p>
              ) : (
                <ul className="teacher-list">
                  {exams.map((exam) => (
                    <li key={exam.id} className="teacher-list__item">
                      <span>
                        <Bidi>{subjectLabel(exam.subjectId, lang)}</Bidi>
                        {' · '}
                        {classLabel(exam.classId)}
                      </span>
                      <span className="teacher-list__meta">{formatDate(exam.examDate, lang)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="teacher__section">
            <h2 className="teacher__section-title">{t('teacher.dashboard.byStatusTitle')}</h2>
            <div className="teacher-kpis">
              {STATUS_ORDER.map((status) => (
                <Link
                  key={status}
                  className="teacher-kpi"
                  to={`/teacher/papers?status=${status}`}
                >
                  <span className="teacher-kpi__value"><Bidi>{counts[status]}</Bidi></span>
                  <span className="teacher-kpi__label">{paperStatusChip(status)}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeacherDashboardPage
