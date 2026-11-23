import { describe, it, expect, beforeEach } from 'vitest'
import {
  PaperService, PlatformService, SchoolService, SCHOOL_ADMINS, TEACHERS,
  resetMockData,
} from './mock-store'
import type { Paper } from '../mock/data'

const ADMIN = SCHOOL_ADMINS[0] // Asma Malik, Beacon Model School
const TEACHER = TEACHERS[0] // Beacon teacher
const SCHOOL_ID = 'sch-beacon'

function beaconPaper(status: Paper['status']): Paper {
  const paper = PaperService.list({ schoolId: SCHOOL_ID }).find((p) => p.status === status)
  if (!paper) throw new Error(`no Beacon paper in status ${status} in the seed`)
  return paper
}

describe('School approvals: PaperService.transition', () => {
  beforeEach(() => {
    resetMockData()
  })

  it('approves an in-review paper: status flips, one paper.approved audit event, history gains an entry', () => {
    const paper = beaconPaper('in-review')
    const auditBefore = PlatformService.listAudit().length

    const result = PaperService.transition(paper.id, 'approved', ADMIN)

    expect(result.ok).toBe(true)
    expect(PaperService.get(paper.id)?.status).toBe('approved')
    const audit = PlatformService.listAudit()
    expect(audit.length).toBe(auditBefore + 1)
    expect(audit[0].action).toBe('paper.approved')
    expect(audit[0].targetId).toBe(paper.id)
    const history = PaperService.get(paper.id)?.history ?? []
    expect(history.some((h) => h.action === 'approved' && h.actorId === ADMIN.id)).toBe(true)
  })

  it('requests changes with a comment: distinct paper.changes-requested audit event and the comment is pinned to history', () => {
    const paper = beaconPaper('in-review')
    const auditBefore = PlatformService.listAudit().length

    const result = PaperService.transition(paper.id, 'changes-requested', ADMIN, 'Add marks to Section B')

    expect(result.ok).toBe(true)
    expect(PaperService.get(paper.id)?.status).toBe('changes-requested')
    const audit = PlatformService.listAudit()
    expect(audit.length).toBe(auditBefore + 1)
    expect(audit[0].action).toBe('paper.changes-requested')
    expect(audit[0].action).not.toBe('paper.submitted')
    const entry = (PaperService.get(paper.id)?.history ?? []).find((h) => h.action === 'changes-requested')
    expect(entry?.comment).toBe('Add marks to Section B')
  })

  it('requests changes without a comment fails and leaves the paper in review', () => {
    const paper = beaconPaper('in-review')
    const result = PaperService.transition(paper.id, 'changes-requested', ADMIN)
    expect(result.ok).toBe(false)
    expect(PaperService.get(paper.id)?.status).toBe('in-review')
  })

  it('a teacher may not approve from in-review', () => {
    const paper = beaconPaper('in-review')
    const result = PaperService.transition(paper.id, 'approved', TEACHER)
    expect(result.ok).toBe(false)
    expect(PaperService.get(paper.id)?.status).toBe('in-review')
  })

  it('approve from submitted is blocked by the graph; the in-review step then approve succeeds (the page chain)', () => {
    const paper = beaconPaper('submitted')
    expect(PaperService.transition(paper.id, 'approved', ADMIN).ok).toBe(false)
    expect(PaperService.transition(paper.id, 'in-review', ADMIN).ok).toBe(true)
    expect(PaperService.transition(paper.id, 'approved', ADMIN).ok).toBe(true)
    expect(PaperService.get(paper.id)?.status).toBe('approved')
  })
})

