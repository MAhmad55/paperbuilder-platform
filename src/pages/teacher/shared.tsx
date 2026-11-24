import { useAuth } from '../../shell/AuthContext'
import { PaperSheet } from '../../design-system'
import { AuthService, SchoolService, TEACHERS } from '../../services/mock-store'
import { CHAPTERS, SUBJECTS } from '../../mock/data'
import type { Paper, PaperQuestion, PaperSection, Person, School } from '../../mock/data'
import { formatDate } from '../../utils/date'
import type { AppLanguage } from '../../i18n'
import {
  chapterLabel, classLabel, demoModeOf, paperStatusChip, subjectLabel,
  teacherName, useSchoolDemo,
} from '../school/shared'
import { totalMarks } from '../../services/marks'

export { demoModeOf, paperStatusChip, subjectLabel, classLabel, chapterLabel, teacherName, useSchoolDemo }
export type { DemoMode } from '../school/shared'

/** The demo teacher: Usman Rizwan (TEACHERS[0]), Beacon Model School. */
export function demoTeacher(): Person {
  return AuthService.currentUser() ?? TEACHERS[0]
}

export function demoTeacherSchool(): School | undefined {
  const teacher = demoTeacher()
  return teacher.schoolId ? SchoolService.get(teacher.schoolId) : undefined
}

export function useTeacherAuth() {
  return useAuth()
}

/** Mark a paper printed: real transition to Printed (history + audit).
    The browser print dialog itself is opened by the calling page, skipped
    under automation (navigator.webdriver) where it would block the run. */
export function shouldOpenPrintDialog(): boolean {
  try {
    return !(navigator as Navigator & { webdriver?: boolean }).webdriver
  } catch {
    return true
  }
}

export interface StudioPreviewData {
  title: string
  classId: string
  subjectId: string
  medium: 'english' | 'urdu' | 'both'
  examDate: string
  durationMinutes: number
  targetMarks: number
  sections: PaperSection[]
  questions: PaperQuestion[]
  instructions: string[]
  rollNumberBlock: boolean
}

/** Live A4 preview of a Studio draft (or a saved paper) with real
    questions — the same PaperSheet the approvals screens use. */
export function StudioPreview({
  data, schoolName, previewMode, rollNumberLabel,
}: {
  data: StudioPreviewData
  schoolName: string
  previewMode: 'en' | 'ur'
  rollNumberLabel: string
}) {
  const mode = previewMode
  const sectionLabel = (type: string) =>
    type === 'mcq' ? 'MCQ' : type === 'short'
      ? (mode === 'ur' ? 'مختصر سوالات' : 'Short questions')
      : (mode === 'ur' ? 'طویل سوالات' : 'Long questions')
  const letters = ['A', 'B', 'C', 'D', 'E']
  const title = data.title || (mode === 'ur' ? 'نیا پرچہ' : 'New paper')
  const hours = Math.floor(data.durationMinutes / 60)
  const mins = data.durationMinutes % 60
  const duration = mode === 'ur'
    ? `${hours > 0 ? `${hours} گھنٹے ` : ''}${mins > 0 ? `${mins} منٹ` : ''}`.trim() || '—'
    : `${hours > 0 ? `${hours}h ` : ''}${mins > 0 ? `${mins}m` : ''}`.trim() || '—'
  return (
    <PaperSheet
      mode={mode}
      schoolName={schoolName}
      title={title}
      subtitle={`${classLabel(data.classId) || '—'} · ${subjectLabel(data.subjectId, mode) || '—'}`}
      meta={[
        { label: mode === 'ur' ? 'تاریخ' : 'Date', value: data.examDate ? formatDate(data.examDate, mode) : '—' },
        { label: mode === 'ur' ? 'وقت' : 'Time', value: duration },
        { label: mode === 'ur' ? 'کل مارک' : 'Total marks', value: String(data.targetMarks || 0) },
      ]}
      marks={data.targetMarks || 0}
      instructions={data.instructions.filter(Boolean)}
    >
      {data.rollNumberBlock && (
        <div className="teacher-paper__roll">
          <span>{rollNumberLabel}</span>
          <span className="teacher-paper__roll-box" aria-hidden="true" />
        </div>
      )}
      <div className="teacher-paper__sections">
        {data.sections.map((section, i) => {
          const qs = data.questions.filter((q) => q.type === section.type)
          return (
            <div key={section.id} className="teacher-paper__section">
              <h3 className="pb-paper__section-head">
                {mode === 'ur' ? 'حصہ' : 'Section'} {letters[i] ?? i + 1}
                {' — '}
                {sectionLabel(section.type)}
                {' '}
                <span>({section.questionCount} × {section.marksPerQuestion} = {section.questionCount * section.marksPerQuestion})</span>
              </h3>
              {qs.length === 0 ? (
                <p className="teacher-paper__empty-q">{mode === 'ur' ? 'ابھی کوئی سوال نہیں' : 'No questions yet'}</p>
              ) : (
                <ol className="teacher-paper__questions">
                  {qs.map((q) => (
                    <li key={q.id} className="pb-paper__question">
                      <span>
                        {mode === 'ur' ? q.textUr : q.textEn}
                        {' '}
                        <span className="teacher-paper__q-marks">({q.marks})</span>
                        {q.type === 'mcq' && q.optionsEn && (
                          <span className="pb-paper__mcq">
                            {(mode === 'ur' ? q.optionsUr ?? q.optionsEn : q.optionsEn).map((opt, oi) => (
                              <span key={oi} className="pb-paper__option">
                                {String.fromCharCode(65 + oi)}. {opt}
                              </span>
                            ))}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )
        })}
      </div>
      <p className="teacher-paper__total">
        {mode === 'ur' ? 'موجودہ کل' : 'Current total'}: {totalMarks(data.sections)} / {data.targetMarks || 0}
      </p>
    </PaperSheet>
  )
}

/** Paper preview for a saved paper (sections + stored questions). */
export function SavedPaperPreview({ paper, schoolName, mode, rollNumberLabel }: {
  paper: Paper
  schoolName: string
  mode: 'en' | 'ur'
  rollNumberLabel: string
}) {
  return (
    <StudioPreview
      data={{
        title: paper.title,
        classId: paper.classId,
        subjectId: paper.subjectId,
        medium: paper.medium,
        examDate: paper.examDate,
        durationMinutes: paper.durationMinutes ?? 150,
        targetMarks: paper.targetMarks,
        sections: paper.sections,
        questions: paper.questions ?? [],
        instructions: paper.instructions ?? [],
        rollNumberBlock: paper.rollNumberBlock ?? true,
      }}
      schoolName={schoolName}
      previewMode={mode}
      rollNumberLabel={rollNumberLabel}
    />
  )
}

export function subjectChapters(subjectId: string) {
  return CHAPTERS.filter((c) => c.subjectId === subjectId)
}

export function subjectName(id: string, lang: AppLanguage): string {
  const s = SUBJECTS.find((x) => x.id === id)
  return s ? (lang === 'ur' ? s.nameUr : s.nameEn) : id
}
