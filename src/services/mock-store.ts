import {
  SCHOOLS, TEACHERS, SUPER_ADMINS, SCHOOL_ADMINS, USERS, PAPERS, PLANS, AUDIT_EVENTS,
  NOTIFICATIONS, EXAMS, TEMPLATES, SAVED_QUESTIONS, CLASSES, SUBJECTS, CHAPTERS,
  APPROVAL_REQUESTS, ANNOUNCEMENTS, DEFAULT_PLATFORM_SETTINGS,
  personRole, currentMarks,
} from '../mock/data'
import type {
  School, Paper, PaperStatus, Person, PersonRole, Plan, PlanId, AuditEvent, AppNotification,
  Exam, Template, SavedQuestion, Medium, ExamType, Term, AuditAction,
  ApprovalRequest, ApprovalRequestStatus, ApprovalTimelineEvent,
  ApprovalMissingItem, Announcement, AnnouncementTarget, AnnouncementStatus, PlatformSettings,
} from '../mock/data'
import type { Session, Role, PaperFilter, Result } from './types'
import { PAPER_TRANSITIONS, canTransition, validateTransition, type ActorRole } from './paper-transitions'
import type { SchoolStatus } from '../mock/data'
import { validatePlanLimits, applyPlanLimits, type PlanLimitPatch } from './plan-limits'

/* ------------------------------------------------------------------
   Mock store — in-memory + localStorage persistence.
   The real question bank will implement QuestionBankProvider only.
------------------------------------------------------------------- */

const STORAGE_KEY = 'paperbuilder.v1'

interface PersistedState {
  papers: Paper[]
  audit: typeof AUDIT_EVENTS
  notifications: typeof NOTIFICATIONS
  session: Session | null
  schoolOverrides: Record<string, SchoolStatus>
  approvalRequests: ApprovalRequest[]
  /** B5: per-plan limit edits (applied over the PLANS seed). */
  planOverrides: Record<string, PlanLimitPatch>
  /** B3: per-school plan changes (school id -> plan id). */
  schoolPlanOverrides: Record<string, PlanId>
  /** B7: per-user status changes (user id -> status). */
  userStatusOverrides: Record<string, Person['status']>
  /** B7: platform users invited from the admin screen. */
  invitedUsers: Person[]
  /** B8: platform announcements (seed + created). */
  announcements: Announcement[]
  /** B10: platform settings. */
  platformSettings: PlatformSettings
}

function loadPersisted(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedState
    if (!parsed || !Array.isArray(parsed.papers) || !Array.isArray(parsed.audit)) return null
    return parsed
  } catch {
    return null
  }
}

function persist(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* storage full or unavailable — keep in-memory */
  }
}

function seed(): PersistedState {
  // Deep-copy the seed collections: the store mutates paper/request/
  // notification objects in place, so a shallow copy would let a decision
  // leak into the next reset (and across tests).
  const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))
  return {
    papers: clone(PAPERS),
    audit: clone(AUDIT_EVENTS),
    notifications: clone(NOTIFICATIONS),
    session: loadPersisted()?.session ?? null,
    schoolOverrides: {},
    approvalRequests: clone(APPROVAL_REQUESTS),
    planOverrides: {},
    schoolPlanOverrides: {},
    userStatusOverrides: {},
    invitedUsers: [],
    announcements: clone(ANNOUNCEMENTS),
    platformSettings: clone(DEFAULT_PLATFORM_SETTINGS),
  }
}

let state: PersistedState = loadPersisted() ?? seed()

/* States persisted before a field existed lack it — fill from seed. */
if (!Array.isArray(state.approvalRequests)) {
  state.approvalRequests = [...APPROVAL_REQUESTS]
}
if (!state.planOverrides) state.planOverrides = {}
if (!state.schoolPlanOverrides) state.schoolPlanOverrides = {}
if (!state.userStatusOverrides) state.userStatusOverrides = {}
if (!Array.isArray(state.invitedUsers)) state.invitedUsers = []
if (!Array.isArray(state.announcements)) state.announcements = [...ANNOUNCEMENTS]
if (!state.platformSettings) state.platformSettings = { ...DEFAULT_PLATFORM_SETTINGS }

function save() {
  persist(state)
}

/* ---------------- Session mapping (demo auth) ---------------- */

