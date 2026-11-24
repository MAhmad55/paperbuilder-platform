import { describe, expect, it, beforeEach } from 'vitest'
import { PaperService, PlatformService, QuestionBankProvider, SchoolService, resetMockData, TEACHERS } from './mock-store'
import { autoFillQuestions, emptyDraft, STUDIO_PRESETS } from './studio'
import { BANK_QUESTIONS } from '../mock/data'

const teacher = TEACHERS[0] // Usman Rizwan, Beacon Model School
const admin = { id: 'u-adm-03', name: 'Asma Malik', email: 'asma@beacon.example.pk', role: 'school-admin' as const, schoolId: 'sch-beacon', status: 'active' as const, joinedDaysAgo: 100, subjects: [], classes: [] }

function buildDraftPaper() {
  const d = emptyDraft()
  d.classId = teacher.classes[0]
  d.subjectId = teacher.subjects[0]
  d.examDate = '2026-12-15'
  d.chapterIds = QuestionBankProvider.getChapters(d.subjectId).slice(0, 2).map((c) => c.id)
  d.sections = STUDIO_PRESETS[0].sections.map((s) => ({ ...s }))
  d.targetMarks = 75
  d.questions = autoFillQuestions(d, BANK_QUESTIONS)
  const created = PaperService.create({
    schoolId: 'sch-beacon',
    teacherId: teacher.id,
    classId: d.classId,
    subjectId: d.subjectId,
    medium: d.medium,
    examType: d.examType,
    term: d.term,
    examDate: d.examDate,
    chapterIds: d.chapterIds,
    targetMarks: d.targetMarks,
    sections: d.sections,
    questions: d.questions,
    instructions: ['All questions are compulsory.'],
    durationMinutes: 150,
  }, teacher)
  expect(created.ok).toBe(true)
  return created.ok ? created.value : null!
}

