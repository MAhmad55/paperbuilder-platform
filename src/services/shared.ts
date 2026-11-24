import type { AppNotification, AuditEvent, Paper } from '../mock/data'
import type { Role } from './types'

/* ------------------------------------------------------------------
   Shared screens (Phase 6, blueprint 4.5) — pure helpers + types.
   The store owns persistence; this module owns the rules so the unit
   tests can exercise them without the store.
------------------------------------------------------------------- */

/* ---------------- User settings ---------------- */

export type PrintLanguage = 'en' | 'ur' | 'both'
export type FontSize = 'standard' | 'large'

export interface NotificationPreferences {
  approvals: boolean
  comments: boolean
  announcements: boolean
  invitations: boolean
}

export interface UserSettings {
  /** Interface language; changing it switches the whole app (same mechanism as the TopBar toggle). */
  language: 'en' | 'ur'
  defaultPrintLanguage: PrintLanguage
  fontSize: FontSize
  notifications: NotificationPreferences
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  language: 'en',
  defaultPrintLanguage: 'both',
  fontSize: 'standard',
  notifications: { approvals: true, comments: true, announcements: true, invitations: true },
}

export function mergeUserSettings(patch: Partial<UserSettings> | undefined): UserSettings {
  return {
    ...DEFAULT_USER_SETTINGS,
    ...patch,
    notifications: { ...DEFAULT_USER_SETTINGS.notifications, ...(patch?.notifications ?? {}) },
  }
}

export const FONT_SIZE_STORAGE_KEY = 'paperbuilder.fontSize'

/** Apply the font-size choice immediately: a root attribute the CSS reads,
    persisted so it survives a reload (main.tsx applies it at startup). */
export function applyFontSize(size: FontSize): void {
  try {
    document.documentElement.dataset.fontSize = size
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, size)
  } catch {
    /* non-browser environment (tests) */
  }
}

export function initialFontSize(): FontSize {
  try {
    return localStorage.getItem(FONT_SIZE_STORAGE_KEY) === 'large' ? 'large' : 'standard'
  } catch {
    return 'standard'
  }
}

/* ---------------- Profile validation ---------------- */

export interface ProfilePatch {
  name?: string
  email?: string
  phone?: string
  avatar?: string
}

export function validateProfileUpdate(patch: ProfilePatch): string[] {
  const errors: string[] = []
  if (patch.name !== undefined && !patch.name.trim()) errors.push('name-required')
  if (patch.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patch.email.trim())) {
    errors.push('email-invalid')
  }
  if (patch.phone !== undefined && patch.phone.trim() !== '' && !/^[+0-9][0-9\s-]{6,14}$/.test(patch.phone.trim())) {
    errors.push('phone-invalid')
  }
  return errors
}

export interface PasswordChangeInput {
  current: string
  next: string
  confirm: string
}

export function validatePasswordChange(input: PasswordChangeInput): string[] {
  const errors: string[] = []
  if (!input.current) errors.push('current-required')
  if (input.next.length < 8) errors.push('password-too-short')
  if (input.next !== input.confirm) errors.push('password-mismatch')
  if (input.next && input.next === input.current) errors.push('password-same-as-current')
  return errors
}

/** Avatar choices: initials (default) or one of the seeded colour keys. */
export const AVATAR_CHOICES = ['initials', 'navy', 'slate', 'red', 'amber'] as const
export type AvatarChoice = (typeof AVATAR_CHOICES)[number]

/* ---------------- History ---------------- */

export type HistoryKind = 'paper' | 'approval' | 'print' | 'edit' | 'school' | 'system'

export interface HistoryItem {
  id: string
  kind: HistoryKind
  /** Audit action or paper-history action, e.g. 'paper.approved' / 'submitted'. */
  action: string
  label: string
  createdAt: string
  targetType?: string
  targetId?: string
}

export interface HistoryFilter {
  type?: HistoryKind | 'all'
  from?: string // ISO date, inclusive
  to?: string // ISO date, inclusive
}

function kindOfAction(action: string): HistoryKind {
  if (action === 'paper.printed' || action === 'printed') return 'print'
  if (action.startsWith('paper.') || action === 'created' || action === 'submitted'
    || action === 'approved' || action === 'changes-requested' || action === 'archived'
    || action === 'in-review') return 'approval'
  if (action === 'edited') return 'edit'
  if (action.startsWith('school.') || action.startsWith('teacher.') || action.startsWith('user.')) return 'school'
  return 'system'
}

/**
 * Personal history for one user: audit events they acted on, audit events
 * on their papers, and paper-history entries on their own papers (created,
 * submitted, approved, printed, changes requested). Newest first.
 */
export function buildUserHistory(
  userId: string,
  audit: AuditEvent[],
  papers: Paper[],
): HistoryItem[] {
  const ownPaperIds = new Set(papers.filter((p) => p.teacherId === userId).map((p) => p.id))
  const items: HistoryItem[] = []
  for (const e of audit) {
    if (e.actorId === userId || (e.targetType === 'paper' && ownPaperIds.has(e.targetId))) {
      items.push({
        id: `hist-${e.id}`,
        kind: kindOfAction(e.action),
        action: e.action,
        label: e.targetLabel,
        createdAt: e.createdAt,
        targetType: e.targetType,
        targetId: e.targetId,
      })
    }
  }
  for (const p of papers) {
    if (p.teacherId !== userId) continue
    for (const h of p.history ?? []) {
      items.push({
        id: `hist-${h.id}`,
        kind: h.action === 'printed' ? 'print' : h.action === 'edited' ? 'edit' : h.action === 'created' ? 'paper' : 'approval',
        action: h.action,
        label: p.title,
        createdAt: h.createdAt,
        targetType: 'paper',
        targetId: p.id,
      })
    }
  }
  const seen = new Set<string>()
  return items
    .filter((i) => {
      // A paper transition writes both a history entry and an audit event
      // for the same moment — keep one row per (action, paper, minute).
      // History actions are bare ('submitted'); audit actions are prefixed
      // ('paper.submitted'), so normalise before comparing.
      const key = `${i.action.replace(/^paper\./, '')}|${i.targetId ?? ''}|${i.createdAt.slice(0, 16)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function filterHistoryItems(items: HistoryItem[], filter: HistoryFilter): HistoryItem[] {
  return items.filter((i) => {
    if (filter.type && filter.type !== 'all' && i.kind !== filter.type) return false
    const day = i.createdAt.slice(0, 10)
    if (filter.from && day < filter.from) return false
    if (filter.to && day > filter.to) return false
    return true
  })
}

/* ---------------- Notifications ---------------- */

/** Where a notification click goes for this role; null means the
    notification has no dedicated page for the role (stays put + toast). */
export function notificationTarget(n: AppNotification, role: Role): string | null {
  if (n.targetType === 'paper' && n.targetId) {
    if (role === 'teacher') return `/teacher/papers/${n.targetId}`
    if (role === 'school-admin') return '/school/papers'
    return '/admin/schools'
  }
  if (n.targetType === 'approval') {
    if (role === 'super-admin') return '/admin/approvals'
    if (role === 'school-admin') return '/school/approvals'
    return '/teacher/papers'
  }
  if (n.targetType === 'teachers') {
    if (role === 'school-admin') return '/school/teachers'
    if (role === 'super-admin') return '/admin/users'
    return '/teacher'
  }
  if (n.targetType === 'announcement') {
    if (role === 'super-admin') return '/admin/announcements'
    return null
  }
  return null
}

export function unreadCount(notifications: AppNotification[]): number {
  return notifications.filter((n) => !n.read).length
}
