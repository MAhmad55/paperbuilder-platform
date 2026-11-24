import { describe, expect, it } from 'vitest'
import {
  autoFillQuestions, emptyDraft, isBlueprintValid, isQuestionsValid, isScopeValid,
  isSetupValid, presetTotal, reviewChecklist, reviewPassed, stepValidity,
  swapAlternatives, toPaperQuestion, STUDIO_PRESETS,
} from './studio'
import { BANK_QUESTIONS } from '../mock/data'

const mathChapters = ['math-numbers', 'math-algebra', 'math-geometry']

function filledDraft() {
  const d = emptyDraft()
  d.classId = 'class-9'
  d.subjectId = 'math'
  d.examDate = '2026-12-15'
  d.chapterIds = [...mathChapters]
  d.sections = STUDIO_PRESETS[0].sections.map((s) => ({ ...s }))
  d.targetMarks = 75
  d.questions = autoFillQuestions(d, BANK_QUESTIONS)
  return d
}

describe('studio presets', () => {
  it('Board 75 totals 75 (15×1 + 6×5 + 3×10)', () => {
    expect(presetTotal('board-75')).toBe(75)
  })
  it('Half-book totals 40 and chapter test totals 30', () => {
    expect(presetTotal('half-book')).toBe(40)
    expect(presetTotal('chapter-test')).toBe(30)
  })
  it('unknown preset totals 0 — the meter stays honest', () => {
    expect(presetTotal('nope')).toBe(0)
  })
})

describe('studio step validation', () => {
  it('empty draft fails every step', () => {
    const d = emptyDraft()
    expect(isSetupValid(d)).toBe(false)
    expect(isScopeValid(d)).toBe(false)
    expect(isBlueprintValid(d)).toBe(false)
    expect(isQuestionsValid(d)).toBe(false)
    expect(stepValidity(d)).toEqual([false, false, false, false, false, false])
  })
  it('setup needs class, subject and date', () => {
    const d = emptyDraft()
    d.classId = 'class-9'
    d.subjectId = 'math'
    expect(isSetupValid(d)).toBe(false)
    d.examDate = '2026-12-15'
    expect(isSetupValid(d)).toBe(true)
  })
  it('blueprint is invalid when sections do not add up to the target', () => {
    const d = emptyDraft()
    d.sections = STUDIO_PRESETS[0].sections.map((s) => ({ ...s }))
    d.targetMarks = 80
    expect(isBlueprintValid(d)).toBe(false)
    d.targetMarks = 75
    expect(isBlueprintValid(d)).toBe(true)
  })
  it('questions step needs the full count in every section', () => {
    const d = filledDraft()
    expect(isQuestionsValid(d)).toBe(true)
    d.questions = d.questions.slice(0, 3)
    expect(isQuestionsValid(d)).toBe(false)
  })
})

describe('studio auto-fill', () => {
  it('fills every section to its full count from the scoped chapters', () => {
    const d = filledDraft()
    expect(d.questions.filter((q) => q.type === 'mcq')).toHaveLength(15)
    expect(d.questions.filter((q) => q.type === 'short')).toHaveLength(6)
    expect(d.questions.filter((q) => q.type === 'long')).toHaveLength(3)
    expect(d.questions.every((q) => mathChapters.includes(q.chapterId))).toBe(true)
  })
  it('never places the same bank question twice', () => {
    const d = filledDraft()
    const ids = d.questions.map((q) => q.bankId)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('keeps locked questions when re-filling', () => {
    const d = filledDraft()
    const locked = d.questions[0]
    d.questions = [{ ...locked, locked: true }]
    const refilled = autoFillQuestions(d, BANK_QUESTIONS)
    expect(refilled.some((q) => q.bankId === locked.bankId && q.locked)).toBe(true)
    expect(refilled.filter((q) => q.type === 'mcq')).toHaveLength(15)
  })
  it('every placed question carries an answer (answer key is real)', () => {
    const d = filledDraft()
    expect(d.questions.every((q) => q.answerEn.trim() && q.answerUr.trim())).toBe(true)
  })
})

describe('studio swap', () => {
  it('suggests only same-chapter, same-type questions not already placed', () => {
    const d = filledDraft()
    const q = d.questions.find((x) => x.type === 'mcq')!
    const used = d.questions.map((x) => x.bankId ?? x.id)
    const alts = swapAlternatives(q, BANK_QUESTIONS, used)
    expect(alts.length).toBeGreaterThan(0)
    expect(alts.every((a) => a.chapterId === q.chapterId && a.type === 'mcq')).toBe(true)
    expect(alts.every((a) => !used.includes(a.id))).toBe(true)
  })
})

describe('studio review checklist', () => {
  it('a complete draft passes all four checks', () => {
    const d = filledDraft()
    expect(reviewChecklist(d).map((c) => c.key)).toEqual(['marksMatch', 'coverage', 'duplicates', 'missingAnswers'])
    expect(reviewPassed(d)).toBe(true)
  })
  it('marks mismatch and missing coverage fail honestly', () => {
    const d = filledDraft()
    d.targetMarks = 80
    d.chapterIds = [...mathChapters, 'math-statistics']
    expect(reviewPassed(d)).toBe(false)
    const byKey = Object.fromEntries(reviewChecklist(d).map((c) => [c.key, c.met]))
    expect(byKey.marksMatch).toBe(false)
    expect(byKey.coverage).toBe(false)
  })
  it('a duplicated bank question fails the duplicates check', () => {
    const d = filledDraft()
    d.questions = [...d.questions, { ...d.questions[0], id: 'pq-copy' }]
    expect(reviewChecklist(d).find((c) => c.key === 'duplicates')?.met).toBe(false)
  })
  it('toPaperQuestion copies bank text and answer', () => {
    const bank = BANK_QUESTIONS.find((q) => q.type === 'mcq')!
    const pq = toPaperQuestion(bank, 1)
    expect(pq.textEn).toBe(bank.textEn)
    expect(pq.answerEn).toBe(bank.answerEn)
    expect(pq.marks).toBe(1)
  })
})
