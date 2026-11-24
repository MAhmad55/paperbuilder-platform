import { describe, it, expect, beforeEach } from 'vitest'
import {
  SharedService, PlatformService, resetMockData, TEACHERS, SUPER_ADMINS, SCHOOL_ADMINS,
} from './mock-store'
import {
  buildUserHistory, filterHistoryItems, mergeUserSettings, unreadCount,
  validatePasswordChange, validateProfileUpdate,
} from './shared'
import type { AuditEvent, Paper } from '../mock/data'

beforeEach(() => resetMockData())

const teacher = TEACHERS[0] // Usman Rizwan, Beacon
const superAdmin = SUPER_ADMINS[0]
const schoolAdmin = SCHOOL_ADMINS[0]

describe('user settings persistence', () => {
  it('defaults to English, both print languages, standard size, all notifications on', () => {
    const s = SharedService.getUserSettings(teacher.id)
    expect(s.language).toBe('en')
    expect(s.defaultPrintLanguage).toBe('both')
    expect(s.fontSize).toBe('standard')
    expect(s.notifications).toEqual({ approvals: true, comments: true, announcements: true, invitations: true })
  })

  it('round-trips a full update and merges notification prefs', () => {
    const next = SharedService.updateUserSettings(teacher.id, {
      language: 'ur',
      fontSize: 'large',
      notifications: { approvals: false },
    } as never)
    expect(next.language).toBe('ur')
    expect(next.fontSize).toBe('large')
    expect(next.notifications.approvals).toBe(false)
    expect(next.notifications.comments).toBe(true)
    const again = SharedService.getUserSettings(teacher.id)
    expect(again.language).toBe('ur')
    expect(again.fontSize).toBe('large')
  })

  it('resetMockData clears saved settings', () => {
    SharedService.updateUserSettings(teacher.id, { language: 'ur' })
    resetMockData()
    expect(SharedService.getUserSettings(teacher.id).language).toBe('en')
  })

  it('mergeUserSettings fills missing branches from defaults', () => {
    expect(mergeUserSettings(undefined).language).toBe('en')
    expect(mergeUserSettings({ notifications: { comments: false } } as never).notifications.approvals).toBe(true)
  })
})

describe('profile update validation', () => {
  it('rejects an empty name, a bad email and a bad phone', () => {
    expect(validateProfileUpdate({ name: '  ' })).toContain('name-required')
    expect(validateProfileUpdate({ email: 'not-an-email' })).toContain('email-invalid')
    expect(validateProfileUpdate({ phone: 'abc' })).toContain('phone-invalid')
    expect(validateProfileUpdate({ name: 'New Name', email: 'a@b.pk', phone: '03001234567' })).toEqual([])
  })

  it('persists a name edit and shows it through listUsers', () => {
    const result = SharedService.updateProfile(teacher.id, { name: 'Usman R. Updated' }, teacher)
    expect(result.ok).toBe(true)
    expect(PlatformService.listUsers().find((u) => u.id === teacher.id)?.name).toBe('Usman R. Updated')
  })

  it('rejects an invalid update without touching the stored name', () => {
    const result = SharedService.updateProfile(teacher.id, { name: '' }, teacher)
    expect(result.ok).toBe(false)
    expect(PlatformService.listUsers().find((u) => u.id === teacher.id)?.name).toBe(teacher.name)
  })

  it('resetMockData clears a profile edit', () => {
    SharedService.updateProfile(teacher.id, { name: 'Changed' }, teacher)
    resetMockData()
    expect(PlatformService.listUsers().find((u) => u.id === teacher.id)?.name).toBe(teacher.name)
  })

  it('password change needs 8+ chars, a match and a different value', () => {
    expect(validatePasswordChange({ current: 'oldpass1', next: 'short', confirm: 'short' })).toContain('password-too-short')
    expect(validatePasswordChange({ current: 'oldpass1', next: 'newpassword', confirm: 'other' })).toContain('password-mismatch')
    expect(validatePasswordChange({ current: 'samepass1', next: 'samepass1', confirm: 'samepass1' })).toContain('password-same-as-current')
    expect(validatePasswordChange({ current: '', next: 'newpassword', confirm: 'newpassword' })).toContain('current-required')
    expect(validatePasswordChange({ current: 'oldpass1', next: 'newpassword', confirm: 'newpassword' })).toEqual([])
    expect(SharedService.changePassword(teacher.id, { current: 'oldpass1', next: 'newpassword', confirm: 'newpassword' }, teacher).ok).toBe(true)
  })
})