describe('teacher flow — end to end in mock state', () => {
  beforeEach(() => resetMockData())

  it('a teacher builds a draft, submits it, it is approved, then printed', () => {
    const paper = buildDraftPaper()
    expect(paper.status).toBe('draft')
    expect(paper.questions).toHaveLength(24)

    const submitted = PaperService.transition(paper.id, 'submitted', teacher)
    expect(submitted.ok).toBe(true)
    expect(submitted.ok && submitted.value.status).toBe('submitted')

    // School admin approves via the §5.2 chain: submitted -> in-review -> approved.
    const inReview = PaperService.transition(paper.id, 'in-review', admin)
    expect(inReview.ok).toBe(true)
    const approved = PaperService.transition(paper.id, 'approved', admin)
    expect(approved.ok).toBe(true)
    expect(approved.ok && approved.value.status).toBe('approved')

    const printed = PaperService.markPrinted(paper.id, teacher)
    expect(printed.ok).toBe(true)
    expect(printed.ok && printed.value.status).toBe('printed')
    expect(printed.ok && printed.value.printedAt).not.toBeNull()

    const again = PaperService.get(paper.id)!
    expect(again.history.map((h) => h.action)).toContain('approved')
    expect(again.history.map((h) => h.action)).toContain('printed')
    // Visible in the school approvals queue's source: the paper list.
    expect(PaperService.list({ schoolId: 'sch-beacon' }).find((p) => p.id === paper.id)?.status).toBe('printed')
  })

  it('a teacher may not approve their own submitted paper (policy required)', () => {
    const paper = buildDraftPaper()
    PaperService.transition(paper.id, 'submitted', teacher)
    PaperService.transition(paper.id, 'in-review', admin)
    const result = PaperService.transition(paper.id, 'approved', teacher)
    expect(result.ok).toBe(false)
  })

  it('with optional policy the teacher approves a draft directly', () => {
    const paper = buildDraftPaper()
    const settings = SchoolService.getSettings('sch-meadowlands')!
    expect(settings.approvalPolicy).toBe('optional')
    const meadowTeacher = TEACHERS.find((t) => t.schoolId === 'sch-meadowlands')!
    const mine = PaperService.create({
      schoolId: 'sch-meadowlands', teacherId: meadowTeacher.id,
      classId: meadowTeacher.classes[0], subjectId: meadowTeacher.subjects[0],
      medium: 'english', examType: 'monthly', term: 'first', examDate: '2026-12-15',
      chapterIds: [], targetMarks: 30, sections: STUDIO_PRESETS[2].sections.map((s) => ({ ...s })),
    }, meadowTeacher)
    expect(mine.ok).toBe(true)
    const approved = PaperService.transition(mine.ok ? mine.value.id : '', 'approved', meadowTeacher)
    expect(approved.ok).toBe(true)
    void paper
  })

  it('a draft can be saved again (update) and a changes-requested paper returns to draft on edit', () => {
    const paper = buildDraftPaper()
    const updated = PaperService.update(paper.id, { targetMarks: 75, instructions: ['New instruction.'] }, teacher)
    expect(updated.ok).toBe(true)
    expect(updated.ok && updated.value.instructions).toEqual(['New instruction.'])

    PaperService.transition(paper.id, 'submitted', teacher)
    PaperService.transition(paper.id, 'in-review', admin)
    const sentBack = PaperService.transition(paper.id, 'changes-requested', admin, 'Add one more long question.')
    expect(sentBack.ok).toBe(true)
    const edited = PaperService.update(paper.id, { instructions: ['Fixed.'] }, teacher)
    expect(edited.ok).toBe(true)
    expect(edited.ok && edited.value.status).toBe('draft')
    expect(edited.ok && edited.value.history.some((h) => h.action === 'changes-requested' && h.comment === 'Add one more long question.')).toBe(true)
  })

  it('duplicate makes a fresh draft; archive works from printed', () => {
    const paper = buildDraftPaper()
    const dup = PaperService.duplicate(paper.id, teacher)
    expect(dup.ok).toBe(true)
    expect(dup.ok && dup.value.id).not.toBe(paper.id)
    expect(dup.ok && dup.value.status).toBe('draft')
    expect(dup.ok && dup.value.questions).toHaveLength(24)

    PaperService.transition(paper.id, 'submitted', teacher)
    PaperService.transition(paper.id, 'in-review', admin)
    PaperService.transition(paper.id, 'approved', admin)
    PaperService.markPrinted(paper.id, teacher)
    const archived = PaperService.transition(paper.id, 'archived', teacher)
    expect(archived.ok).toBe(true)
  })

  it('bank questions are chapter-tagged and typed; swap pool is real', () => {
    const chapters = QuestionBankProvider.getChapters('math')
    expect(chapters.length).toBeGreaterThan(0)
    const mcqs = QuestionBankProvider.listBankQuestions({ chapterId: chapters[0].id, type: 'mcq' })
    expect(mcqs.length).toBe(chapters[0].counts.mcq)
    expect(mcqs.every((q) => q.optionsEn && q.optionsEn.length === 4 && q.answerEn)).toBe(true)
  })

  it('personal patterns save, list and delete; reset clears them', () => {
    const saved = PlatformService.savePersonalPattern(teacher.id, {
      name: 'My board pattern',
      sections: STUDIO_PRESETS[0].sections.map((s) => ({ ...s })),
      targetMarks: 75,
    })
    expect(saved.ok).toBe(true)
    expect(PlatformService.listPersonalPatterns(teacher.id)).toHaveLength(1)
    const deleted = PlatformService.deletePersonalPattern(teacher.id, saved.ok ? saved.value.id : '')
    expect(deleted).toBe(true)
    expect(PlatformService.listPersonalPatterns(teacher.id)).toHaveLength(0)
    resetMockData()
    expect(PlatformService.listPersonalPatterns(teacher.id)).toHaveLength(0)
  })

  it('saved questions bookmark and remove; reset restores the seed', () => {
    const before = PlatformService.listSavedQuestions(teacher.id).length
    const bank = BANK_QUESTIONS[0]
    const added = PlatformService.addSavedQuestion(teacher.id, bank.id)
    expect(added.ok).toBe(true)
    expect(PlatformService.listSavedQuestions(teacher.id)).toHaveLength(before + 1)
    const again = PlatformService.addSavedQuestion(teacher.id, bank.id)
    expect(again.ok).toBe(true)
    expect(PlatformService.listSavedQuestions(teacher.id)).toHaveLength(before + 1)
    expect(PlatformService.removeSavedQuestion(teacher.id, added.ok ? added.value.id : '')).toBe(true)
    resetMockData()
    expect(PlatformService.listSavedQuestions(teacher.id)).toHaveLength(before)
  })
})
