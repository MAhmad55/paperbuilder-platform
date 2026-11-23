import {
  LayoutDashboard, School, ClipboardCheck, ListChecks, BookOpen, Users,
  Megaphone, ShieldCheck, Settings, GraduationCap, UsersRound, CalendarDays,
  FileText, LayoutTemplate, BarChart3, Compass, Files, BookMarked,
  PenTool, Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '../services/types'

export interface NavItem {
  to: string
  icon: LucideIcon
  labelKey: string
  matchPrefix?: boolean
}

export const ROUTES = {
  designSystem: '/design-system',
  foundationTest: '/foundation-test',
  signIn: '/sign-in',
} as const

const DASHBOARD_ICON = LayoutDashboard
const DESIGN_ICON = Compass

export function railNavForRole(role: Role): NavItem[] {
  if (role === 'super-admin') {
    return [
      { to: '/admin', icon: DASHBOARD_ICON, labelKey: 'nav.dashboard' },
      { to: '/admin/schools', icon: School, labelKey: 'nav.schools' },
      { to: '/admin/approvals', icon: ClipboardCheck, labelKey: 'nav.approvals' },
      { to: '/admin/plans', icon: ListChecks, labelKey: 'nav.plansAndLimits' },
      { to: '/admin/bank', icon: BookOpen, labelKey: 'nav.questionBank' },
      { to: '/admin/users', icon: Users, labelKey: 'nav.users' },
      { to: '/admin/announcements', icon: Megaphone, labelKey: 'nav.announcements' },
      { to: '/admin/audit', icon: ShieldCheck, labelKey: 'nav.auditLog' },
      { to: '/admin/settings', icon: Settings, labelKey: 'nav.platformSettings' },
    ]
  }
  if (role === 'school-admin') {
    return [
      { to: '/school', icon: DASHBOARD_ICON, labelKey: 'nav.dashboard' },
      { to: '/school/approvals', icon: ClipboardCheck, labelKey: 'nav.approvals' },
      { to: '/school/teachers', icon: UsersRound, labelKey: 'nav.teachers' },
      { to: '/school/classes', icon: GraduationCap, labelKey: 'nav.classes' },
      { to: '/school/calendar', icon: CalendarDays, labelKey: 'nav.calendar' },
      { to: '/school/papers', icon: FileText, labelKey: 'nav.papers' },
      { to: '/school/templates', icon: LayoutTemplate, labelKey: 'nav.templates' },
      { to: '/school/reports', icon: BarChart3, labelKey: 'nav.reports' },
      { to: '/school/settings', icon: Wrench, labelKey: 'nav.schoolSettings' },
    ]
  }
  return [
    { to: '/teacher', icon: DASHBOARD_ICON, labelKey: 'nav.dashboard' },
    { to: '/teacher/studio', icon: PenTool, labelKey: 'nav.studio' },
    { to: '/teacher/papers', icon: Files, labelKey: 'nav.myPapers' },
    { to: '/teacher/templates', icon: LayoutTemplate, labelKey: 'nav.templates' },
    { to: '/teacher/questions', icon: BookMarked, labelKey: 'nav.savedQuestions' },
  ]
}

export function bottomTabsForRole(role: Role): NavItem[] {
  if (role === 'super-admin') {
    return [
      { to: '/admin', icon: DASHBOARD_ICON, labelKey: 'nav.dashboard' },
      { to: '/admin/schools', icon: School, labelKey: 'nav.schools' },
      { to: '/admin/approvals', icon: ClipboardCheck, labelKey: 'nav.approvals' },
      { to: '/admin/audit', icon: ShieldCheck, labelKey: 'nav.auditLog' },
    ]
  }
  if (role === 'school-admin') {
    return [
      { to: '/school', icon: DASHBOARD_ICON, labelKey: 'nav.dashboard' },
      { to: '/school/approvals', icon: ClipboardCheck, labelKey: 'nav.approvals' },
      { to: '/school/teachers', icon: UsersRound, labelKey: 'nav.teachers' },
      { to: '/school/papers', icon: FileText, labelKey: 'nav.papers' },
    ]
  }
  return [
    { to: '/teacher', icon: DASHBOARD_ICON, labelKey: 'nav.dashboard' },
    { to: '/teacher/studio', icon: PenTool, labelKey: 'nav.studio' },
    { to: '/teacher/papers', icon: Files, labelKey: 'nav.myPapers' },
    { to: '/teacher/questions', icon: BookMarked, labelKey: 'nav.savedQuestions' },
  ]
}

/** The "More" items — everything not in the bottom tabs, shown inside the drawer. */
export function moreItemsForRole(role: Role): NavItem[] {
  const rail = railNavForRole(role)
  const tabs = bottomTabsForRole(role)
  const tabTo = new Set(tabs.map(t => t.to))
  return rail.filter(item => !tabTo.has(item.to))
}

/** Design-system showcase is reachable from the shell (internal/demo). */
export const DESIGN_SYSTEM_ITEM: NavItem = { to: ROUTES.designSystem, icon: DESIGN_ICON, labelKey: 'nav.designSystem' }

export { type Role }

/** Maps a role slug to its i18n key (keys are not hyphenated). */
export const ROLE_KEY: Record<string, string> = { 'super-admin': 'roles.superAdmin', 'school-admin': 'roles.schoolAdmin', teacher: 'roles.teacher' }

export function roleLabelKey(role: string): string {
  return ROLE_KEY[role] ?? 'roles.teacher'
}
