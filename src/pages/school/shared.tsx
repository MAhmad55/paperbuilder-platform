import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PaperSheet, StatusChip } from '../../design-system'
import {
  AuthService, PlatformService, SchoolService, SCHOOL_ADMINS,
} from '../../services/mock-store'
import { CLASSES, SUBJECTS, CHAPTERS } from '../../mock/data'
import type { Paper, PaperStatus, Person, School } from '../../mock/data'
import { currentMarks } from '../../services/mock-store'
import { formatDate } from '../../utils/date'
import type { AppLanguage } from '../../i18n'

export type DemoMode = 'loading' | 'empty' | 'error' | null

export function demoModeOf(value: string | null): DemoMode {
  return value === 'loading' || value === 'empty' || value === 'error' ? value : null
}

/** The demo school: Beacon Model School, Lahore (SCHOOLS[0]); its school
    admin is Asma Malik (SCHOOL_ADMINS[0]). */
export function demoSchool(): School | undefined {
  return SchoolService.get(SCHOOL_ADMINS[0].schoolId ?? '')
}

export function demoActor(): Person {
  return AuthService.currentUser() ?? SCHOOL_ADMINS[0]
}

/** Loading / error demo states, shared by every school page: ~350ms
    skeleton, ?demo=error shows the error banner, retry clears ?demo. */
export function useSchoolDemo(demo: DemoMode) {
  const [params, setParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    if (demo === 'loading') {
      setLoading(true)
      setLoadFailed(false)
      return
    }
    if (demo === 'error') {
      setLoading(false)
      setLoadFailed(true)
      return
    }
    setLoadFailed(false)
    setLoading(true)
    const handle = window.setTimeout(() => setLoading(false), 350)
    return () => window.clearTimeout(handle)
  }, [demo])

  const retry = () => {
    const next = new URLSearchParams(params)
    next.delete('demo')
    setParams(next, { replace: true })
  }

  return { loading, loadFailed, retry }
}

export function subjectLabel(id: string, lang: AppLanguage): string {
  const s = SUBJECTS.find(x => x.id === id)
  if (!s) return id
  return lang === 'ur' ? s.nameUr : s.nameEn
}

export function classLabel(id: string): string {
  return CLASSES.find(c => c.id === id)?.name ?? id
}

export function chapterLabel(id: string, lang: AppLanguage): string {
  const c = CHAPTERS.find(x => x.id === id)
  if (!c) return id
  return lang === 'ur' ? c.nameUr : c.nameEn
}

export function teacherName(id: string): string {
  return PlatformService.listUsers().find(u => u.id === id)?.name ?? id
}

export function paperStatusChip(status: PaperStatus) {
  return <StatusChip status={status} />
}

/** Live A4 preview of a paper (paper content, not UI copy — the same
    bilingual-hardcoded approach PaperSheet itself uses). */
export function PaperPreview({ paper, schoolName }: { paper: Paper; schoolName: string }) {
  const mode: 'en' | 'ur' = paper.medium === 'urdu' ? 'ur' : 'en'
  const sectionLabel = (type: string) =>
    type === 'mcq' ? 'MCQ' : type === 'short'
      ? (mode === 'ur' ? 'مختصر سوالات' : 'Short questions')
      : (mode === 'ur' ? 'طویل سوالات' : 'Long questions')
  const letters = ['A', 'B', 'C', 'D', 'E']
  return (
    <PaperSheet
      mode={mode}
      schoolName={schoolName}
      title={paper.title}
      subtitle={`${classLabel(paper.classId)} · ${subjectLabel(paper.subjectId, mode)}`}
      meta={[
        { label: mode === 'ur' ? 'تاریخ' : 'Date', value: formatDate(paper.examDate, mode) },
        { label: mode === 'ur' ? 'وقت' : 'Time', value: mode === 'ur' ? '2 گھنٹے 30 منٹ' : '2 hours 30 minutes' },
        { label: mode === 'ur' ? 'استاد' : 'Teacher', value: teacherName(paper.teacherId) },
      ]}
      marks={paper.targetMarks}
      instructions={[
        mode === 'ur'
          ? 'تمام سوالات لازمی ہیں۔ جوابات صاف لکھیں۔'
          : 'All questions are compulsory. Write your answers clearly.',
      ]}
    >
      <div className="school-paper-preview">
        {paper.sections.map((section, i) => (
          <div key={section.id} className="school-paper-preview__section">
            <h3>
              {mode === 'ur' ? 'حصہ' : 'Section'} {letters[i] ?? i + 1}
              {' — '}
              {sectionLabel(section.type)}
            </h3>
            <p>
              {section.questionCount} {' × '} {section.marksPerQuestion}
              {' = '}
              {section.questionCount * section.marksPerQuestion}
              {' '}
              {mode === 'ur' ? 'مارک' : 'marks'}
            </p>
            <ol>
              {Array.from({ length: Math.min(section.questionCount, 3) }, (_, q) => (
                <li key={q}>
                  {mode === 'ur' ? 'سوال' : 'Question'} {q + 1}
                  {' — '}
                  {paper.chapterIds[q % Math.max(paper.chapterIds.length, 1)]
                    ? chapterLabel(paper.chapterIds[q % paper.chapterIds.length], mode)
                    : (mode === 'ur' ? 'عمومی' : 'General')}
                </li>
              ))}
            </ol>
          </div>
        ))}
        <p className="school-paper-preview__total">
          {mode === 'ur' ? 'موجودہ کل' : 'Current total'}: {currentMarks(paper)} / {paper.targetMarks}
        </p>
      </div>
    </PaperSheet>
  )
}

/** Download rows as a real CSV file (BOM so Excel opens Urdu correctly). */
export function downloadCsv(filename: string, header: string[], rows: string[][]) {
  const cell = (v: string) => `"${v.replace(/"/g, '""')}"`
  const text = ['\uFEFF' + [header, ...rows].map(r => r.map(cell).join(',')).join('\r\n')]
  const blob = new Blob(text, { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