describe('School settings approval-policy gate (blueprint 5.2)', () => {
  beforeEach(() => {
    resetMockData()
  })

  it('Beacon ships with approval required: a teacher cannot self-approve a draft', () => {
    expect(SchoolService.getSettings(SCHOOL_ID)?.approvalPolicy).toBe('required')
    const paper = beaconPaper('draft')
    const result = PaperService.transition(paper.id, 'approved', TEACHER)
    expect(result.ok).toBe(false)
    expect(PaperService.get(paper.id)?.status).toBe('draft')
  })

  it('flipping the policy to optional in settings lets the teacher approve a draft directly', () => {
    const saved = SchoolService.updateSettings(SCHOOL_ID, { approvalPolicy: 'optional' }, ADMIN)
    expect(saved.ok).toBe(true)
    expect(SchoolService.getSettings(SCHOOL_ID)?.approvalPolicy).toBe('optional')

    const paper = beaconPaper('draft')
    const result = PaperService.transition(paper.id, 'approved', TEACHER)

    expect(result.ok).toBe(true)
    expect(PaperService.get(paper.id)?.status).toBe('approved')
  })

  it('flipping the policy back to required closes the gate again', () => {
    SchoolService.updateSettings(SCHOOL_ID, { approvalPolicy: 'optional' }, ADMIN)
    SchoolService.updateSettings(SCHOOL_ID, { approvalPolicy: 'required' }, ADMIN)
    const paper = beaconPaper('draft')
    expect(PaperService.transition(paper.id, 'approved', TEACHER).ok).toBe(false)
  })

  it('the settings override is cleared by resetMockData (seed deep-copy rule)', () => {
    SchoolService.updateSettings(SCHOOL_ID, { approvalPolicy: 'optional' }, ADMIN)
    expect(SchoolService.getSettings(SCHOOL_ID)?.approvalPolicy).toBe('optional')
    resetMockData()
    expect(SchoolService.getSettings(SCHOOL_ID)?.approvalPolicy).toBe('required')
  })

  it('saving settings writes one school.settings-changed audit event', () => {
    const auditBefore = PlatformService.listAudit().length
    const result = SchoolService.updateSettings(SCHOOL_ID, { rollNumberBlock: false }, ADMIN)
    expect(result.ok).toBe(true)
    expect(PlatformService.listAudit().length).toBe(auditBefore + 1)
    expect(PlatformService.listAudit()[0].action).toBe('school.settings-changed')
  })
})

describe('School calendar default month input', () => {
  it('the earliest Beacon exam is in December 2026, so the calendar opens on that month', () => {
    const exams = PlatformService.listExams({ schoolId: SCHOOL_ID })
    expect(exams.length).toBeGreaterThan(0)
    expect(exams[0].examDate.startsWith('2026-12')).toBe(true)
  })
})

describe('School teachers and templates (Phase 4 store methods)', () => {
  beforeEach(() => {
    resetMockData()
  })

  it('inviting a teacher adds them to the school list and writes a teacher.invited audit event', () => {
    const before = SchoolService.listTeachers(SCHOOL_ID).length
    const result = SchoolService.inviteTeacher(SCHOOL_ID, { name: 'Test Teacher', email: 'test.teacher@beacon.example.pk' }, ADMIN)
    expect(result.ok).toBe(true)
    expect(SchoolService.listTeachers(SCHOOL_ID).length).toBe(before + 1)
    expect(SchoolService.listTeachers(SCHOOL_ID).some((u) => u.email === 'test.teacher@beacon.example.pk')).toBe(true)
    expect(PlatformService.listAudit()[0].action).toBe('teacher.invited')
  })

  it('editing assignments persists and is reflected by listTeachers', () => {
    const teacher = SchoolService.listTeachers(SCHOOL_ID)[0]
    const result = SchoolService.updateTeacherAssignments(
      teacher.id,
      { subjects: ['math'], classes: ['class-9'] },
      ADMIN,
    )
    expect(result.ok).toBe(true)
    const updated = SchoolService.listTeachers(SCHOOL_ID).find((u) => u.id === teacher.id)!
    expect(updated.subjects).toEqual(['math'])
    expect(updated.classes).toEqual(['class-9'])
  })

  it('duplicating a template adds a copy and setting a default moves the default', () => {
    const templates = PlatformService.listTemplates(SCHOOL_ID)
    expect(templates.length).toBe(1)
    const dup = PlatformService.duplicateTemplate(templates[0].id, `${templates[0].name} (copy)`, ADMIN)
    expect(dup.ok).toBe(true)
    if (!dup.ok) throw new Error('duplicate failed')
    const copyId = dup.value.id
    expect(PlatformService.listTemplates(SCHOOL_ID).length).toBe(2)
    const setDefault = PlatformService.setDefaultTemplate(copyId, ADMIN)
    expect(setDefault.ok).toBe(true)
    const after = PlatformService.listTemplates(SCHOOL_ID)
    expect(after.find((t) => t.id === copyId)?.isDefault).toBe(true)
    expect(after.find((t) => t.id === templates[0].id)?.isDefault).toBe(false)
  })

  it('requesting a plan upgrade records the request and writes one audit event', () => {
    expect(SchoolService.getUpgradeRequest(SCHOOL_ID)).toBeUndefined()
    const auditBefore = PlatformService.listAudit().length
    const result = SchoolService.requestPlanUpgrade(SCHOOL_ID, 'enterprise', ADMIN)
    expect(result.ok).toBe(true)
    expect(SchoolService.getUpgradeRequest(SCHOOL_ID)).toBe('enterprise')
    expect(PlatformService.listAudit().length).toBe(auditBefore + 1)
    expect(PlatformService.listAudit()[0].action).toBe('school.plan-upgrade-requested')
  })
})