const DEMO_USERS: Record<Role, string> = {
  'super-admin': SUPER_ADMINS[0].id,
  'school-admin': SCHOOL_ADMINS[0].id,
  'teacher': TEACHERS[0].id,
}

/* ---------------- Auth ---------------- */

function getSession(): Session | null {
  return state.session
}

function currentUser(): Person | null {
  if (!state.session) return null
  return USERS.find(u => u.id === state.session!.userId) ?? null
}

function signIn(role: Role): Session {
  const userId = DEMO_USERS[role]
  const schoolId = role === 'teacher'
    ? (TEACHERS[0].schoolId)
    : (role === 'school-admin' ? (SCHOOL_ADMINS[0].schoolId) : null)
  const session: Session = { role, userId, schoolId, signedInAt: new Date().toISOString() }
  state.session = session
  save()
  return session
}

function signOut() {
  state.session = null
  save()
}

function switchRole(role: Role): Session {
  return signIn(role)
}

/* ---------------- Schools ---------------- */

function listSchools(): School[] {
  return SCHOOLS.map(s => {
    const teachers = TEACHERS.filter(t => t.schoolId === s.id)
    const papers = state.papers.filter(p => p.schoolId === s.id)
    return {
      ...s,
      status: state.schoolOverrides[s.id] ?? s.status,
      plan: state.schoolPlanOverrides[s.id] ?? s.plan,
      teacherCount: teachers.length,
      paperCount: papers.length,
    }
  })
}

function getSchool(id: string): School | undefined {
  return listSchools().find(s => s.id === id)
}

/** Find a seeded school by its (display) name — links an approval request to its school row. */
function getSchoolByName(name: string): School | undefined {
  return listSchools().find(s => s.name.toLowerCase() === name.toLowerCase())
}

/** Quiet status change used by approval decisions (writes no audit of its own). */
function setSchoolStatusQuiet(id: string, status: School['status']) {
  state.schoolOverrides[id] = status
}

function setSchoolStatus(id: string, status: School['status'], actor: Person): Result<School> {
  const school = SCHOOLS.find(s => s.id === id)
  if (!school) return { ok: false, error: 'School not found' }
  const current = state.schoolOverrides[id] ?? school.status
  if (current === status) return { ok: false, error: 'School is already in this state' }
  state.schoolOverrides[id] = status
  state.audit.unshift({
    id: `aud-${Date.now().toString(36)}`,
    actorId: actor.id,
    actorName: actor.name,
    action: status === 'active' ? 'school.reactivated'
      : status === 'suspended' ? 'school.suspended'
      : status === 'rejected' ? 'school.rejected'
      : 'school.approved',
    targetType: 'school',
    targetId: school.id,
    targetLabel: school.name,
    createdAt: new Date().toISOString(),
  })
  save()
  return { ok: true, value: { ...school, status } }
}

/** Change a school's plan (B3). Writes a school.plan-changed audit event. */
function setSchoolPlan(id: string, planId: PlanId, actor: Person): Result<School> {
  const school = getSchool(id)
  if (!school) return { ok: false, error: 'School not found' }
  if (!PLANS.some(p => p.id === planId)) return { ok: false, error: 'Unknown plan' }
  if (school.plan === planId) return { ok: false, error: 'School is already on this plan' }
  state.schoolPlanOverrides[id] = planId
  state.audit.unshift({
    id: `aud-${Date.now().toString(36)}`,
    actorId: actor.id,
    actorName: actor.name,
    action: 'school.plan-changed',
    targetType: 'school',
    targetId: school.id,
    targetLabel: school.name,
    createdAt: new Date().toISOString(),
  })
  save()
  return { ok: true, value: { ...school, plan: planId } }
}

/* ---------------- Papers ---------------- */



function listPapers(filter: PaperFilter = {}): Paper[] {
  let papers = [...state.papers]
  if (filter.schoolId) papers = papers.filter(p => p.schoolId === filter.schoolId)
  if (filter.teacherId) papers = papers.filter(p => p.teacherId === filter.teacherId)
  if (filter.status && filter.status !== 'all') papers = papers.filter(p => p.status === filter.status)
  if (filter.subjectId) papers = papers.filter(p => p.subjectId === filter.subjectId)
  if (filter.classId) papers = papers.filter(p => p.classId === filter.classId)
  if (filter.search) {
    const q = filter.search.toLowerCase()
    papers = papers.filter(p => {
      const subject = SUBJECTS.find(s => s.id === p.subjectId)
      const cls = CLASSES.find(c => c.id === p.classId)
      const teacher = TEACHERS.find(t => t.id === p.teacherId)
      return [p.title, subject?.nameEn, subject?.nameUr, cls?.name, teacher?.name]
        .filter(Boolean).some(v => v!.toLowerCase().includes(q))
    })
  }
  return papers
}

