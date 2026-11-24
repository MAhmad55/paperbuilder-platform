import { useAuth } from '../../shell/AuthContext'
import { SchoolService } from '../../services/mock-store'
import { CLASSES, SUBJECTS } from '../../mock/data'
import type { Person, School } from '../../mock/data'
import type { AppLanguage } from '../../i18n'
import { demoModeOf, useSchoolDemo } from '../school/shared'

export { demoModeOf, useSchoolDemo }
export type { DemoMode } from '../school/shared'

/** The signed-in user (the shell guarantees a session on these routes). */
export function useSharedUser(): Person | null {
  const { currentUser } = useAuth()
  return currentUser
}

export function userSchool(user: Person | null): School | undefined {
  return user?.schoolId ? SchoolService.get(user.schoolId) : undefined
}

export function subjectName(id: string, lang: AppLanguage): string {
  const s = SUBJECTS.find((x) => x.id === id)
  return s ? (lang === 'ur' ? s.nameUr : s.nameEn) : id
}

export function className(id: string): string {
  return CLASSES.find((c) => c.id === id)?.name ?? id
}

/** Avatar colour choices (seeded, no upload in the mock phase). */
export const AVATAR_COLOURS: Record<string, { bg: string; fg: string }> = {
  initials: { bg: 'var(--ink-100)', fg: 'var(--ink-700)' },
  navy: { bg: '#1E2A78', fg: '#FFFFFF' },
  slate: { bg: '#4A5470', fg: '#FFFFFF' },
  red: { bg: '#C92A45', fg: '#FFFFFF' },
  amber: { bg: '#FFD84D', fg: '#0F1733' },
}

/** Legacy avatar keys and the current key they map to. */
const LEGACY_AVATAR_KEYS: Record<string, string> = { green: 'slate' }

/** Resolve a stored avatar key to a current choice ('green' → 'slate'). */
export function normalizeAvatarChoice(key: string | undefined): string {
  const resolved = LEGACY_AVATAR_KEYS[key ?? ''] ?? key ?? 'initials'
  return AVATAR_COLOURS[resolved] ? resolved : 'initials'
}

/** Resolve an avatar key to its colours; legacy and unknown keys fall back safely. */
export function avatarColour(key: string): { bg: string; fg: string } {
  return AVATAR_COLOURS[normalizeAvatarChoice(key)] ?? AVATAR_COLOURS.initials
}

export function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || '?'
}
