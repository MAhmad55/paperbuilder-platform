/**
 * Paper Studio logic — pure, unit-testable (Phase 5, blueprint §6).
 * No React, no store: the Studio page holds a StudioDraft and calls
 * these helpers; the store only persists the finished paper.
 */
import { totalMarks } from './marks'
import type { BankQuestion, PaperQuestion, PaperSection } from '../mock/data'

export type SectionType = 'mcq' | 'short' | 'long'

export interface StudioDraft {
  classId: string
  subjectId: string
  medium: 'english' | 'urdu' | 'both'
  examType: 'monthly' | 'midterm' | 'board-pattern' | 'chapter-test'
  term: 'first' | 'second' | 'third'
  examDate: string
  durationMinutes: number
  chapterIds: string[]
  sections: PaperSection[]
  /** 0 until a pattern exists — the meter must be honest (blueprint §6). */
  targetMarks: number
  questions: PaperQuestion[]
  instructions: string[]
  rollNumberBlock: boolean
  answerKey: boolean
}

export function emptyDraft(): StudioDraft {
  return {
    classId: '',
    subjectId: '',
    medium: 'english',
    examType: 'monthly',
    term: 'first',
    examDate: '',
    durationMinutes: 150,
    chapterIds: [],
    sections: [],
    targetMarks: 0,
    questions: [],
    instructions: [],
    rollNumberBlock: true,
    answerKey: true,
  }
}

export const STUDIO_PRESETS: { id: string; sections: PaperSection[] }[] = [
  {
    id: 'board-75',
    sections: [
      { id: 'sec-mcq', type: 'mcq', marksPerQuestion: 1, questionCount: 15, attemptCount: 15 },
      { id: 'sec-short', type: 'short', marksPerQuestion: 5, questionCount: 6, attemptCount: 6 },
      { id: 'sec-long', type: 'long', marksPerQuestion: 10, questionCount: 3, attemptCount: 2 },
    ],
  },
  {
    id: 'half-book',
    sections: [
      { id: 'sec-mcq', type: 'mcq', marksPerQuestion: 1, questionCount: 10, attemptCount: 10 },
      { id: 'sec-short', type: 'short', marksPerQuestion: 5, questionCount: 4, attemptCount: 4 },
      { id: 'sec-long', type: 'long', marksPerQuestion: 10, questionCount: 1, attemptCount: 1 },
    ],
  },
  {
    id: 'chapter-test',
    sections: [
      { id: 'sec-mcq', type: 'mcq', marksPerQuestion: 1, questionCount: 10, attemptCount: 10 },
      { id: 'sec-short', type: 'short', marksPerQuestion: 5, questionCount: 2, attemptCount: 2 },
      { id: 'sec-long', type: 'long', marksPerQuestion: 10, questionCount: 1, attemptCount: 1 },
    ],
  },
]

export function presetTotal(presetId: string): number {
  const preset = STUDIO_PRESETS.find(p => p.id === presetId)
  return preset ? totalMarks(preset.sections) : 0
}

/** Step 1 is valid when a class, subject, exam date and duration are set. */
export function isSetupValid(d: StudioDraft): boolean {
  return Boolean(d.classId && d.subjectId && d.examDate && d.durationMinutes > 0)
}

/** Step 2 is valid when at least one chapter is in scope. */
export function isScopeValid(d: StudioDraft): boolean {
  return d.chapterIds.length > 0
}

/** Step 3 is valid when a pattern exists and its total is the target. */
export function isBlueprintValid(d: StudioDraft): boolean {
  return d.sections.length > 0 && d.targetMarks > 0 && totalMarks(d.sections) === d.targetMarks
}

/** Step 4 is valid when every section has its full count of questions. */
export function isQuestionsValid(d: StudioDraft): boolean {
  if (d.sections.length === 0) return false
  return d.sections.every((s) => d.questions.filter((q) => q.type === s.type).length >= s.questionCount)
}

export function stepValidity(d: StudioDraft): boolean[] {
  return [
    isSetupValid(d),
    isScopeValid(d),
    isBlueprintValid(d),
    isQuestionsValid(d),
    isQuestionsValid(d),
    isQuestionsValid(d),
  ]
}

