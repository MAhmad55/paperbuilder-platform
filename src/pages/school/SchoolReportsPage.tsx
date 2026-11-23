import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Download } from 'lucide-react'
import { PageHeader } from '../../shell/PageHeader'
import {
  Banner, Button, Card, EmptyState, Meter, Skeleton, useToast,
} from '../../design-system'
import { PaperService, SchoolService } from '../../services/mock-store'
import { CHAPTERS, CLASSES, SUBJECTS } from '../../mock/data'
import { Bidi } from '../../utils/bidi'
import type { AppLanguage } from '../../i18n'
import {
  demoModeOf, demoSchool, downloadCsv, subjectLabel, useSchoolDemo,
} from './shared'
import '../../styles/school.css'

/** Reports — Phase 4. Papers per class/subject/teacher, chapter coverage and
    approval turnaround, computed from the mock papers and their history.
    Export CSV is a real browser download. */
export function SchoolReportsPage() {
  const { t, i18n } = useTranslation()
  const [params] = useSearchParams()
  const { toast } = useToast()
  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage
  const demoMode = demoModeOf(params.get('demo'))
  const { loading, loadFailed, retry } = useSchoolDemo(demoMode)
  const forceEmpty = demoMode === 'empty'

  const school = demoSchool()
  const schoolId = school?.id ?? ''

  const papers = useMemo(
    () => (forceEmpty || !schoolId ? [] : PaperService.list({ schoolId })),
    [forceEmpty, schoolId],
  )
  const teachers = useMemo(
    () => (forceEmpty || !schoolId ? [] : SchoolService.listTeachers(schoolId)),
    [forceEmpty, schoolId],
  )

  const byClass = useMemo(
    () => CLASSES.map((c) => ({
      label: c.name,
      count: papers.filter((p) => p.classId === c.id).length,
    })).filter((r) => r.count > 0).sort((a, b) => b.count - a.count),
    [papers],
  )
  const bySubject = useMemo(
    () => SUBJECTS.map((s) => ({
      label: subjectLabel(s.id, lang),
      count: papers.filter((p) => p.subjectId === s.id).length,
    })).filter((r) => r.count > 0).sort((a, b) => b.count - a.count),
    [papers, lang],
  )
  const byTeacher = useMemo(
    () => teachers.map((u) => ({
      label: u.name,
      count: papers.filter((p) => p.teacherId === u.id).length,
    })).filter((r) => r.count > 0).sort((a, b) => b.count - a.count),
    [papers, teachers],
  )

  const coverage = useMemo(
    () => SUBJECTS.map((s) => {
      const chapters = CHAPTERS.filter((c) => c.subjectId === s.id)
      const used = new Set<string>()
      for (const p of papers) {
        if (p.subjectId !== s.id) continue
        for (const id of p.chapterIds) used.add(id)
      }
      return { label: subjectLabel(s.id, lang), covered: used.size, total: chapters.length }
    }).filter((r) => r.total > 0),
    [papers, lang],
  )

  /* Turnaround: days from the submitted history entry to the approved one,
     averaged over the papers that carry both events. */
  const turnaround = useMemo(() => {
    const days: number[] = []
    for (const p of papers) {
      const submitted = p.history.find((h) => h.action === 'submitted')
      const approved = p.history.find((h) => h.action === 'approved')
      if (!submitted || !approved) continue
      const diff = new Date(approved.createdAt).getTime() - new Date(submitted.createdAt).getTime()
      if (diff >= 0) days.push(diff / (1000 * 60 * 60 * 24))
    }
    if (days.length === 0) return null
    const avg = days.reduce((a, b) => a + b, 0) / days.length
    return { averageDays: Math.round(avg * 10) / 10, count: days.length }
  }, [papers])

  const exportCsv = () => {
    const rows: string[][] = [
      ...byClass.map((r) => [t('school.reports.sections.byClass'), r.label, String(r.count)]),
      ...bySubject.map((r) => [t('school.reports.sections.bySubject'), r.label, String(r.count)]),
      ...byTeacher.map((r) => [t('school.reports.sections.byTeacher'), r.label, String(r.count)]),
      ...coverage.map((r) => [t('school.reports.sections.coverage'), r.label, `${r.covered}/${r.total}`]),
    ]
    if (turnaround) {
      rows.push([
        t('school.reports.sections.turnaround'),
        t('school.reports.turnaround.average'),
        t('school.reports.turnaround.days', { count: turnaround.averageDays }),
      ])
    }
    const today = new Date().toISOString().slice(0, 10)
    downloadCsv(`school-reports-${today}.csv`, [t('school.reports.title'), '', ''], rows)
    toast({ variant: 'success', message: t('school.reports.exported', { count: rows.length }) })
  }

  const hasData = papers.length > 0

  const reportRow = (label: string, count: number, max: number) => (
    <div key={label} className="school-report__row">
      <span><Bidi>{label}</Bidi></span>
      <span
        className="school-bar"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.max(max, 1)}
        aria-valuenow={count}
        aria-valuetext={`${count} / ${Math.max(max, 1)}`}
      >
        <span className="school-bar__fill" style={{ width: `${(count / Math.max(max, 1)) * 100}%` }} />
      </span>
      <span className="school-report__count">
        <Bidi>{t('school.reports.papersLabel', { count })}</Bidi>
      </span>
    </div>
  )

  return (
    <div className="school">
      <PageHeader
        title={t('school.reports.title')}
        lead={t('school.reports.lead')}
        action={
          <Button
            variant="secondary"
            size="lg"
            leadingIcon={<Download size={18} aria-hidden="true" />}
            onClick={exportCsv}
            disabled={loading || loadFailed || !hasData}
          >
            {t('school.reports.export')}
          </Button>
        }
      />

      {loading ? (
        <div className="school__skeleton" aria-label={t('common.loading')} role="status">
          <Skeleton variant="rect" height={48} />
          <Skeleton variant="rect" height={120} />
          <Skeleton variant="rect" height={120} />
        </div>
      ) : loadFailed ? (
        <div>
          <Banner variant="error" title={t('school.reports.error.title')}>
            {t('school.reports.error.body')}
          </Banner>
          <div className="school__retry">
            <Button variant="primary" onClick={retry}>
              {t('common.retry')}
            </Button>
          </div>
        </div>
      ) : !hasData ? (
        <Card>
          <EmptyState
            title={t('school.reports.emptyTitle')}
            body={t('school.reports.emptyBody')}
          />
        </Card>
      ) : (
        <>
          <div className="school-grid">
            <Card title={t('school.reports.byClass')}>
              {byClass.map((r) => reportRow(r.label, r.count, byClass[0]?.count ?? 1))}
            </Card>
            <Card title={t('school.reports.bySubject')}>
              {bySubject.map((r) => reportRow(r.label, r.count, bySubject[0]?.count ?? 1))}
            </Card>
          </div>

          <div className="school__section" style={{ marginBlockStart: 16 }}>
            <Card title={t('school.reports.byTeacher')}>
              {byTeacher.length === 0 ? (
                <p className="school-empty-text">{t('school.reports.emptyBody')}</p>
              ) : (
                byTeacher.map((r) => reportRow(r.label, r.count, byTeacher[0]?.count ?? 1))
              )}
            </Card>
          </div>

          <div className="school-grid">
            <Card title={t('school.reports.coverage.title')}>
              <p className="school-note">{t('school.reports.coverage.note')}</p>
              {coverage.length === 0 ? (
                <p className="school-empty-text">{t('school.reports.coverage.empty')}</p>
              ) : (
                coverage.map((r) => (
                  <div key={r.label} className="school-report__row">
                    <span><Bidi>{r.label}</Bidi></span>
                    <Meter target={Math.max(r.total, 1)} current={r.covered} label={r.label} />
                    <span className="school-report__count">
                      <Bidi>{r.covered} / {r.total}</Bidi>
                    </span>
                  </div>
                ))
              )}
            </Card>
            <Card title={t('school.reports.turnaround.title')}>
              {turnaround ? (
                <>
                  <p className="school-rows__row">
                    <span>{t('school.reports.turnaround.average')}</span>
                    <strong>
                      <Bidi>
                        {t('school.reports.turnaround.days', { count: turnaround.averageDays })}
                      </Bidi>
                    </strong>
                  </p>
                  <p className="school-note">
                    <Bidi>
                      {t('school.reports.turnaround.basedOn', { count: turnaround.count })}
                    </Bidi>
                  </p>
                </>
              ) : (
                <p className="school-empty-text">{t('school.reports.turnaround.empty')}</p>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

export default SchoolReportsPage