function getPaper(id: string): Paper | undefined {
  return state.papers.find(p => p.id === id)
}

function createPaper(input: {
  schoolId: string; teacherId: string; classId: string; subjectId: string
  medium: Medium; examType: ExamType; term: Term; examDate: string
  chapterIds: string[]; targetMarks: number; sections: Paper['sections']
}, actor: Person): Result<Paper> {
  const cls = CLASSES.find(c => c.id === input.classId)
  const subject = SUBJECTS.find(s => s.id === input.subjectId)
  if (!cls || !subject) return { ok: false, error: 'Unknown class or subject' }
  const id = `paper-${String(state.papers.length + 1).padStart(3, '0')}`
  const now = new Date().toISOString()
  const paper: Paper = {
    id,
    title: `${subject.nameEn} — ${input.term} (${cls.name})`,
    schoolId: input.schoolId,
    teacherId: input.teacherId,
    classId: input.classId,
    subjectId: input.subjectId,
    medium: input.medium,
    examType: input.examType,
    term: input.term,
    examDate: input.examDate,
    status: 'draft',
    targetMarks: input.targetMarks,
    sections: input.sections,
    chapterIds: input.chapterIds,
    history: [{
      id: `hst-${Date.now().toString(36)}`,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'created',
      createdAt: now,
    }],
    createdAt: now,
    updatedAt: now,
    printedAt: null,
  }
  state.papers.push(paper)
  save()
  return { ok: true, value: paper }
}

function transitionPaper(id: string, target: PaperStatus, actor: Person, comment?: string): Result<Paper> {
  const paper = getPaper(id)
  if (!paper) return { ok: false, error: 'Paper not found' }
  const school = SCHOOLS.find(s => s.id === paper.schoolId)
  const optionalPolicy = school?.approvalPolicy === 'optional'
  const check = validateTransition(paper.status, target, actor.role as ActorRole, { optionalPolicy }, comment)
  if (!check.ok) return { ok: false, error: check.error }
  const historyAction =
    target === 'submitted' ? 'submitted' :
    target === 'approved' ? 'approved' :
    target === 'changes-requested' ? 'changes-requested' :
    target === 'archived' ? 'archived' :
    target === 'printed' ? 'printed' : 'edited'
  paper.history.push({
    id: `hst-${Date.now().toString(36)}`,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: historyAction,
    comment: comment?.trim() || undefined,
    createdAt: new Date().toISOString(),
  })
  paper.status = target
  paper.updatedAt = new Date().toISOString()
  if (target === 'printed') paper.printedAt = paper.updatedAt
  const targetType = 'paper'
  const actionAudit: AuditAction =
    target === 'submitted' ? 'paper.submitted' :
    target === 'approved' ? 'paper.approved' :
    target === 'printed' ? 'paper.printed' : 'paper.submitted'
  state.audit.unshift({
    id: `aud-${Date.now().toString(36)}`,
    actorId: actor.id,
    actorName: actor.name,
    action: actionAudit,
    targetType,
    targetId: paper.id,
    targetLabel: paper.title,
    createdAt: new Date().toISOString(),
  })
  save()
  return { ok: true, value: paper }
}

/* ---------------- Question bank ---------------- */

function getChapters(subjectId: string) {
  return CHAPTERS.filter(c => c.subjectId === subjectId)
}

function getQuestionCounts(chapterId: string) {
  const chapter = CHAPTERS.find(c => c.id === chapterId)
  return chapter?.counts ?? { mcq: 0, short: 0, long: 0 }
}