/** One-line summary of each finished step, for the left rail. */
export function stepSummary(d: StudioDraft, step: number, className: string, subjectName: string): string {
  switch (step) {
    case 1: return d.classId ? `${className} · ${subjectName}` : ''
    case 2: return d.chapterIds.length > 0 ? `${d.chapterIds.length} chapters` : ''
    case 3: return d.targetMarks > 0 ? `${totalMarks(d.sections)} / ${d.targetMarks} marks` : ''
    case 4: return d.questions.length > 0 ? `${d.questions.length} questions` : ''
    default: return ''
  }
}

export function toPaperQuestion(q: BankQuestion, marks: number): PaperQuestion {
  return {
    id: `pq-${q.id}`,
    bankId: q.id,
    chapterId: q.chapterId,
    type: q.type,
    marks,
    textEn: q.textEn,
    textUr: q.textUr,
    optionsEn: q.optionsEn ? [...q.optionsEn] : undefined,
    optionsUr: q.optionsUr ? [...q.optionsUr] : undefined,
    answerEn: q.answerEn,
    answerUr: q.answerUr,
  }
}

/**
 * Auto-fill every section from the bank, round-robin across the scoped
 * chapters. Locked questions already on the paper are kept; the rest are
 * replaced. Never reuses a bank question already placed.
 */
export function autoFillQuestions(
  draft: StudioDraft,
  bank: BankQuestion[],
): PaperQuestion[] {
  const locked = draft.questions.filter((q) => q.locked)
  const used = new Set(locked.map((q) => q.bankId ?? q.id))
  const placed: PaperQuestion[] = [...locked]
  for (const section of draft.sections) {
    const have = placed.filter((q) => q.type === section.type).length
    const need = Math.max(0, section.questionCount - have)
    if (need === 0) continue
    const pool = bank.filter(
      (q) => q.type === section.type && draft.chapterIds.includes(q.chapterId) && !used.has(q.id),
    )
    // Round-robin by chapter so one chapter does not fill a whole section.
    const byChapter = new Map<string, BankQuestion[]>()
    for (const q of pool) {
      const list = byChapter.get(q.chapterId) ?? []
      list.push(q)
      byChapter.set(q.chapterId, list)
    }
    const chapters = [...byChapter.keys()]
    let i = 0
    while (placed.filter((q) => q.type === section.type).length < section.questionCount && chapters.length > 0) {
      const chapterId = chapters[i % chapters.length]
      const list = byChapter.get(chapterId)!
      const next = list.shift()
      if (next) {
        placed.push(toPaperQuestion(next, section.marksPerQuestion))
        used.add(next.id)
      } else {
        chapters.splice(chapters.indexOf(chapterId), 1)
      }
      i += 1
      if (i > pool.length + chapters.length + 2) break
    }
  }
  return placed
}

/** Alternatives for Swap: same chapter + type, not already on the paper. */
export function swapAlternatives(
  question: PaperQuestion,
  bank: BankQuestion[],
  usedBankIds: string[],
): BankQuestion[] {
  return bank.filter(
    (q) => q.chapterId === question.chapterId && q.type === question.type && q.id !== question.bankId && !usedBankIds.includes(q.id),
  )
}

export interface ReviewCheck {
  key: 'marksMatch' | 'coverage' | 'duplicates' | 'missingAnswers'
  met: boolean
  state: 'met' | 'notMet' | 'unknown'
}

/** Review checklist (blueprint §6 step 5), computed from real questions. */
export function reviewChecklist(d: StudioDraft): ReviewCheck[] {
  const current = totalMarks(d.sections)
  const bankIds = d.questions.map((q) => q.bankId ?? q.id)
  const duplicates = new Set(bankIds).size !== bankIds.length
  const missingAnswers = d.questions.some((q) => !q.answerEn.trim() || !q.answerUr.trim())
  return [
    { key: 'marksMatch', met: d.targetMarks > 0 && current === d.targetMarks, state: d.targetMarks > 0 && current === d.targetMarks ? 'met' : 'notMet' },
    { key: 'coverage', met: d.chapterIds.length > 0 && d.questions.length > 0 && d.chapterIds.every((id) => d.questions.some((q) => q.chapterId === id)), state: d.chapterIds.length > 0 && d.questions.length > 0 && d.chapterIds.every((id) => d.questions.some((q) => q.chapterId === id)) ? 'met' : 'notMet' },
    { key: 'duplicates', met: !duplicates, state: duplicates ? 'notMet' : 'met' },
    { key: 'missingAnswers', met: !missingAnswers, state: missingAnswers ? 'notMet' : 'met' },
  ]
}

export function reviewPassed(d: StudioDraft): boolean {
  return reviewChecklist(d).every((c) => c.met)
}