describe('notifications read/unread', () => {
  it('counts unread for the demo users and drops to zero on mark-all-read', () => {
    const before = SharedService.unreadNotificationCount(teacher.id)
    expect(before).toBeGreaterThan(0)
    PlatformService.markAllNotificationsRead(teacher.id)
    expect(SharedService.unreadNotificationCount(teacher.id)).toBe(0)
  })

  it('marks one notification read without touching the others', () => {
    const list = PlatformService.listNotifications(teacher.id)
    const first = list.find((n) => !n.read)!
    const before = SharedService.unreadNotificationCount(teacher.id)
    PlatformService.markNotificationRead(first.id)
    expect(SharedService.unreadNotificationCount(teacher.id)).toBe(before - 1)
    expect(PlatformService.listNotifications(teacher.id).find((n) => n.id === first.id)?.read).toBe(true)
  })

  it('unreadCount is a pure count of unread items', () => {
    expect(unreadCount([{ read: true }, { read: false }, { read: false }] as never)).toBe(2)
  })

  it('resetMockData restores the seeded unread counts', () => {
    const before = SharedService.unreadNotificationCount(superAdmin.id)
    PlatformService.markAllNotificationsRead(superAdmin.id)
    resetMockData()
    expect(SharedService.unreadNotificationCount(superAdmin.id)).toBe(before)
  })
})

describe('history filters', () => {
  const audit: AuditEvent[] = [
    { id: 'a1', actorId: teacher.id, actorName: teacher.name, action: 'paper.submitted', targetType: 'paper', targetId: 'paper-001', targetLabel: 'Paper one', createdAt: '2026-11-20T10:00:00.000Z' },
    { id: 'a2', actorId: schoolAdmin.id, actorName: schoolAdmin.name, action: 'paper.approved', targetType: 'paper', targetId: 'paper-001', targetLabel: 'Paper one', createdAt: '2026-11-21T10:00:00.000Z' },
    { id: 'a3', actorId: teacher.id, actorName: teacher.name, action: 'school.settings-changed', targetType: 'school', targetId: 'sch-beacon', targetLabel: 'Beacon', createdAt: '2026-11-22T10:00:00.000Z' },
  ]
  const papers: Paper[] = [
    {
      id: 'paper-001', title: 'Paper one', schoolId: 'sch-beacon', teacherId: teacher.id,
      classId: 'class-9', subjectId: 'math', medium: 'english', examType: 'monthly', term: 'first',
      examDate: '2026-12-01', status: 'approved', targetMarks: 75, sections: [], chapterIds: [],
      questions: [], instructions: [], durationMinutes: 150, rollNumberBlock: true, answerKey: true,
      history: [
        { id: 'h1', actorId: teacher.id, actorName: teacher.name, actorRole: 'teacher', action: 'created', createdAt: '2026-11-19T09:00:00.000Z' },
        { id: 'h2', actorId: teacher.id, actorName: teacher.name, actorRole: 'teacher', action: 'submitted', createdAt: '2026-11-20T10:00:00.000Z' },
      ],
      createdAt: '2026-11-19T09:00:00.000Z', updatedAt: '2026-11-21T10:00:00.000Z', printedAt: null,
    },
  ]

  it('builds the teacher history from audit + paper history without duplicates', () => {
    const items = buildUserHistory(teacher.id, audit, papers)
    // submitted appears in both audit and paper history — kept once
    expect(items.filter((i) => i.action === 'submitted' || i.action === 'paper.submitted')).toHaveLength(1)
    expect(items.some((i) => i.action === 'created')).toBe(true)
    expect(items.some((i) => i.action === 'school.settings-changed')).toBe(true)
    expect(items[0].createdAt >= items[items.length - 1].createdAt).toBe(true)
  })

  it('excludes other users’ papers and actions', () => {
    const items = buildUserHistory(superAdmin.id, audit, papers)
    expect(items.some((i) => i.action === 'created')).toBe(false)
  })

  it('filters by type and by date range', () => {
    const items = buildUserHistory(teacher.id, audit, papers)
    expect(filterHistoryItems(items, { type: 'paper' }).every((i) => i.kind === 'paper')).toBe(true)
    expect(filterHistoryItems(items, { type: 'paper' }).length).toBeGreaterThan(0)
    const ranged = filterHistoryItems(items, { from: '2026-11-21', to: '2026-11-22' })
    expect(ranged.length).toBeGreaterThan(0)
    expect(ranged.every((i) => i.createdAt.slice(0, 10) >= '2026-11-21' && i.createdAt.slice(0, 10) <= '2026-11-22')).toBe(true)
    expect(filterHistoryItems(items, { from: '2026-12-01' })).toHaveLength(0)
  })

  it('the store history for the demo teacher is non-empty', () => {
    expect(SharedService.listUserHistory(teacher.id).length).toBeGreaterThan(0)
    expect(SharedService.listUserHistory(teacher.id, { type: 'print' }).every((i) => i.kind === 'print')).toBe(true)
  })
})
