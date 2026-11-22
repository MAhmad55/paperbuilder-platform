import {
  SCHOOLS, TEACHERS, SUPER_ADMINS, SCHOOL_ADMINS, USERS, PAPERS, PLANS, AUDIT_EVENTS,
  NOTIFICATIONS, EXAMS, TEMPLATES, SAVED_QUESTIONS, CLASSES, SUBJECTS, CHAPTERS,
  personRole, currentMarks,
} from '../mock/data'
import type {
  School, Paper, PaperStatus, Person, PersonRole, Plan, AuditEvent, AppNotification,
  Exam, Template, SavedQuestion, Medium, ExamType, Term, AuditAction,
} from '../mock/data'
import type { Session, Role, PaperFilter, Result } from './types'
import { PAPER_TRANSITIONS, canTransition, validateTransition, type ActorRole } from './paper-transitions'
import type { SchoolStatus } from '../mock/data'

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
  return {
    papers: [...PAPERS],
    audit: [...AUDIT_EVENTS],
    notifications: [...NOTIFICATIONS],
    session: loadPersisted()?.session ?? null,
    schoolOverrides: {},
  }
}

let state: PersistedState = loadPersisted() ?? seed()

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
      teacherCount: teachers.length,
      paperCount: papers.length,
    }
  })
}

function getSchool(id: string): School | undefined {
  return listSchools().find(s => s.id === id)
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

export const PlatformService = {
  listPlans: () => PLANS,
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
  localStorage.removeItem(STORAGE_KEY)
}

export {
  SCHOOLS, TEACHERS, SUPER_ADMINS, SCHOOL_ADMINS, USERS, PAPERS, PLANS, AUDIT_EVENTS,
  NOTIFICATIONS, EXAMS, TEMPLATES, SAVED_QUESTIONS, CLASSES, SUBJECTS, CHAPTERS,
  personRole, currentMarks,
}
export type {
  School, Paper, PaperStatus, Person, PersonRole, Plan, AuditEvent, AppNotification,
  Exam, Template, SavedQuestion,
}
