import type {
  School, Paper, PaperStatus, Person, PersonRole, Plan, AuditEvent, AppNotification,
  Exam, Template, SavedQuestion, SubjectDef, ChapterDef, ClassDef,
} from '../mock/data'

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
  setStatus(id: string, status: School['status'], actor: Person): Result<School>
  listTeachers(schoolId: string): Person[]
  listAdmins(schoolId: string): Person[]
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
  }, actor: Person): Result<Paper>
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
}

/* ---------------- Plans / audit / notifications / misc ---------------- */

export interface PlatformService {
  listPlans(): Plan[]
  listAudit(): AuditEvent[]
  listNotifications(userId?: string): AppNotification[]
  markNotificationRead(id: string): AppNotification | undefined
  markAllNotificationsRead(userId: string): void
  listExams(filter?: { schoolId?: string }): Exam[]
  listTemplates(schoolId?: string): Template[]
  listSavedQuestions(teacherId: string): SavedQuestion[]
}
