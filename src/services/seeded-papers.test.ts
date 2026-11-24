import { describe, expect, it } from 'vitest'
import { BANK_QUESTIONS, PAPERS } from '../mock/data'
import { totalMarks } from './marks'
import { autoFillQuestions, emptyDraft, STUDIO_PRESETS } from './studio'

const bankById = new Map(BANK_QUESTIONS.map((q) => [q.id, q]))

describe('seeded papers — marks', () => {
  it('has 60 seeded papers', () => {
    expect(PAPERS).toHaveLength(60)
  })

  it('every paper sections add up to its target', () => {
    const bad = PAPERS.filter((p) => totalMarks(p.sections) !== p.targetMarks)
      .map((p) => `${p.id}: ${totalMarks(p.sections)} != ${p.targetMarks}`)
    expect(bad).toEqual([])
  })

  it('paper-001 is the Board 75 pattern (15x1 + 6x5 + 3x10, attempt any 2 of 3 longs)', () => {
    const p = PAPERS.find((x) => x.id === 'paper-001')!
    const preset = STUDIO_PRESETS.find((x) => x.id === 'board-75')!
    expect(p.targetMarks).toBe(75)
    expect(p.sections).toEqual(preset.sections)
  })
})

describe('seeded papers — questions', () => {
  it('every paper carries a question per section slot, from its own chapters', () => {
    const bad: string[] = []
    for (const p of PAPERS) {
      const qs = p.questions ?? []
      for (const s of p.sections) {
        const ofType = qs.filter((q) => q.type === s.type)
        if (ofType.length !== s.questionCount) bad.push(`${p.id} ${s.type}: ${ofType.length} != ${s.questionCount}`)
        if (!ofType.every((q) => q.marks === s.marksPerQuestion)) bad.push(`${p.id} ${s.type}: wrong marks`)
      }
      if (!qs.every((q) => p.chapterIds.includes(q.chapterId))) bad.push(`${p.id}: question outside scoped chapters`)
      for (const ch of p.chapterIds) {
        if (!qs.some((q) => q.chapterId === ch)) bad.push(`${p.id}: chapter ${ch} uncovered`)
      }
    }
    expect(bad).toEqual([])
  })

  it('no bank question is used twice in one paper', () => {
    const bad: string[] = []
    for (const p of PAPERS) {
      const ids = (p.questions ?? []).map((q) => q.bankId)
      if (ids.some((id) => !id)) bad.push(`${p.id}: question without bankId`)
      if (new Set(ids).size !== ids.length) bad.push(`${p.id}: duplicate bank question`)
    }
    expect(bad).toEqual([])
  })

  it('every question is a real bank question with an answer in en and ur', () => {
    const bad: string[] = []
    for (const p of PAPERS) {
      for (const q of p.questions ?? []) {
        const bank = bankById.get(q.bankId ?? '')
        if (!bank) { bad.push(`${p.id} ${q.id}: not in the bank`); continue }
        if (q.textEn !== bank.textEn || q.textUr !== bank.textUr) bad.push(`${p.id} ${q.id}: text differs from bank`)
        if (!q.answerEn.trim() || !q.answerUr.trim()) bad.push(`${p.id} ${q.id}: missing answer`)
        if (q.type === 'mcq' && (q.optionsEn?.length !== 4 || q.optionsUr?.length !== 4)) {
          bad.push(`${p.id} ${q.id}: MCQ needs 4 options in en and ur`)
        }
      }
    }
    expect(bad).toEqual([])
  })

  it('seeded questions are exactly Studio auto-fill output (same round-robin, deterministic)', () => {
    const bad: string[] = []
    for (const p of PAPERS) {
      const draft = emptyDraft()
      draft.chapterIds = [...p.chapterIds]
      draft.sections = p.sections
      draft.targetMarks = p.targetMarks
      draft.questions = []
      try {
        expect(p.questions).toEqual(autoFillQuestions(draft, BANK_QUESTIONS))
      } catch {
        bad.push(`${p.id}: questions differ from autoFillQuestions`)
      }
    }
    expect(bad).toEqual([])
  })
})
