import { describe, it, expect, beforeEach } from 'vitest'
import {
  ApprovalRequestService, PaperService, PlatformService, SchoolService, SUPER_ADMINS,
  SCHOOL_ADMINS, resetMockData,
} from './mock-store'
import type { Paper } from '../mock/data'

const SUPER_ADMIN = SUPER_ADMINS[0]
const SCHOOL_ADMIN = SCHOOL_ADMINS[0] // Asma Malik, Beacon Model School

function beaconPaper(status: Paper['status']): Paper {
  const paper = PaperService.list({ schoolId: 'sch-beacon' }).find((p) => p.status === status)
  if (!paper) throw new Error(`no Beacon paper in status ${status} in the seed`)
  return paper
}

describe('AuditEvent.reason (Task 6)', () => {
  beforeEach(() => {
    resetMockData()
  })

  it('suspend stores the reason on the school.suspended audit event', () => {
    expect(SchoolService.get('sch-beacon')?.status).toBe('active')
    const auditBefore = PlatformService.listAudit().length

    const result = SchoolService.setStatus('sch-beacon', 'suspended', SUPER_ADMIN, 'Fees unpaid for two terms')

    expect(result.ok).toBe(true)
    expect(SchoolService.get('sch-beacon')?.status).toBe('suspended')
    const audit = PlatformService.listAudit()
    expect(audit.length).toBe(auditBefore + 1)
    expect(audit[0].action).toBe('school.suspended')
    expect(audit[0].targetId).toBe('sch-beacon')
    expect(audit[0].reason).toBe('Fees unpaid for two terms')
  })

  it('suspend trims the reason and stores nothing when no reason is given', () => {
    const result = SchoolService.setStatus('sch-beacon', 'suspended', SUPER_ADMIN, '  Late payment  ')
    expect(result.ok).toBe(true)
    expect(PlatformService.listAudit()[0].reason).toBe('Late payment')

    resetMockData()
    const noReason = SchoolService.setStatus('sch-beacon', 'suspended', SUPER_ADMIN)
    expect(noReason.ok).toBe(true)
    expect(PlatformService.listAudit()[0].reason).toBeUndefined()
  })

  it('reject stores the rejection reason on the school.rejected audit event', () => {
    expect(ApprovalRequestService.get('PB-2026-1042')?.status).toBe('pending')
    const auditBefore = PlatformService.listAudit().length

    const result = ApprovalRequestService.decide('PB-2026-1042', 'rejected', SUPER_ADMIN, {
      rejectionReason: 'Registration certificate missing',
    })

    expect(result.ok).toBe(true)
    expect(result.ok && result.value.rejectionReason).toBe('Registration certificate missing')
    const audit = PlatformService.listAudit()
    expect(audit.length).toBe(auditBefore + 1)
    expect(audit[0].action).toBe('school.rejected')
    expect(audit[0].targetId).toBe('sch-taj-mirza')
    expect(audit[0].reason).toBe('Registration certificate missing')
  })

  it('request-changes stores the comment as the reason on the paper.changes-requested audit event', () => {
    const paper = beaconPaper('in-review')
    const auditBefore = PlatformService.listAudit().length

    const result = PaperService.transition(paper.id, 'changes-requested', SCHOOL_ADMIN, 'Add marks to Section B')

    expect(result.ok).toBe(true)
    expect(PaperService.get(paper.id)?.status).toBe('changes-requested')
    const audit = PlatformService.listAudit()
    expect(audit.length).toBe(auditBefore + 1)
    expect(audit[0].action).toBe('paper.changes-requested')
    expect(audit[0].targetId).toBe(paper.id)
    expect(audit[0].reason).toBe('Add marks to Section B')
    // The comment is still pinned to the paper history as before.
    const entry = (PaperService.get(paper.id)?.history ?? []).find((h) => h.action === 'changes-requested')
    expect(entry?.comment).toBe('Add marks to Section B')
  })

  it('the audit event type carries the reason through, and events without one have no reason', () => {
    const paper = beaconPaper('in-review')
    const approved = PaperService.transition(paper.id, 'approved', SCHOOL_ADMIN)
    expect(approved.ok).toBe(true)
    const event = PlatformService.listAudit()[0]
    expect(event.action).toBe('paper.approved')
    expect(event.reason).toBeUndefined()
    // The optional field is readable on the typed event.
    const withReason: { reason?: string } = event
    expect(withReason.reason).toBeUndefined()
  })
})
