import type {
  School, Paper, PaperStatus, Person, PersonRole, Plan, PlanId, AuditEvent, AppNotification,
  Exam, Template, SavedQuestion, SubjectDef, ChapterDef, ClassDef,
  Announcement, AnnouncementTarget, PlatformSettings, BankQuestion, PersonalPattern,
} from '../mock/data'
import type { PlanLimitPatch } from './plan-limits'

export type Result<T> = { ok: true; value: T } | { ok: false; error: string }

/* ---------------- Auth ---------------- */

export type Role = 'super-admin' | 'school-admin' | 'teacher'

export interface Session {
  role: Role
  userId: string
  schoolId: string | null
  signedInAt: string
}

export interface AuthService {
  getSession(): Session | null
  getRole(): Role | null
  signIn(role: Role): Session
  signOut(): void
  switchRole(role: Role): Session
  currentUser(): Person | null
}

/* ---------------- Schools ---------------- */

export interface SchoolService {
  list(): School[]
  get(id: string): School | undefined
  setStatus(id: string, status: School['status'], actor: Person, reason?: string): Result<School>
  setPlan(id: string, planId: PlanId, actor: Person): Result<School>
  listTeachers(schoolId: string): Person[]
  listAdmins(schoolId: string): Person[]
  inviteTeacher(schoolId: string, input: { name: string; email: string }, actor: Person): Result<Person>
  updateTeacherAssignments(id: string, patch: { subjects: string[]; classes: string[] }, actor: Person): Result<Person>
  setTeacherStatus(id: string, status: Person['status'], actor: Person): Result<Person>
  getSettings(id: string): import('../mock/data').SchoolSettings | undefined
  updateSettings(id: string, patch: Partial<import('../mock/data').SchoolSettings>, actor: Person): Result<import('../mock/data').SchoolSettings>
  requestPlanUpgrade(schoolId: string, planId: PlanId, actor: Person): Result<PlanId>
  getUpgradeRequest(schoolId: string): PlanId | undefined
}

/* ---------------- Papers ---------------- */

export interface PaperFilter {
  schoolId?: string
  teacherId?: string
  status?: PaperStatus | 'all'
  subjectId?: string
  classId?: string
  search?: string
}

export interface PaperService {
  list(filter?: PaperFilter): Paper[]
  get(id: string): Paper | undefined
  create(input: {
    schoolId: string
    teacherId: string
    classId: string
    subjectId: string
    medium: Paper['medium']
    examType: Paper['examType']
    term: Paper['term']
    examDate: string
    chapterIds: string[]
    targetMarks: number
    sections: Paper['sections']
    questions?: Paper['questions']
    instructions?: string[]
    durationMinutes?: number
    rollNumberBlock?: boolean
    answerKey?: boolean
  }, actor: Person): Result<Paper>
  update(id: string, patch: Partial<Pick<Paper, 'classId' | 'subjectId' | 'medium' | 'examType' | 'term' | 'examDate' | 'chapterIds' | 'targetMarks' | 'sections' | 'questions' | 'instructions' | 'durationMinutes' | 'rollNumberBlock' | 'answerKey'>>, actor: Person): Result<Paper>
  duplicate(id: string, actor: Person): Result<Paper>
  transition(id: string, target: PaperStatus, actor: Person, comment?: string): Result<Paper>
  markPrinted(id: string, actor: Person): Result<Paper>
}

/* ---------------- Question bank provider ---------------- */

export interface QuestionBankProvider {
  getSubjects(): SubjectDef[]
  getClasses(): ClassDef[]
  getChapters(subjectId: string): ChapterDef[]
  getQuestionCounts(chapterId: string): { mcq: number; short: number; long: number }
  autoFill(input: { subjectId: string; chapterIds: string[]; sections: Paper['sections'] }):
    Result<{ chapterId: string; type: 'mcq' | 'short' | 'long'; marks: number; text: string }[]>
  listBankQuestions(filter?: { chapterId?: string; type?: BankQuestion['type']; subjectId?: string }): BankQuestion[]
  getBankQuestion(id: string): BankQuestion | undefined
}

/* ---------------- Shared screens (Phase 6) ---------------- */

export interface SharedService {
  /** Edit the signed-in user's name / contact / avatar. Validated; writes a user.profile-updated audit event. */
  updateProfile(userId: string, patch: import('./shared').ProfilePatch, actor: Person): Result<Person>
  /** Change password (mock: validated only, no real credential is stored). */
  changePassword(userId: string, input: import('./shared').PasswordChangeInput, actor: Person): Result<boolean>
  getUserSettings(userId: string): import('./shared').UserSettings
  updateUserSettings(userId: string, patch: Partial<import('./shared').UserSettings>): import('./shared').UserSettings
  /** Personal activity: audit events + paper history for this user, filtered. */
  listUserHistory(userId: string, filter?: import('./shared').HistoryFilter): import('./shared').HistoryItem[]
  unreadNotificationCount(userId: string): number
}

/* ---------------- Plans / audit / notifications / misc ---------------- */

export interface PlatformService {
  listPlans(): Plan[]
  updatePlanLimit(planId: PlanId, patch: PlanLimitPatch, actor: Person): Result<{ plan: Plan; errors: string[] }>
  listUsers(): Person[]
  inviteUser(input: { name: string; email: string; role: PersonRole }, actor: Person): Result<Person>
  setUserStatus(id: string, status: Person['status'], actor: Person): Result<Person>
  listAnnouncements(): Announcement[]
  createAnnouncement(input: {
    title: string; body: string
    targetType: AnnouncementTarget; targetPlanId?: PlanId; targetSchoolId?: string
    scheduledAt: string | null
  }, actor: Person): Result<Announcement>
  getSettings(): PlatformSettings
  updateSettings(patch: Partial<PlatformSettings>): PlatformSettings
  listAudit(): AuditEvent[]
  listNotifications(userId?: string): AppNotification[]
  markNotificationRead(id: string): AppNotification | undefined
  markAllNotificationsRead(userId: string): void
  listExams(filter?: { schoolId?: string }): Exam[]
  listTemplates(schoolId?: string): Template[]
  duplicateTemplate(id: string, name: string, actor: Person): Result<Template>
  setDefaultTemplate(id: string, actor: Person): Result<Template>
  listSavedQuestions(teacherId: string): SavedQuestion[]
  addSavedQuestion(teacherId: string, bankQuestionId: string): Result<SavedQuestion>
  removeSavedQuestion(teacherId: string, id: string): boolean
  listPersonalPatterns(teacherId: string): PersonalPattern[]
  savePersonalPattern(teacherId: string, input: { name: string; sections: Paper['sections']; targetMarks: number }): Result<PersonalPattern>
  deletePersonalPattern(teacherId: string, id: string): boolean
}
