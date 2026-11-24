import {
  SCHOOLS, TEACHERS, SUPER_ADMINS, SCHOOL_ADMINS, USERS, PAPERS, PLANS, AUDIT_EVENTS,
  NOTIFICATIONS, EXAMS, TEMPLATES, SAVED_QUESTIONS, CLASSES, SUBJECTS, CHAPTERS,
  APPROVAL_REQUESTS, ANNOUNCEMENTS, DEFAULT_PLATFORM_SETTINGS, BANK_QUESTIONS,
  personRole, currentMarks,
} from '../mock/data'
import type {
  School, Paper, PaperStatus, Person, PersonRole, Plan, PlanId, AuditEvent, AppNotification,
  Exam, Template, SavedQuestion, Medium, ExamType, Term, AuditAction,
  ApprovalRequest, ApprovalRequestStatus, ApprovalTimelineEvent,
  ApprovalMissingItem, Announcement, AnnouncementTarget, AnnouncementStatus, PlatformSettings,
  SchoolSettings, BankQuestion, PaperQuestion, PersonalPattern,
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
  /** Phase 4: per-teacher assignment overrides (user id -> subjects/classes). */
  teacherAssignmentOverrides: Record<string, { subjects: string[]; classes: string[] }>
  /** B7: platform users invited from the admin screen. */
  invitedUsers: Person[]
  /** B8: platform announcements (seed + created). */
  announcements: Announcement[]
  /** B10: platform settings. */
  platformSettings: PlatformSettings
  /** Phase 4: per-school settings overrides (school id -> settings). */
  schoolSettings: Record<string, SchoolSettings>
  /** Phase 4: templates (seed + duplicated), deep-copied in seed(). */
  templates: Template[]
  /** Phase 4: per-school default template (school id -> template id). */
  templateDefaultOverrides: Record<string, string>
  /** Phase 4: plan upgrade requests (school id -> requested plan id). */
  upgradeRequests: Record<string, PlanId>
  /** Phase 5: saved questions (seed + bookmarked in the Studio), deep-copied in seed(). */
  savedQuestions: SavedQuestion[]
  /** Phase 5: teacher personal patterns (saved in /teacher/templates). */
  personalPatterns: PersonalPattern[]
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
    teacherAssignmentOverrides: {},
    invitedUsers: [],
    announcements: clone(ANNOUNCEMENTS),
    platformSettings: clone(DEFAULT_PLATFORM_SETTINGS),
    schoolSettings: {},
    templates: clone(TEMPLATES),
    templateDefaultOverrides: {},
    upgradeRequests: {},
    savedQuestions: clone(SAVED_QUESTIONS),
    personalPatterns: [],
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
if (!state.teacherAssignmentOverrides) state.teacherAssignmentOverrides = {}
if (!Array.isArray(state.invitedUsers)) state.invitedUsers = []
if (!Array.isArray(state.announcements)) state.announcements = [...ANNOUNCEMENTS]
if (!state.platformSettings) state.platformSettings = { ...DEFAULT_PLATFORM_SETTINGS }
if (!state.schoolSettings) state.schoolSettings = {}
if (!Array.isArray(state.templates)) state.templates = [...TEMPLATES]
if (!state.templateDefaultOverrides) state.templateDefaultOverrides = {}
if (!state.upgradeRequests) state.upgradeRequests = {}
if (!Array.isArray(state.savedQuestions)) state.savedQuestions = [...SAVED_QUESTIONS]
if (!Array.isArray(state.personalPatterns)) state.personalPatterns = []

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

/* ---------------- School settings (Phase 4, /school/settings) ---------------- */

/** Effective settings for a school: seed row values unless overridden on /school/settings. */
function getSchoolSettings(id: string): SchoolSettings | undefined {
  const school = SCHOOLS.find(s => s.id === id)
  if (!school) return undefined
  const override = state.schoolSettings[id]
  return {
    name: override?.name ?? school.name,
    address: override?.address ?? '',
    headerLayout: override?.headerLayout ?? 'logo-left',
    defaultLanguage: override?.defaultLanguage ?? 'en',
    defaultMedium: override?.defaultMedium ?? school.defaultMedium,
    approvalPolicy: override?.approvalPolicy ?? school.approvalPolicy,
    rollNumberBlock: override?.rollNumberBlock ?? true,
    logoName: override?.logoName ?? null,
  }
}

/** Save school settings. Writes one school.settings-changed audit event. */
function updateSchoolSettings(
  id: string,
  patch: Partial<SchoolSettings>,
  actor: Person,
): Result<SchoolSettings> {
  const current = getSchoolSettings(id)
  if (!current) return { ok: false, error: 'School not found' }
  const next: SchoolSettings = { ...current, ...patch }
  if (!next.name.trim()) return { ok: false, error: 'School name is required' }
  state.schoolSettings[id] = next
  state.audit.unshift({
    id: `aud-${Date.now().toString(36)}`,
    actorId: actor.id,
    actorName: actor.name,
    action: 'school.settings-changed',
    targetType: 'school',
    targetId: id,
    targetLabel: next.name,
    createdAt: new Date().toISOString(),
  })
  save()
  return { ok: true, value: next }
}

/** Request a plan upgrade (mock: records the request, writes one audit event). */
function requestPlanUpgrade(schoolId: string, planId: PlanId, actor: Person): Result<PlanId> {
  const school = getSchool(schoolId)
  if (!school) return { ok: false, error: 'School not found' }
  if (!PLANS.some(p => p.id === planId)) return { ok: false, error: 'Unknown plan' }
  if (school.plan === planId) return { ok: false, error: 'School is already on this plan' }
  if (state.upgradeRequests[schoolId] === planId) return { ok: false, error: 'Upgrade already requested' }
  state.upgradeRequests[schoolId] = planId
  const plan = PLANS.find(p => p.id === planId)!
  state.audit.unshift({
    id: `aud-${Date.now().toString(36)}`,
    actorId: actor.id,
    actorName: actor.name,
    action: 'school.plan-upgrade-requested',
    targetType: 'school',
    targetId: school.id,
    targetLabel: `${school.name} → ${plan.name}`,
    createdAt: new Date().toISOString(),
  })
  save()
  return { ok: true, value: planId }
}

function getUpgradeRequest(schoolId: string): PlanId | undefined {
  return state.upgradeRequests[schoolId]
}

/* ---------------- School teachers (Phase 4, /school/teachers) ---------------- */

/** Teachers of a school: seeded teachers + teachers invited from the school
    screen, with status overrides applied. */
function listSchoolTeachers(schoolId: string): Person[] {
  const all = [
    ...TEACHERS.filter(t => t.schoolId === schoolId),
    ...state.invitedUsers.filter(u => u.schoolId === schoolId),
  ]
  return all.map(u => {
    const assignment = state.teacherAssignmentOverrides[u.id]
    return {
      ...u,
      status: state.userStatusOverrides[u.id] ?? u.status,
      subjects: assignment?.subjects ?? u.subjects,
      classes: assignment?.classes ?? u.classes,
    }
  })
}

/** Invite a teacher to this school (starts as 'invited'). */
function inviteTeacher(
  schoolId: string,
  input: { name: string; email: string },
  actor: Person,
): Result<Person> {
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  if (!name || !email) return { ok: false, error: 'Name and email are required' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Enter a valid email' }
  if (listUsers().some(u => u.email.toLowerCase() === email)) return { ok: false, error: 'This email is already invited' }
  const user: Person = {
    id: `u-tch-inv-${Date.now().toString(36)}`,
    name,
    email,
    role: 'teacher',
    schoolId,
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
    action: 'teacher.invited',
    targetType: 'user',
    targetId: user.id,
    targetLabel: user.name,
    createdAt: new Date().toISOString(),
  })
  save()
  return { ok: true, value: user }
}

/** Edit a teacher's class/subject assignments. Stored as an override (the
    seeded TEACHERS records are module constants, so mutating them would
    leak across resetMockData). Writes one audit event. */
function updateTeacherAssignments(
  id: string,
  patch: { subjects: string[]; classes: string[] },
  actor: Person,
): Result<Person> {
  const user = getUser(id)
  if (!user) return { ok: false, error: 'User not found' }
  if (user.role !== 'teacher') return { ok: false, error: 'Only teachers have assignments' }
  state.teacherAssignmentOverrides[id] = { subjects: [...patch.subjects], classes: [...patch.classes] }
  state.audit.unshift({
    id: `aud-${Date.now().toString(36)}`,
    actorId: actor.id,
    actorName: actor.name,
    action: 'teacher.assignment-changed',
    targetType: 'user',
    targetId: user.id,
    targetLabel: user.name,
    createdAt: new Date().toISOString(),
  })
  save()
  return { ok: true, value: { ...user, subjects: [...patch.subjects], classes: [...patch.classes] } }
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
  questions?: PaperQuestion[]; instructions?: string[]; durationMinutes?: number
  rollNumberBlock?: boolean; answerKey?: boolean
}, actor: Person): Result<Paper> {
  const cls = CLASSES.find(c => c.id === input.classId)
  const subject = SUBJECTS.find(s => s.id === input.subjectId)
  if (!cls || !subject) return { ok: false, error: 'Unknown class or subject' }
  // Next id from the highest existing number, not the list length — a
  // duplicate created after an archive must never collide with a live id.
  const maxNum = state.papers.reduce((m, p) => {
    const n = Number(/^paper-(\d+)$/.exec(p.id)?.[1] ?? 0)
    return Math.max(m, n)
  }, 0)
  const id = `paper-${String(maxNum + 1).padStart(3, '0')}`
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
    questions: input.questions ? JSON.parse(JSON.stringify(input.questions)) : [],
    instructions: input.instructions ? [...input.instructions] : [],
    durationMinutes: input.durationMinutes ?? 150,
    rollNumberBlock: input.rollNumberBlock ?? true,
    answerKey: input.answerKey ?? true,
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

/**
 * Save a Studio draft over an existing paper (autosave / Save draft).
 * Only drafts and changes-requested papers can be edited; editing a
 * changes-requested paper returns it to draft (blueprint §5.2).
 */
function updatePaper(
  id: string,
  patch: Partial<Pick<Paper, 'classId' | 'subjectId' | 'medium' | 'examType' | 'term' | 'examDate' | 'chapterIds' | 'targetMarks' | 'sections' | 'questions' | 'instructions' | 'durationMinutes' | 'rollNumberBlock' | 'answerKey'>>,
  actor: Person,
): Result<Paper> {
  const paper = getPaper(id)
  if (!paper) return { ok: false, error: 'Paper not found' }
  if (paper.status !== 'draft' && paper.status !== 'changes-requested') {
    return { ok: false, error: 'Only a draft can be edited' }
  }
  const cls = patch.classId ? CLASSES.find(c => c.id === patch.classId) : undefined
  const subject = patch.subjectId ? SUBJECTS.find(s => s.id === patch.subjectId) : undefined
  if ((patch.classId && !cls) || (patch.subjectId && !subject)) {
    return { ok: false, error: 'Unknown class or subject' }
  }
  Object.assign(paper, {
    ...patch,
    questions: patch.questions ? JSON.parse(JSON.stringify(patch.questions)) : paper.questions,
    chapterIds: patch.chapterIds ? [...patch.chapterIds] : paper.chapterIds,
    sections: patch.sections ? JSON.parse(JSON.stringify(patch.sections)) : paper.sections,
    instructions: patch.instructions ? [...patch.instructions] : paper.instructions,
  })
  if (cls && subject) {
    paper.title = `${subject.nameEn} — ${paper.term} (${cls.name})`
  }
  if (paper.status === 'changes-requested') {
    paper.status = 'draft'
    paper.history.push({
      id: `hst-${Date.now().toString(36)}`,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'edited',
      createdAt: new Date().toISOString(),
    })
  }
  paper.updatedAt = new Date().toISOString()
  save()
  return { ok: true, value: paper }
}

/** Duplicate a paper as a fresh draft owned by the same teacher. */
function duplicatePaper(id: string, actor: Person): Result<Paper> {
  const source = getPaper(id)
  if (!source) return { ok: false, error: 'Paper not found' }
  const result = createPaper({
    schoolId: source.schoolId,
    teacherId: source.teacherId,
    classId: source.classId,
    subjectId: source.subjectId,
    medium: source.medium,
    examType: source.examType,
    term: source.term,
    examDate: source.examDate,
    chapterIds: [...source.chapterIds],
    targetMarks: source.targetMarks,
    sections: JSON.parse(JSON.stringify(source.sections)),
    questions: source.questions ? JSON.parse(JSON.stringify(source.questions)) : [],
    instructions: source.instructions ? [...source.instructions] : [],
    durationMinutes: source.durationMinutes,
    rollNumberBlock: source.rollNumberBlock,
    answerKey: source.answerKey,
  }, actor)
  return result
}

function transitionPaper(id: string, target: PaperStatus, actor: Person, comment?: string): Result<Paper> {
  const paper = getPaper(id)
  if (!paper) return { ok: false, error: 'Paper not found' }
  const school = SCHOOLS.find(s => s.id === paper.schoolId)
  /* The approval policy gates the draft -> approved jump (blueprint §5.2):
     a settings override saved on /school/settings wins over the seed row,
     so flipping the policy there changes the flow immediately. */
  const optionalPolicy = (state.schoolSettings[paper.schoolId]?.approvalPolicy ?? school?.approvalPolicy) === 'optional'
  const check = validateTransition(paper.status, target, actor.role as ActorRole, { optionalPolicy }, comment)
  if (!check.ok) return { ok: false, error: check.error }
  const historyAction =
    target === 'submitted' ? 'submitted' :
    target === 'in-review' ? 'in-review' :
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
  /* One audit event per transition, mapped distinctly: changes-requested
     used to fall through to paper.submitted, hiding the decision. */
  const actionAudit: AuditAction =
    target === 'submitted' ? 'paper.submitted' :
    target === 'in-review' ? 'paper.in-review' :
    target === 'approved' ? 'paper.approved' :
    target === 'changes-requested' ? 'paper.changes-requested' :
    target === 'archived' ? 'paper.archived' :
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

/** Real bank questions (Phase 5): filter by chapter and type. */
function listBankQuestions(filter: { chapterId?: string; type?: BankQuestion['type']; subjectId?: string } = {}): BankQuestion[] {
  return BANK_QUESTIONS.filter((q) => {
    if (filter.chapterId && q.chapterId !== filter.chapterId) return false
    if (filter.type && q.type !== filter.type) return false
    if (filter.subjectId && q.subjectId !== filter.subjectId) return false
    return true
  })
}

function getBankQuestion(id: string): BankQuestion | undefined {
  return BANK_QUESTIONS.find((q) => q.id === id)
}

/* ---------------- Saved questions & personal patterns (Phase 5) ---------------- */

/** Saved questions for a teacher: seed + questions bookmarked in the Studio. */
function listSavedQuestions(teacherId: string): SavedQuestion[] {
  return state.savedQuestions.filter((s) => s.teacherId === teacherId)
}

/** Bookmark a bank question (no-op when already saved). */
function addSavedQuestion(teacherId: string, bankQuestionId: string): Result<SavedQuestion> {
  const bank = getBankQuestion(bankQuestionId)
  if (!bank) return { ok: false, error: 'Question not found' }
  const existing = state.savedQuestions.find((s) => s.teacherId === teacherId && s.id === `sq-${bank.id}`)
  if (existing) return { ok: true, value: existing }
  const item: SavedQuestion = {
    id: `sq-${bank.id}`,
    teacherId,
    subjectId: bank.subjectId,
    chapterId: bank.chapterId,
    type: bank.type,
    marks: bank.type === 'mcq' ? 1 : bank.type === 'short' ? 4 : 8,
    text: bank.textEn,
    createdAt: new Date().toISOString(),
  }
  state.savedQuestions.push(item)
  save()
  return { ok: true, value: item }
}

function removeSavedQuestion(teacherId: string, id: string): boolean {
  const idx = state.savedQuestions.findIndex((s) => s.teacherId === teacherId && s.id === id)
  if (idx === -1) return false
  state.savedQuestions.splice(idx, 1)
  save()
  return true
}

function listPersonalPatterns(teacherId: string): PersonalPattern[] {
  return state.personalPatterns.filter((p) => p.teacherId === teacherId)
}

function savePersonalPattern(
  teacherId: string,
  input: { name: string; sections: Paper['sections']; targetMarks: number },
): Result<PersonalPattern> {
  const name = input.name.trim()
  if (!name) return { ok: false, error: 'Name is required' }
  if (!input.sections.length || input.targetMarks <= 0) return { ok: false, error: 'Choose a pattern first' }
  const pattern: PersonalPattern = {
    id: `pp-${Date.now().toString(36)}`,
    teacherId,
    name,
    sections: JSON.parse(JSON.stringify(input.sections)),
    targetMarks: input.targetMarks,
    createdAt: new Date().toISOString(),
  }
  state.personalPatterns.push(pattern)
  save()
  return { ok: true, value: pattern }
}

function deletePersonalPattern(teacherId: string, id: string): boolean {
  const idx = state.personalPatterns.findIndex((p) => p.teacherId === teacherId && p.id === id)
  if (idx === -1) return false
  state.personalPatterns.splice(idx, 1)
  save()
  return true
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

/* ---------------- Templates (Phase 4, /school/templates) ---------------- */

/** Templates for a school, with the default override applied. */
function listTemplates(schoolId?: string): Template[] {
  const all = schoolId ? state.templates.filter(t => t.schoolId === schoolId) : [...state.templates]
  return all.map(t => ({
    ...t,
    isDefault: state.templateDefaultOverrides[t.schoolId]
      ? state.templateDefaultOverrides[t.schoolId] === t.id
      : t.isDefault,
  }))
}

/** Duplicate a template (mock: a copy appears in the list). Writes a template.created audit event. */
function duplicateTemplate(id: string, name: string, actor: Person): Result<Template> {
  const source = state.templates.find(t => t.id === id)
  if (!source) return { ok: false, error: 'Template not found' }
  const copy: Template = {
    ...source,
    id: `tpl-copy-${Date.now().toString(36)}`,
    name: name.trim() || source.name,
    isDefault: false,
  }
  state.templates.push(copy)
  state.audit.unshift({
    id: `aud-${Date.now().toString(36)}`,
    actorId: actor.id,
    actorName: actor.name,
    action: 'template.created',
    targetType: 'template',
    targetId: copy.id,
    targetLabel: copy.name,
    createdAt: new Date().toISOString(),
  })
  save()
  return { ok: true, value: copy }
}

/** Set a school's default template. Writes one template.default-changed audit event. */
function setDefaultTemplate(id: string, actor: Person): Result<Template> {
  const template = state.templates.find(t => t.id === id)
  if (!template) return { ok: false, error: 'Template not found' }
  state.templateDefaultOverrides[template.schoolId] = id
  state.audit.unshift({
    id: `aud-${Date.now().toString(36)}`,
    actorId: actor.id,
    actorName: actor.name,
    action: 'template.default-changed',
    targetType: 'template',
    targetId: template.id,
    targetLabel: template.name,
    createdAt: new Date().toISOString(),
  })
  save()
  return { ok: true, value: { ...template, isDefault: true } }
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
  listTeachers: listSchoolTeachers,
  listAdmins: (schoolId: string) => SCHOOL_ADMINS.filter(a => a.schoolId === schoolId),
  inviteTeacher,
  updateTeacherAssignments,
  setTeacherStatus: setUserStatus,
  getSettings: getSchoolSettings,
  updateSettings: updateSchoolSettings,
  requestPlanUpgrade,
  getUpgradeRequest,
} as const

export const PaperService = {
  list: listPapers,
  get: getPaper,
  create: createPaper,
  update: updatePaper,
  duplicate: duplicatePaper,
  transition: transitionPaper,
  markPrinted: (id: string, actor: Person) => transitionPaper(id, 'printed', actor),
} as const

export const QuestionBankProvider = {
  getSubjects: () => SUBJECTS,
  getClasses: () => CLASSES,
  getChapters,
  getQuestionCounts,
  autoFill,
  listBankQuestions,
  getBankQuestion,
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
  listTemplates,
  duplicateTemplate,
  setDefaultTemplate,
  listSavedQuestions,
  addSavedQuestion,
  removeSavedQuestion,
  listPersonalPatterns,
  savePersonalPattern,
  deletePersonalPattern,
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
  APPROVAL_REQUESTS, ANNOUNCEMENTS, DEFAULT_PLATFORM_SETTINGS, BANK_QUESTIONS,
  personRole, currentMarks,
}
export type {
  School, Paper, PaperStatus, Person, PersonRole, Plan, PlanId, AuditEvent, AppNotification,
  Exam, Template, SavedQuestion, ApprovalRequest, ApprovalRequestStatus,
  Announcement, AnnouncementTarget, AnnouncementStatus, PlatformSettings, SchoolSettings,
  BankQuestion, PaperQuestion, PersonalPattern,
}
