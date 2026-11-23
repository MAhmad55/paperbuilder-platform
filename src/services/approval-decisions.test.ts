import { describe, it, expect, beforeEach } from 'vitest'
import {
  ApprovalRequestService, PlatformService, SchoolService, SUPER_ADMINS,
  resetMockData,
} from './mock-store'
import type { ApprovalRequestStatus } from '../mock/data'

const ACTOR = SUPER_ADMINS[0]

/** Seed request statuses, as shipped in mock/data.ts. */
const SEED_REQUEST_STATUS: Record<string, ApprovalRequestStatus> = {
  'PB-2026-1042': 'pending',
  'PB-2026-1041': 'info-requested',
  'PB-2026-1040': 'rejected',
  'PB-2026-1039': 'approved',
}

describe('ApprovalRequestService.decide', () => {
  beforeEach(() => {
    resetMockData()
    /* resetMockData re-seeds with the same request objects, and decide()
       mutates them in place — so a decision in one test would leak into the
       next. Restore the seed requests (and the school rows the decisions
       moved) through the public service API. */
    for (const [id, status] of Object.entries(SEED_REQUEST_STATUS)) {
      ApprovalRequestService.update(id, {
        status,
        missingItems: id === 'PB-2026-1041' ? ['certificate', 'contact'] : undefined,
        rejectionReason: id === 'PB-2026-1040' ? 'incomplete' : undefined,
        internalNotes: undefined,
      })
    }
    const taj = SchoolService.get('sch-taj-mirza')
    if (taj && taj.status !== 'pending') SchoolService.setStatus('sch-taj-mirza', 'pending', ACTOR)
    const cityView = SchoolService.get('sch-city-view')
    if (cityView && cityView.status !== 'rejected') {
      SchoolService.setStatus('sch-city-view', 'rejected', ACTOR)
    }
  })

  it('approves PB-2026-1042, writes one audit event, and activates Taj Mirza Academy', () => {
    expect(SchoolService.get('sch-taj-mirza')?.status).toBe('pending')
    const auditBefore = PlatformService.listAudit().length

    const result = ApprovalRequestService.decide('PB-2026-1042', 'approved', ACTOR)

    expect(result.ok).toBe(true)
    expect(result.ok && result.value.status).toBe('approved')
    expect(ApprovalRequestService.get('PB-2026-1042')?.status).toBe('approved')
    expect(SchoolService.get('sch-taj-mirza')?.status).toBe('active')
    const audit = PlatformService.listAudit()
    expect(audit.length).toBe(auditBefore + 1)
    const event = audit.find(
      (e) => e.action === 'school.approved' && e.targetId === 'sch-taj-mirza',
    )
    expect(event).toBeDefined()
    expect(event?.actorId).toBe(ACTOR.id)
  })

  it('reject without a reason fails and leaves the request pending', () => {
    const result = ApprovalRequestService.decide('PB-2026-1042', 'rejected', ACTOR, {})

    expect(result.ok).toBe(false)
    expect(ApprovalRequestService.get('PB-2026-1042')?.status).toBe('pending')
    expect(SchoolService.get('sch-taj-mirza')?.status).toBe('pending')
  })

  it('reject with a reason succeeds and rejects the school row', () => {
    const result = ApprovalRequestService.decide('PB-2026-1042', 'rejected', ACTOR, {
      rejectionReason: 'incomplete',
    })

    expect(result.ok).toBe(true)
    expect(result.ok && result.value.status).toBe('rejected')
    expect(result.ok && result.value.rejectionReason).toBe('incomplete')
    expect(SchoolService.get('sch-taj-mirza')?.status).toBe('rejected')
  })

  it('info-requested without missing items fails and leaves the request pending', () => {
    const result = ApprovalRequestService.decide('PB-2026-1042', 'info-requested', ACTOR, {})

    expect(result.ok).toBe(false)
    expect(ApprovalRequestService.get('PB-2026-1042')?.status).toBe('pending')
  })

  it('info-requested with missing items succeeds and stores them', () => {
    const result = ApprovalRequestService.decide('PB-2026-1042', 'info-requested', ACTOR, {
      missingItems: ['certificate', 'contact'],
    })

    expect(result.ok).toBe(true)
    expect(result.ok && result.value.status).toBe('info-requested')
    expect(result.ok && result.value.missingItems).toEqual(['certificate', 'contact'])
    // The school row stays pending while information is outstanding.
    expect(SchoolService.get('sch-taj-mirza')?.status).toBe('pending')
  })

  it('deciding an already-decided request (PB-2026-1040, rejected) fails', () => {
    expect(ApprovalRequestService.get('PB-2026-1040')?.status).toBe('rejected')

    const result = ApprovalRequestService.decide('PB-2026-1040', 'approved', ACTOR)

    expect(result.ok).toBe(false)
    expect(ApprovalRequestService.get('PB-2026-1040')?.status).toBe('rejected')
  })

  it('deciding an unknown request fails', () => {
    const result = ApprovalRequestService.decide('PB-2026-9999', 'approved', ACTOR)

    expect(result.ok).toBe(false)
  })

  it('saves internal notes via update()', () => {
    const updated = ApprovalRequestService.update('PB-2026-1042', {
      internalNotes: 'Called the principal; certificate is on its way.',
    })

    expect(updated?.internalNotes).toBe('Called the principal; certificate is on its way.')
    expect(ApprovalRequestService.get('PB-2026-1042')?.internalNotes).toBe(
      'Called the principal; certificate is on its way.',
    )
    // Saving notes does not change the request status.
    expect(ApprovalRequestService.get('PB-2026-1042')?.status).toBe('pending')
  })
})