function autoFill(input: {
  subjectId: string; chapterIds: string[]; sections: Paper['sections']
}): Result<{ chapterId: string; type: 'mcq' | 'short' | 'long'; marks: number; text: string }[]> {
  const chapters = CHAPTERS.filter(c => input.chapterIds.includes(c.id) && c.subjectId === input.subjectId)
  if (!chapters.length) return { ok: false, error: 'No chapters match the scope' }
  const questions: { chapterId: string; type: 'mcq' | 'short' | 'long'; marks: number; text: string }[] = []
  for (const [i, section] of input.sections.entries()) {
    const chapter = chapters[i % chapters.length]
    for (let q = 0; q < section.questionCount; q++) {
      questions.push({
        chapterId: chapter.id,
        type: section.type,
        marks: section.marksPerQuestion,
        text: `${chapter.nameEn} — sample question ${q + 1} (${section.type.toUpperCase()})`,
      })
    }
  }
  return { ok: true, value: questions }
}

/* ---------------- Platform ---------------- */

function listAudit() { return state.audit }
function listNotifications(userId?: string) {
  const items = userId ? state.notifications.filter(n => n.userId === userId) : state.notifications
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function markNotificationRead(id: string) {
  const n = state.notifications.find(x => x.id === id)
  if (!n) return undefined
  n.read = true
  save()
  return n
}

function markAllNotificationsRead(userId: string) {
  for (const n of state.notifications) if (n.userId === userId) n.read = true
  save()
}

/* ---------------- Approval requests (school onboarding, B3/B4) ---------------- */

/**
 * Next reference number: PB-<year>-<sequence>, continuing from the highest
 * existing sequence so references never collide with the seed data
 * (seed ends at PB-2026-1042, so the first new request is PB-2026-1043).
 */
function nextApprovalReference(): string {
  const year = new Date().getFullYear()
  let max = 1042
  for (const r of state.approvalRequests) {
    const m = /^PB-(\d{4})-(\d+)$/.exec(r.id)
    if (m && Number(m[1]) === year) max = Math.max(max, Number(m[2]))
  }
  return `PB-${year}-${max + 1}`
}

/** Expected decision date: 2 working days after submission (skips Sat/Sun). */
function expectedDecisionDate(fromIso: string): string {
  const d = new Date(fromIso)
  let remaining = 2
  while (remaining > 0) {
    d.setDate(d.getDate() + 1)
    const day = d.getDay()
    if (day !== 0 && day !== 6) remaining -= 1
  }
  return d.toISOString()
}

function listApprovalRequests(): ApprovalRequest[] {
  return [...state.approvalRequests].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
}

function getApprovalRequest(id: string): ApprovalRequest | undefined {
  return state.approvalRequests.find(r => r.id === id)
}

function getLatestApprovalRequest(): ApprovalRequest | undefined {
  return listApprovalRequests()[0]
}

function createApprovalRequest(input: {
  schoolName: string; city: string; planId: ApprovalRequest['planId']; contactName: string
  contactRole?: string; contactPhone?: string; contactEmail?: string
  address?: string; board?: string; studentsRange?: string; schoolType?: string
  notes?: string; documentNames?: string[]
}): ApprovalRequest {
  const now = new Date().toISOString()
  const request: ApprovalRequest = {
    id: nextApprovalReference(),
    schoolName: input.schoolName,
    city: input.city,
    status: 'pending',
    submittedAt: now,
    expectedBy: expectedDecisionDate(now),
    planId: input.planId,
    contactName: input.contactName,
    contactRole: input.contactRole,
    contactPhone: input.contactPhone,
    contactEmail: input.contactEmail,
    address: input.address,
    board: input.board,
    studentsRange: input.studentsRange,
    schoolType: input.schoolType,
    notes: input.notes,
    documentNames: input.documentNames ?? [],
    timeline: [{ id: `tl-${Date.now().toString(36)}`, type: 'submitted', at: now }],
  }
  state.approvalRequests.unshift(request)
  save()
  return request
}

function updateApprovalRequest(
  id: string,
  patch: Partial<Pick<ApprovalRequest, 'status' | 'missingItems' | 'rejectionReason' | 'documentNames' | 'internalNotes'>>,
  timelineType?: ApprovalTimelineEvent['type'],
): ApprovalRequest | undefined {
  const request = getApprovalRequest(id)
  if (!request) return undefined
  Object.assign(request, patch)
  if (timelineType) {
    request.timeline.push({
      id: `tl-${Date.now().toString(36)}`,
      type: timelineType,
      at: new Date().toISOString(),
    })
  }
  save()
  return request
}

/**
 * Resubmit after information was requested: the same reference goes back
 * to pending with a "resubmitted" timeline event (no new reference).
 */
function resubmitApprovalRequest(
  id: string,
  input: Parameters<typeof createApprovalRequest>[0],
): ApprovalRequest | undefined {
  const request = getApprovalRequest(id)
  if (!request) return undefined
  Object.assign(request, {
    schoolName: input.schoolName,
    city: input.city,
    planId: input.planId,
    contactName: input.contactName,
    contactRole: input.contactRole,
    contactPhone: input.contactPhone,
    contactEmail: input.contactEmail,
    address: input.address,
    board: input.board,
    studentsRange: input.studentsRange,
    schoolType: input.schoolType,
    notes: input.notes,
    documentNames: input.documentNames ?? [],
    status: 'pending' as ApprovalRequestStatus,
    missingItems: undefined,
  })
  request.timeline.push({
    id: `tl-${Date.now().toString(36)}`,
    type: 'resubmitted',
    at: new Date().toISOString(),
  })
  save()
  return request
}

export type ApprovalDecision = 'approved' | 'info-requested' | 'rejected'

/**
 * Super Admin decision on an approval request (B4). This is the one place
 * that changes what the school sees on /request-status: the request status
 * flips, the timeline gains an event, and the matching school row follows
 * (approved -> active, rejected -> rejected). Every decision writes one
 * audit event. Info-requested requires missingItems; rejected requires a
 * reason; both are validated here so the UI cannot send an empty one.
 */
function decideApprovalRequest(
  id: string,
  decision: ApprovalDecision,
  actor: Person,
  opts: { missingItems?: ApprovalMissingItem[]; rejectionReason?: string; internalNotes?: string } = {},
): Result<ApprovalRequest> {
  const request = getApprovalRequest(id)
  if (!request) return { ok: false, error: 'Request not found' }
  if (request.status !== 'pending' && request.status !== 'info-requested') {
    return { ok: false, error: 'Request already decided' }
  }
  if (decision === 'info-requested' && (!opts.missingItems || opts.missingItems.length === 0)) {
    return { ok: false, error: 'Choose what is missing' }
  }
  if (decision === 'rejected' && !opts.rejectionReason?.trim()) {
    return { ok: false, error: 'A reason is required' }
  }
  const status: ApprovalRequestStatus = decision === 'approved' ? 'approved' : decision
  const timelineType: ApprovalTimelineEvent['type'] = decision
  request.status = status
  request.missingItems = decision === 'info-requested' ? opts.missingItems : undefined
  request.rejectionReason = decision === 'rejected' ? opts.rejectionReason!.trim() : undefined
  if (opts.internalNotes !== undefined) request.internalNotes = opts.internalNotes
  request.timeline.push({
    id: `tl-${Date.now().toString(36)}`,
    type: timelineType,
    at: new Date().toISOString(),
  })
  // The school row follows the decision (quiet — the audit below is the record).
  const school = getSchoolByName(request.schoolName)
  if (school) {
    if (decision === 'approved') setSchoolStatusQuiet(school.id, 'active')
    if (decision === 'rejected') setSchoolStatusQuiet(school.id, 'rejected')
  }
  const action: AuditAction = decision === 'approved' ? 'school.approved'
    : decision === 'rejected' ? 'school.rejected' : 'school.info-requested'
  state.audit.unshift({
    id: `aud-${Date.now().toString(36)}`,
    actorId: actor.id,
    actorName: actor.name,
    action,
    targetType: 'school',
    targetId: school?.id ?? request.id,
    targetLabel: request.schoolName,
    createdAt: new Date().toISOString(),
  })
  save()
  return { ok: true, value: request }
}

/* ---------------- Plans & limits (B5) ---------------- */

/** Plans with any Super Admin limit edits applied. */
function listPlans(): Plan[] {
  return PLANS.map(p => {
    const override = state.planOverrides[p.id]
    return override ? applyPlanLimits(p, override) : p
  })
}

function getPlan(id: PlanId): Plan | undefined {
  return listPlans().find(p => p.id === id)
}

/**
 * Edit a plan's limits (B5). Validated by validatePlanLimits; on success
 * the override is stored and a plan.limit-changed audit event is written.
 * Returns the error keys from the validator when invalid.
 */
function updatePlanLimit(
  planId: PlanId,
  patch: PlanLimitPatch,
  actor: Person,
): Result<{ plan: Plan; errors: string[] }> {
  const plan = getPlan(planId)
  if (!plan) return { ok: false, error: 'Plan not found' }
  const errors = validatePlanLimits(plan, patch)
  if (errors.length > 0) return { ok: false, error: errors.join(',') }
  state.planOverrides[planId] = { ...(state.planOverrides[planId] ?? {}), ...patch }
  const updated = applyPlanLimits(plan, patch)
  state.audit.unshift({
    id: `aud-${Date.now().toString(36)}`,
    actorId: actor.id,
    actorName: actor.name,
    action: 'plan.limit-changed',
    targetType: 'plan',
    targetId: plan.id,
    targetLabel: plan.name,
    createdAt: new Date().toISOString(),
  })
  save()
  return { ok: true, value: { plan: updated, errors: [] } }
}

/* ---------------- Platform users (B7) ---------------- */

/** All platform users: seeded users + invited users, with status overrides applied. */
function listUsers(): Person[] {
  const all = [...USERS, ...state.invitedUsers]
  return all.map(u => ({ ...u, status: state.userStatusOverrides[u.id] ?? u.status }))
}

function getUser(id: string): Person | undefined {
  return listUsers().find(u => u.id === id)
}

/** Invite a platform user (Super Admin staff). Starts as 'invited'. */
function inviteUser(input: { name: string; email: string; role: PersonRole }, actor: Person): Result<Person> {
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  if (!name || !email) return { ok: false, error: 'Name and email are required' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Enter a valid email' }
  if (listUsers().some(u => u.email.toLowerCase() === email)) return { ok: false, error: 'This email is already invited' }
  const user: Person = {
    id: `u-inv-${Date.now().toString(36)}`,
    name,
    email,
    role: input.role,
    schoolId: null,
    status: 'invited',
    joinedDaysAgo: 0,
    subjects: [],
    classes: [],
  }
  state.invitedUsers.push(user)
  state.audit.unshift({
    id: `aud-${Date.now().toString(36)}`,
    actorId: actor.id,
    actorName: actor.name,
    action: 'user.invited',
    targetType: 'user',
    targetId: user.id,
    targetLabel: user.name,
    createdAt: new Date().toISOString(),
  })
  save()
  return { ok: true, value: user }
}

/** Deactivate (or reactivate) a platform user. Writes a user.deactivated audit event on deactivate. */
function setUserStatus(id: string, status: Person['status'], actor: Person): Result<Person> {
  const user = getUser(id)
  if (!user) return { ok: false, error: 'User not found' }
  if (user.status === status) return { ok: false, error: 'User is already in this state' }
  state.userStatusOverrides[id] = status
  if (status === 'inactive') {
    state.audit.unshift({
      id: `aud-${Date.now().toString(36)}`,
      actorId: actor.id,
      actorName: actor.name,
      action: 'user.deactivated',
      targetType: 'user',
      targetId: user.id,
      targetLabel: user.name,
      createdAt: new Date().toISOString(),
    })
  }
  save()
  return { ok: true, value: { ...user, status } }
}

/* ---------------- Announcements (B8) ---------------- */

function listAnnouncements(): Announcement[] {
  return [...state.announcements].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function createAnnouncement(
  input: {
    title: string; body: string
    targetType: AnnouncementTarget; targetPlanId?: PlanId; targetSchoolId?: string
    scheduledAt: string | null
  },
  actor: Person,
): Result<Announcement> {
  const title = input.title.trim()
  const body = input.body.trim()
  if (!title || !body) return { ok: false, error: 'Title and message are required' }
  if (input.targetType === 'plan' && !input.targetPlanId) return { ok: false, error: 'Choose a plan' }
  if (input.targetType === 'school' && !input.targetSchoolId) return { ok: false, error: 'Choose a school' }
  const now = new Date().toISOString()
  const scheduled = input.scheduledAt && input.scheduledAt > now
  const announcement: Announcement = {
    id: `ann-${Date.now().toString(36)}`,
    title,
    body,
    targetType: input.targetType,
    targetPlanId: input.targetPlanId,
    targetSchoolId: input.targetSchoolId,
    status: scheduled ? 'scheduled' : 'sent',
    scheduledAt: scheduled ? input.scheduledAt : null,
    sentAt: scheduled ? null : now,
    createdById: actor.id,
    createdByName: actor.name,
    createdAt: now,
  }
  state.announcements.unshift(announcement)
  state.audit.unshift({
    id: `aud-${Date.now().toString(36)}`,
    actorId: actor.id,
    actorName: actor.name,
    action: scheduled ? 'announcement.scheduled' : 'announcement.published',
    targetType: 'announcement',
    targetId: announcement.id,
    targetLabel: announcement.title,
    createdAt: now,
  })
  save()
  return { ok: true, value: announcement }
}

/* ---------------- Platform settings (B10) ---------------- */

function getPlatformSettings(): PlatformSettings {
  return { ...state.platformSettings }
}

function updatePlatformSettings(patch: Partial<PlatformSettings>): PlatformSettings {
  state.platformSettings = { ...state.platformSettings, ...patch }
  save()
  return { ...state.platformSettings }
}

/* ---------------- Facade ---------------- */

export const AuthService = {
  getSession,
  getRole: () => getSession()?.role ?? null,
  signIn,
  signOut,
  switchRole,
  currentUser,
} as const

export const SchoolService = {
  list: listSchools,
  get: getSchool,
  setStatus: setSchoolStatus,
  setPlan: setSchoolPlan,
  listTeachers: (schoolId: string) => TEACHERS.filter(t => t.schoolId === schoolId),
  listAdmins: (schoolId: string) => SCHOOL_ADMINS.filter(a => a.schoolId === schoolId),
} as const

export const PaperService = {
  list: listPapers,
  get: getPaper,
  create: createPaper,
  transition: transitionPaper,
  markPrinted: (id: string, actor: Person) => transitionPaper(id, 'printed', actor),
} as const

export const QuestionBankProvider = {
  getSubjects: () => SUBJECTS,
  getClasses: () => CLASSES,
  getChapters,
  getQuestionCounts,
  autoFill,
} as const

export const ApprovalRequestService = {
  list: listApprovalRequests,
  get: getApprovalRequest,
  getLatest: getLatestApprovalRequest,
  create: createApprovalRequest,
  update: updateApprovalRequest,
  decide: decideApprovalRequest,
  resubmit: resubmitApprovalRequest,
  nextReference: nextApprovalReference,
} as const

export const PlatformService = {
  listPlans,
  updatePlanLimit,
  listUsers,
  inviteUser,
  setUserStatus,
  listAnnouncements,
  createAnnouncement,
  getSettings: getPlatformSettings,
  updateSettings: updatePlatformSettings,
  listAudit,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  listExams: (filter: { schoolId?: string } = {}) => {
    const exams = filter.schoolId ? EXAMS.filter(e => e.schoolId === filter.schoolId) : EXAMS
    return [...exams].sort((a, b) => a.examDate.localeCompare(b.examDate))
  },
  listTemplates: (schoolId?: string) => schoolId ? TEMPLATES.filter(t => t.schoolId === schoolId) : TEMPLATES,
  listSavedQuestions: (teacherId: string) => SAVED_QUESTIONS.filter(s => s.teacherId === teacherId),
} as const

/** Reset mock mutations back to seed (demo helper). */
export function resetMockData() {
  state = seed()
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* no localStorage in the test environment — in-memory reset is enough */
  }
}

export {
  SCHOOLS, TEACHERS, SUPER_ADMINS, SCHOOL_ADMINS, USERS, PAPERS, PLANS, AUDIT_EVENTS,
  NOTIFICATIONS, EXAMS, TEMPLATES, SAVED_QUESTIONS, CLASSES, SUBJECTS, CHAPTERS,
  APPROVAL_REQUESTS, ANNOUNCEMENTS, DEFAULT_PLATFORM_SETTINGS,
  personRole, currentMarks,
}
export type {
  School, Paper, PaperStatus, Person, PersonRole, Plan, PlanId, AuditEvent, AppNotification,
  Exam, Template, SavedQuestion, ApprovalRequest, ApprovalRequestStatus,
  Announcement, AnnouncementTarget, AnnouncementStatus, PlatformSettings,
}
