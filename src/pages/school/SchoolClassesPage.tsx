import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../shell/PageHeader'
import { Banner, Button, EmptyState, SearchField, Select, Skeleton } from '../../design-system'
import { SchoolService } from '../../services/mock-store'
import { CLASSES, SUBJECTS } from '../../mock/data'
import { Bidi } from '../../utils/bidi'
import type { AppLanguage } from '../../i18n'
import {
  demoModeOf, demoSchool, subjectLabel, useSchoolDemo,
} from './shared'
import '../../styles/school.css'

/** Classes & subjects — Phase 4. Grid of class x subject with the assigned
    teacher, medium and pattern default. Editing an assignment reuses the
    Teachers assignment editor (deep link ?edit=<teacher-id>). */
export function SchoolClassesPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage
  const demoMode = demoModeOf(params.get('demo'))
  const { loading, loadFailed, retry } = useSchoolDemo(demoMode)
  const forceEmpty = demoMode === 'empty'

  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('all')

  const school = demoSchool()
  const schoolId = school?.id ?? ''

  const teachers = useMemo(
    () => (forceEmpty || !schoolId ? [] : SchoolService.listTeachers(schoolId)),
    [forceEmpty, schoolId],
  )

  const cells = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows: { classId: string; subjectId: string; assigned: { id: string; name: string }[] }[] = []
    for (const cls of CLASSES) {
      if (classFilter !== 'all' && cls.id !== classFilter) continue
      for (const subject of SUBJECTS) {
        const nameEn = `${cls.name} ${subject.nameEn}`.toLowerCase()
        const nameUr = `${cls.name} ${subject.nameUr}`.toLowerCase()
        if (q && !nameEn.includes(q) && !nameUr.includes(q)) continue
        const assigned = teachers
          .filter((u) => u.classes.includes(cls.id) && u.subjects.includes(subject.id))
          .map((u) => ({ id: u.id, name: u.name }))
        rows.push({ classId: cls.id, subjectId: subject.id, assigned })
      }
    }
    return rows
  }, [teachers, classFilter, search])

  const assignedCount = useMemo(() => cells.filter((c) => c.assigned.length > 0).length, [cells])

  return (
    <div className="school">
      <PageHeader title={t('school.classes.title')} lead={t('school.classes.lead')} />

      {loading ? (
        <div className="school__skeleton" aria-label={t('common.loading')} role="status">
          <Skeleton variant="rect" height={44} />
          <Skeleton variant="rect" height={120} count={4} />
        </div>
      ) : loadFailed ? (
        <div>
          <Banner variant="error" title={t('school.classes.error.title')}>
            {t('school.classes.error.body')}
          </Banner>
          <div className="school__retry">
            <Button variant="primary" onClick={retry}>
              {t('common.retry')}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="school-filters" role="search">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder={t('school.classes.searchPlaceholder')}
              ariaLabel={t('school.classes.searchPlaceholder')}
            />
            <Select
              label={t('school.classes.filterClass')}
              aria-label={t('school.classes.filterClass')}
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              options={[
                { value: 'all', label: t('school.classes.allClasses') },
                ...CLASSES.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>

          <p className="school-count" role="status">
            <Bidi>
              {t('school.classes.assignedSummary', { assigned: assignedCount, total: cells.length })}
            </Bidi>
          </p>

          {cells.length === 0 ? (
            <EmptyState
              title={t('school.classes.emptyTitle')}
              body={t('school.classes.emptyBody')}
            >
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('')
                  setClassFilter('all')
                }}
              >
                {t('common.clear')}
              </Button>
            </EmptyState>
          ) : (
            <div className="school-classes-grid">
              {cells.map((cell) => {
                const cls = CLASSES.find((c) => c.id === cell.classId)!
                const first = cell.assigned[0]
                return (
                  <article key={`${cell.classId}-${cell.subjectId}`} className="school-class-card">
                    <h3>{cls.name}</h3>
                    <p className="school-class-card__subject">{subjectLabel(cell.subjectId, lang)}</p>
                    <dl className="school-class-card__rows">
                      <div>
                        <dt>{t('school.classes.cell.teacher')}</dt>
                        <dd>
                          {cell.assigned.length === 0 ? (
                            t('school.classes.cell.noTeacher')
                          ) : (
                            <Bidi>
                              {cell.assigned.map((a) => a.name).join(', ')}
                            </Bidi>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>{t('school.classes.cell.medium')}</dt>
                        <dd>{t(`medium.${school?.defaultMedium ?? 'english'}`)}</dd>
                      </div>
                      <div>
                        <dt>{t('school.classes.cell.pattern')}</dt>
                        <dd>{t('school.classes.cell.patternDefault')}</dd>
                      </div>
                    </dl>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        navigate(first ? `/school/teachers?edit=${first.id}` : '/school/teachers')
                      }
                    >
                      {t('school.classes.cell.edit')}
                    </Button>
                  </article>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default SchoolClassesPage
