import { totalMarks } from '../services/marks'

/* ------------------------------------------------------------------
   PaperBuilder mock data — generated deterministically (seeded RNG).
   All names are invented sample data — see src/mock/README.md.
------------------------------------------------------------------- */

/* Seeded RNG — mulberry32 */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rng = mulberry32(20241122)
const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)]
const randInt = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1))
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
const daysAhead = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString()

/* ---------------- Plans ---------------- */

export type PlanId = 'starter' | 'growth' | 'enterprise'

export interface Plan {
  id: PlanId
  name: string
  nameUr: string
  maxTeachers: number | 'unlimited'
  maxPapersPerMonth: number | 'unlimited'
  maxTemplates: number | 'unlimited'
  customBranding: boolean
  prioritySupport: boolean
}

export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    nameUr: 'سٹارٹر',
    maxTeachers: 25,
    maxPapersPerMonth: 30,
    maxTemplates: 3,
    customBranding: false,
    prioritySupport: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    nameUr: 'گروتھ',
    maxTeachers: 60,
    maxPapersPerMonth: 100,
    maxTemplates: 10,
    customBranding: true,
    prioritySupport: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    nameUr: 'انٹرپرائز',
    maxTeachers: 'unlimited',
    maxPapersPerMonth: 500,
    maxTemplates: 'unlimited',
    customBranding: true,
    prioritySupport: true,
  },
]

/* ---------------- Schools ---------------- */

export type SchoolStatus = 'pending' | 'active' | 'suspended' | 'rejected'

export interface School {
  id: string
  name: string
  city: string
  status: SchoolStatus
  plan: PlanId
  teacherCount: number
  paperCount: number
  lastActiveDaysAgo: number | null
  createdDaysAgo: number
  approvalPolicy: 'required' | 'optional'
  defaultMedium: 'english' | 'urdu'
}

export const SCHOOLS: School[] = [
  { id: 'sch-beacon', name: 'Beacon Model School', city: 'Lahore', status: 'active', plan: 'growth', teacherCount: 6, paperCount: 9, lastActiveDaysAgo: 0, createdDaysAgo: 210, approvalPolicy: 'required', defaultMedium: 'english' },
  { id: 'sch-alnoor', name: 'Al-Noor English High', city: 'Islamabad', status: 'active', plan: 'growth', teacherCount: 5, paperCount: 8, lastActiveDaysAgo: 0, createdDaysAgo: 190, approvalPolicy: 'required', defaultMedium: 'english' },
  { id: 'sch-meadowlands', name: 'Meadowlands School', city: 'Karachi', status: 'active', plan: 'starter', teacherCount: 5, paperCount: 7, lastActiveDaysAgo: 1, createdDaysAgo: 170, approvalPolicy: 'optional', defaultMedium: 'urdu' },
  { id: 'sch-sapphire', name: 'Sapphire Trust School', city: 'Peshawar', status: 'active', plan: 'enterprise', teacherCount: 5, paperCount: 8, lastActiveDaysAgo: 2, createdDaysAgo: 160, approvalPolicy: 'required', defaultMedium: 'english' },
  { id: 'sch-sunrise', name: 'Sunrise College', city: 'Multan', status: 'active', plan: 'starter', teacherCount: 4, paperCount: 6, lastActiveDaysAgo: 3, createdDaysAgo: 145, approvalPolicy: 'optional', defaultMedium: 'urdu' },
  { id: 'sch-darulilm', name: 'Dar-ul-Ilm School', city: 'Gujranwala', status: 'active', plan: 'growth', teacherCount: 5, paperCount: 7, lastActiveDaysAgo: 1, createdDaysAgo: 130, approvalPolicy: 'required', defaultMedium: 'urdu' },
  { id: 'sch-quetta', name: 'Quetta Valley Academy', city: 'Quetta', status: 'active', plan: 'starter', teacherCount: 4, paperCount: 6, lastActiveDaysAgo: 5, createdDaysAgo: 120, approvalPolicy: 'required', defaultMedium: 'urdu' },
  { id: 'sch-aurora', name: 'Aurora College', city: 'Hyderabad', status: 'active', plan: 'enterprise', teacherCount: 6, paperCount: 9, lastActiveDaysAgo: 2, createdDaysAgo: 110, approvalPolicy: 'optional', defaultMedium: 'english' },
  { id: 'sch-al-rehman', name: 'Al-Rehman Model School', city: 'Bahawalpur', status: 'pending', plan: 'starter', teacherCount: 0, paperCount: 0, lastActiveDaysAgo: null, createdDaysAgo: 6, approvalPolicy: 'required', defaultMedium: 'urdu' },
  { id: 'sch-taj-mirza', name: 'Taj Mirza Academy', city: 'Rawalpindi', status: 'pending', plan: 'growth', teacherCount: 0, paperCount: 0, lastActiveDaysAgo: null, createdDaysAgo: 3, approvalPolicy: 'required', defaultMedium: 'english' },
  { id: 'sch-ibrahim', name: 'Ibrahim Model School', city: 'Faisalabad', status: 'suspended', plan: 'starter', teacherCount: 4, paperCount: 3, lastActiveDaysAgo: 34, createdDaysAgo: 150, approvalPolicy: 'required', defaultMedium: 'english' },
  { id: 'sch-city-view', name: 'City View School', city: 'Sialkot', status: 'rejected', plan: 'growth', teacherCount: 0, paperCount: 0, lastActiveDaysAgo: null, createdDaysAgo: 40, approvalPolicy: 'required', defaultMedium: 'english' },
]

/* ---------------- Classes & Subjects ---------------- */

export interface ClassDef { id: string; order: number; name: string }

export const CLASSES: ClassDef[] = Array.from({ length: 9 }, (_, i) => ({
  id: `class-${i + 1}`,
  order: i + 1,
  name: `Class ${i + 1}`,
}))

export interface SubjectDef { id: string; nameEn: string; nameUr: string }

export const SUBJECTS: SubjectDef[] = [
  { id: 'math', nameEn: 'Mathematics', nameUr: 'ریاضی' },
  { id: 'english', nameEn: 'English', nameUr: 'انگریزی' },
  { id: 'urdu', nameEn: 'Urdu', nameUr: 'اردو' },
  { id: 'science', nameEn: 'Science', nameUr: 'سائنس' },
  { id: 'islamic', nameEn: 'Islamic Studies', nameUr: 'اسلامیات' },
  { id: 'social', nameEn: 'Social Studies', nameUr: 'سماجیات' },
  { id: 'cs', nameEn: 'Computer Science', nameUr: 'کمپیوٹر سائنس' },
  { id: 'physics', nameEn: 'Physics', nameUr: 'فیزیک' },
]

export interface ChapterDef {
  id: string
  subjectId: string
  nameEn: string
  nameUr: string
  counts: { mcq: number; short: number; long: number }
}

export const CHAPTERS: ChapterDef[] = [
  { id: 'math-numbers', subjectId: 'math', nameEn: 'Number Systems', nameUr: 'عددی نظامات', counts: { mcq: 24, short: 12, long: 6 } },
  { id: 'math-algebra', subjectId: 'math', nameEn: 'Algebra', nameUr: 'الجبر', counts: { mcq: 28, short: 14, long: 8 } },
  { id: 'math-geometry', subjectId: 'math', nameEn: 'Geometry', nameUr: 'جیومیٹری', counts: { mcq: 18, short: 10, long: 5 } },
  { id: 'math-statistics', subjectId: 'math', nameEn: 'Statistics', nameUr: 'شماریات', counts: { mcq: 15, short: 8, long: 4 } },
  { id: 'english-grammar', subjectId: 'english', nameEn: 'Grammar', nameUr: 'نحو', counts: { mcq: 16, short: 10, long: 4 } },
  { id: 'english-composition', subjectId: 'english', nameEn: 'Composition', nameUr: 'تحریر', counts: { mcq: 6, short: 8, long: 6 } },
  { id: 'english-literature', subjectId: 'english', nameEn: 'Literature', nameUr: 'ادب', counts: { mcq: 12, short: 7, long: 4 } },
  { id: 'english-reading', subjectId: 'english', nameEn: 'Reading', nameUr: 'پڑھائی', counts: { mcq: 14, short: 6, long: 3 } },
  { id: 'urdu-poetry', subjectId: 'urdu', nameEn: 'Poetry', nameUr: 'شعر', counts: { mcq: 16, short: 8, long: 4 } },
  { id: 'urdu-prose', subjectId: 'urdu', nameEn: 'Prose', nameUr: 'نثر', counts: { mcq: 12, short: 8, long: 5 } },
  { id: 'urdu-grammar', subjectId: 'urdu', nameEn: 'Grammar', nameUr: 'نحو و لغات', counts: { mcq: 18, short: 9, long: 4 } },
  { id: 'urdu-paragraph', subjectId: 'urdu', nameEn: 'Paragraph writing', nameUr: 'تحریر', counts: { mcq: 5, short: 7, long: 5 } },
  { id: 'science-chemistry', subjectId: 'science', nameEn: 'Chemistry', nameUr: 'کیمیا', counts: { mcq: 22, short: 12, long: 6 } },
  { id: 'science-physics', subjectId: 'science', nameEn: 'Physics', nameUr: 'فیزیک', counts: { mcq: 20, short: 11, long: 6 } },
  { id: 'science-biology', subjectId: 'science', nameEn: 'Biology', nameUr: 'حیاتیات', counts: { mcq: 18, short: 10, long: 5 } },
  { id: 'science-earth', subjectId: 'science', nameEn: 'Earth & space', nameUr: 'زمین اور کائنات', counts: { mcq: 10, short: 6, long: 3 } },
  { id: 'islamic-hadith', subjectId: 'islamic', nameEn: 'Hadith', nameUr: 'حدیث', counts: { mcq: 20, short: 9, long: 4 } },
  { id: 'islamic-fiqh', subjectId: 'islamic', nameEn: 'Fiqh', nameUr: 'فقہ', counts: { mcq: 16, short: 8, long: 4 } },
  { id: 'islamic-akhlaq', subjectId: 'islamic', nameEn: 'Akhlaq', nameUr: 'اخلاق', counts: { mcq: 12, short: 6, long: 3 } },
  { id: 'social-history', subjectId: 'social', nameEn: 'History', nameUr: 'تاریخ', counts: { mcq: 15, short: 8, long: 4 } },
  { id: 'social-geography', subjectId: 'social', nameEn: 'Geography', nameUr: 'جغرافیہ', counts: { mcq: 14, short: 7, long: 4 } },
  { id: 'social-economics', subjectId: 'social', nameEn: 'Economics', nameUr: 'معاشیات', counts: { mcq: 12, short: 6, long: 3 } },
  { id: 'cs-programming', subjectId: 'cs', nameEn: 'Programming', nameUr: 'پروگرامنگ', counts: { mcq: 18, short: 9, long: 4 } },
  { id: 'cs-data-structures', subjectId: 'cs', nameEn: 'Data structures', nameUr: 'ڈیٹا ڈھانچے', counts: { mcq: 14, short: 7, long: 4 } },
  { id: 'cs-networks', subjectId: 'cs', nameEn: 'Networks', nameUr: 'نیٹ ورک', counts: { mcq: 12, short: 6, long: 3 } },
  { id: 'physics-mechanics', subjectId: 'physics', nameEn: 'Mechanics', nameUr: 'میکانکس', counts: { mcq: 18, short: 9, long: 5 } },
  { id: 'physics-electricity', subjectId: 'physics', nameEn: 'Electricity', nameUr: 'بجلی', counts: { mcq: 16, short: 8, long: 4 } },
  { id: 'physics-optics', subjectId: 'physics', nameEn: 'Optics', nameUr: 'آپٹکس', counts: { mcq: 12, short: 6, long: 3 } },
]

/* ---------------- People ---------------- */

export type PersonRole = 'super-admin' | 'school-admin' | 'teacher'

export interface Person {
  id: string
  name: string
  email: string
  role: PersonRole
  schoolId: string | null
  status: 'active' | 'invited' | 'inactive'
  joinedDaysAgo: number
  subjects: string[]  // subjectIds
  classes: string[]   // classIds
}

const TEACHER_NAMES = [
  'Usman Rizwan', 'Ahmed Raza', 'Bilal Mahmood', 'Hamza Siddiqui', 'Zain Abbas',
  'Faisal Qureshi', 'Daniyal Abbasi', 'Aqeel Jamal', 'Sajid Bhatti', 'Adeel Mansoor',
  'Tariq Mahmood', 'Kamran Sheikh', 'Waqar Latif', 'Farhan Mehmood', 'Salman Javed',
  'Omar Farooq', 'Kashif Raza', 'Wajid Akram', 'Zubair Chaudhry', 'Hassan Nadeem',
  'Fazal Karim', 'Usman Qureshi', 'Tariq Yousuf', 'Amir Hussain', 'Saad Malik',
  'Hamza Yousaf', 'Ilyas Tahir', 'Zeeshan Ahmad', 'Adnan Farooq', 'Mohsin Ahmed',
  'Noor ul Ain', 'Hina Ahmed', 'Maham Ali', 'Rabia Siddiqui', 'Sana Jamal',
  'Fariha Rizvi', 'Ayesha Chaudhry', 'Mahwish Noor', 'Zoya Ahmed', 'Hira Malik',
]

const ADMIN_NAMES: Record<string, string> = {
  'sch-beacon': 'Asma Malik',
  'sch-alnoor': 'Syed Hamza Rizvi',
  'sch-meadowlands': 'Fatima Hasan',
  'sch-sapphire': 'Khalid Butt',
  'sch-sunrise': 'Naheed Abbas',
  'sch-darulilm': 'Bilal Qureshi',
  'sch-quetta': 'Salma Yousaf',
  'sch-aurora': 'Maryam Ahmed',
}

export const SUPER_ADMINS: Person[] = [
  { id: 'u-adm-01', name: 'Adnan Butt', email: 'adnan.butt@paperbuilder.example.pk', role: 'super-admin', schoolId: null, status: 'active', joinedDaysAgo: 720, subjects: [], classes: [] },
  { id: 'u-adm-02', name: 'Liaquat Shah', email: 'liaquat.shah@paperbuilder.example.pk', role: 'super-admin', schoolId: null, status: 'active', joinedDaysAgo: 690, subjects: [], classes: [] },
]

export const SCHOOL_ADMINS: Person[] = SCHOOLS.filter(s => s.status === 'active').map((s, i) => ({
  id: `u-adm-${String(i + 3).padStart(2, '0')}`,
  name: ADMIN_NAMES[s.id],
  email: `${ADMIN_NAMES[s.id].toLowerCase().replace(/[^a-z]+/g, '.')}@${s.name.toLowerCase().replace(/[^a-z]+/g, '')}.example.pk`,
  role: 'school-admin' as const,
  schoolId: s.id,
  status: 'active' as const,
  joinedDaysAgo: randInt(70, 260),
  subjects: [],
  classes: [],
}))

function teacherEmail(name: string, schoolId: string) {
  const slug = schoolId.replace(/^sch-/, '')
  return `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@${slug}.example.pk`
}

export const TEACHERS: Person[] = (() => {
  const activeSchools = SCHOOLS.filter(s => s.status === 'active')
  const perSchool: Record<string, number> = {
    'sch-beacon': 6, 'sch-alnoor': 5, 'sch-meadowlands': 5, 'sch-sapphire': 5,
    'sch-sunrise': 4, 'sch-darulilm': 5, 'sch-quetta': 4, 'sch-aurora': 6,
  }
  const teachers: Person[] = []
  let idx = 0
  for (const s of activeSchools) {
    for (let i = 0; i < perSchool[s.id]; i++) {
      const name = TEACHER_NAMES[idx]
      const classCount = randInt(2, 4)
      const subjectCount = randInt(1, 3)
      const subjects = new Set<string>()
      while (subjects.size < subjectCount) subjects.add(pick(SUBJECTS).id)
      const classes = new Set<string>()
      while (classes.size < classCount) classes.add(pick(CLASSES).id)
      teachers.push({
        id: `u-tch-${String(idx + 1).padStart(2, '0')}`,
        name,
        email: teacherEmail(name, s.id),
        role: 'teacher',
        schoolId: s.id,
        status: rng() < 0.85 ? 'active' : 'invited',
        joinedDaysAgo: randInt(60, 700),
        subjects: [...subjects],
        classes: [...classes],
      })
      idx++
    }
  }
  return teachers
})()

export const USERS: Person[] = [...SUPER_ADMINS, ...SCHOOL_ADMINS, ...TEACHERS]

/* ---------------- Papers ---------------- */

export type PaperStatus = 'draft' | 'submitted' | 'in-review' | 'approved' | 'changes-requested' | 'printed' | 'archived'
export type ExamType = 'monthly' | 'midterm' | 'board-pattern' | 'chapter-test'
export type Term = 'first' | 'second' | 'third'
export type Medium = 'english' | 'urdu' | 'both'

export interface PaperSection {
  id: string
  type: 'mcq' | 'short' | 'long'
  marksPerQuestion: number
  questionCount: number
}

export interface PaperHistoryEntry {
  id: string
  actorId: string
  actorName: string
  actorRole: PersonRole
  action: 'created' | 'submitted' | 'approved' | 'changes-requested' | 'printed' | 'archived' | 'edited'
  comment?: string
  createdAt: string
}

export interface Paper {
  id: string
  title: string
  schoolId: string
  teacherId: string
  classId: string
  subjectId: string
  medium: Medium
  examType: ExamType
  term: Term
  examDate: string  // ISO
  status: PaperStatus
  targetMarks: number
  sections: PaperSection[]
  chapterIds: string[]
  history: PaperHistoryEntry[]
  createdAt: string
  updatedAt: string
  printedAt: string | null
}

export function currentMarks(p: Paper): number {
  return totalMarks(p.sections)
}


function buildSections(_rng: () => number, targetMarks: number): PaperSection[] {
  const mcqPer = pick([1, 2])
  const mcqCount = randInt2(5, 8)
  const shortPer = pick([4, 5, 8])
  const shortCount = randInt2(2, 3)
  const longPer = pick([8, 10, 12])
  const mcqTotal = mcqCount * mcqPer
  const shortTotal = shortCount * shortPer
  const longMarks = Math.max(0, targetMarks - mcqTotal - shortTotal)
  const longCount = Math.round(longMarks / longPer)
  return [
    { id: 'sec-mcq', type: 'mcq', marksPerQuestion: mcqPer, questionCount: mcqCount },
    { id: 'sec-short', type: 'short', marksPerQuestion: shortPer, questionCount: shortCount },
    { id: 'sec-long', type: 'long', marksPerQuestion: longPer, questionCount: longCount },
  ]
}

function randInt2(min: number, max: number) {
  return min + Math.floor(rng() * (max - min + 1))
}

const PAPER_STATUS_SEQUENCE: PaperStatus[] = (function () {
  const seq: PaperStatus[] = [
    ...Array(18).fill('draft'),
    ...Array(8).fill('submitted'),
    ...Array(6).fill('in-review'),
    ...Array(14).fill('approved'),
    ...Array(4).fill('changes-requested'),
    ...Array(5).fill('printed'),
    ...Array(5).fill('archived'),
  ]
  // deterministic shuffle so statuses mix within each school
  const r = mulberry32(98765)
  for (let i = seq.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[seq[i], seq[j]] = [seq[j], seq[i]]
  }
  return seq
})()

const EXAM_TYPES: ExamType[] = ['monthly', 'midterm', 'board-pattern', 'chapter-test']
const TERMS: Term[] = ['first', 'second', 'third']

export const PAPERS: Paper[] = (() => {
  const papers: Paper[] = []
  const activeSchools = SCHOOLS.filter(s => s.status === 'active')
  let idx = 0
  for (const school of activeSchools) {
    const teachers = TEACHERS.filter(t => t.schoolId === school.id && t.status === 'active')
    const count = school.paperCount
    for (let i = 0; i < count; i++) {
      const teacher = pick(teachers)
      const subjectId = pick(teacher.subjects)
      const classId = pick(teacher.classes)
      const chapters = CHAPTERS.filter(c => c.subjectId === subjectId)
      const selectedChapters = chapters
        .filter(() => rng() < 0.7)
        .slice(0, randInt2(2, Math.min(4, chapters.length)))
      const targetMarks = pick([60, 75, 90, 100, 120])
      const medium: Medium = pick(['english', 'urdu', 'both'])
      const status = PAPER_STATUS_SEQUENCE[idx % PAPER_STATUS_SEQUENCE.length]
      const sections = buildSections(rng, targetMarks)
      const createdAt = daysAgo(randInt2(3, 120))
      const updatedAt = daysAgo(randInt2(0, 5))
      const history: PaperHistoryEntry[] = [
        {
          id: `hst-${idx}-0`,
          actorId: teacher.id,
          actorName: teacher.name,
          actorRole: 'teacher',
          action: 'created',
          createdAt,
        },
      ]
      if (status !== 'draft' && status !== 'archived') {
        history.push({ id: `hst-${idx}-1`, actorId: teacher.id, actorName: teacher.name, actorRole: 'teacher', action: 'submitted', createdAt: updatedAt })
      }
      if (status === 'approved' || status === 'printed') {
        const admin = SCHOOL_ADMINS.find(a => a.schoolId === school.id)
        history.push({
          id: `hst-${idx}-2`,
          actorId: admin?.id ?? 'u-adm-01',
          actorName: admin?.name ?? 'Adnan Butt',
          actorRole: 'school-admin',
          action: 'approved',
          createdAt: daysAgo(randInt2(1, 6)),
        })
      }
      if (status === 'printed' || status === 'archived') {
        history.push({ id: `hst-${idx}-3`, actorId: teacher.id, actorName: teacher.name, actorRole: 'teacher', action: 'printed', createdAt: updatedAt })
      }
      const subject = SUBJECTS.find(s => s.id === subjectId)!
      const cls = CLASSES.find(c => c.id === classId)!
      const title = `${subject.nameEn} — ${pick(TERMS)} (${cls.name})`
      papers.push({
        id: `paper-${String(idx + 1).padStart(3, '0')}`,
        title,
        schoolId: school.id,
        teacherId: teacher.id,
        classId,
        subjectId,
        medium,
        examType: pick(EXAM_TYPES),
        term: pick(TERMS),
        examDate: daysAhead(randInt2(5, 90)).split('T')[0],
        status,
        targetMarks,
        sections,
        chapterIds: selectedChapters.map(c => c.id),
        history,
        createdAt,
        updatedAt,
        printedAt: status === 'printed' ? updatedAt : null,
      })
      idx++
    }
  }
  return papers
})()

/* ---------------- Audit events ---------------- */

export type AuditAction =
  | 'school.approved' | 'school.rejected' | 'school.suspended' | 'school.reactivated' | 'school.plan-changed' | 'school.info-requested'
  | 'paper.approved' | 'paper.submitted' | 'paper.printed' | 'teacher.invited' | 'user.invited' | 'user.deactivated'
  | 'plan.limit-changed'
  | 'template.created' | 'announcement.published' | 'announcement.scheduled'

export interface AuditEvent {
  id: string
  actorId: string
  actorName: string
  action: AuditAction
  targetType: 'school' | 'paper' | 'user' | 'template' | 'announcement' | 'plan'
  targetId: string
  targetLabel: string
  createdAt: string
}

export const AUDIT_EVENTS: AuditEvent[] = (() => {
  const events: AuditEvent[] = []
  const activeSchools = SCHOOLS.filter(s => s.status === 'active')
  const superAdmin = SUPER_ADMINS[0]
  const approvedSchools = ['sch-beacon', 'sch-meadowlands', 'sch-sapphire', 'sch-sunrise']
  let n = 0
  for (const school of approvedSchools) {
    const s = SCHOOLS.find(x => x.id === school)!
    events.push({
      id: `aud-${String(++n).padStart(3, '0')}`,
      actorId: superAdmin.id,
      actorName: superAdmin.name,
      action: 'school.approved',
      targetType: 'school',
      targetId: s.id,
      targetLabel: s.name,
      createdAt: daysAgo(randInt2(20, 60)),
    })
  }
  events.push({
    id: `aud-${String(++n).padStart(3, '0')}`, actorId: superAdmin.id, actorName: superAdmin.name,
    action: 'school.suspended', targetType: 'school', targetId: 'sch-ibrahim', targetLabel: 'Ibrahim Model School',
    createdAt: daysAgo(30),
  })
  events.push({
    id: `aud-${String(++n).padStart(3, '0')}`, actorId: superAdmin.id, actorName: superAdmin.name,
    action: 'school.rejected', targetType: 'school', targetId: 'sch-city-view', targetLabel: 'City View School',
    createdAt: daysAgo(35),
  })
  events.push({
    id: `aud-${String(++n).padStart(3, '0')}`, actorId: superAdmin.id, actorName: superAdmin.name,
    action: 'school.plan-changed', targetType: 'school', targetId: 'sch-sapphire', targetLabel: 'Sapphire Trust School',
    createdAt: daysAgo(9),
  })
  const papers = PAPERS.filter(p => p.status === 'approved' || p.status === 'printed').slice(0, 6)
  for (const p of papers) {
    const admin = SCHOOL_ADMINS.find(a => a.schoolId === p.schoolId)
    events.push({
      id: `aud-${String(++n).padStart(3, '0')}`, actorId: admin?.id ?? superAdmin.id, actorName: admin?.name ?? superAdmin.name,
      action: 'paper.approved', targetType: 'paper', targetId: p.id, targetLabel: p.title,
      createdAt: daysAgo(randInt2(1, 8)),
    })
  }
  const pendingTeachers = TEACHERS.filter(t => t.status === 'invited').slice(0, 3)
  for (const t of pendingTeachers) {
    const admin = SCHOOL_ADMINS.find(a => a.schoolId === t.schoolId)
    events.push({
      id: `aud-${String(++n).padStart(3, '0')}`, actorId: admin?.id ?? superAdmin.id, actorName: admin?.name ?? superAdmin.name,
      action: 'teacher.invited', targetType: 'user', targetId: t.id, targetLabel: t.name,
      createdAt: daysAgo(randInt2(1, 12)),
    })
  }
  events.push({
    id: `aud-${String(++n).padStart(3, '0')}`, actorId: superAdmin.id, actorName: superAdmin.name,
    action: 'announcement.published', targetType: 'announcement', targetId: 'ann-01', targetLabel: 'Weekly board review call',
    createdAt: daysAgo(4),
  })
  events.push({
    id: `aud-${String(++n).padStart(3, '0')}`, actorId: SCHOOL_ADMINS[0].id, actorName: SCHOOL_ADMINS[0].name,
    action: 'template.created', targetType: 'template', targetId: 'tpl-beacon', targetLabel: 'Beacon header',
    createdAt: daysAgo(2),
  })
  const printedPapers = PAPERS.filter(p => p.status === 'printed').slice(0, 3)
  for (const p of printedPapers) {
    events.push({
      id: `aud-${String(++n).padStart(3, '0')}`, actorId: SUPER_ADMINS[0].id, actorName: SUPER_ADMINS[0].name,
      action: 'paper.printed', targetType: 'paper', targetId: p.id, targetLabel: p.title,
      createdAt: daysAgo(randInt2(1, 5)),
    })
  }
  const approvedPapers = PAPERS.filter(p => p.status === 'approved').slice(0, 2)
  for (const p of approvedPapers) {
    const admin = SCHOOL_ADMINS.find(a => a.schoolId === p.schoolId)
    events.push({
      id: `aud-${String(++n).padStart(3, '0')}`, actorId: admin?.id ?? SUPER_ADMINS[0].id, actorName: admin?.name ?? SUPER_ADMINS[0].name,
      action: 'paper.approved', targetType: 'paper', targetId: p.id, targetLabel: p.title,
      createdAt: daysAgo(randInt2(2, 7)),
    })
  }
  events.push({
    id: `aud-${String(++n).padStart(3, '0')}`, actorId: SUPER_ADMINS[0].id, actorName: SUPER_ADMINS[0].name,
    action: 'school.reactivated', targetType: 'school', targetId: 'sch-ibrahim', targetLabel: 'Ibrahim Model School',
    createdAt: daysAgo(2),
  })
  events.push({
    id: `aud-${String(++n).padStart(3, '0')}`, actorId: SCHOOL_ADMINS[1].id, actorName: SCHOOL_ADMINS[1].name,
    action: 'user.invited', targetType: 'user', targetId: 'u-tch-10', targetLabel: 'Adeel Mansoor',
    createdAt: daysAgo(1),
  })
  events.push({
    id: `aud-${String(++n).padStart(3, '0')}`, actorId: SCHOOL_ADMINS[2].id, actorName: SCHOOL_ADMINS[2].name,
    action: 'user.invited', targetType: 'user', targetId: 'u-tch-11', targetLabel: 'Tariq Mahmood',
    createdAt: daysAgo(5),
  })
  return events.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 25)
})()

/* ---------------- Notifications ---------------- */

export type NotificationType = 'approval' | 'comment' | 'announcement' | 'invitation'

export interface AppNotification {
  id: string
  userId: string
  type: NotificationType
  titleEn: string
  titleUr: string
  bodyEn: string
  bodyUr: string
  read: boolean
  createdAt: string
}

export const NOTIFICATIONS: AppNotification[] = (() => {
  const items: AppNotification[] = []
  const teacherUsers = TEACHERS.filter(t => t.status === 'active')
  const adminUser = SCHOOL_ADMINS[0]
  const superAdmin = SUPER_ADMINS[0]
  const t1 = teacherUsers[0], t2 = teacherUsers[1], t3 = teacherUsers[2]
  const paperA = PAPERS.find(p => p.status === 'approved')
  const paperB = PAPERS.find(p => p.status === 'changes-requested')
  const paperC = PAPERS.find(p => p.status === 'in-review')
  items.push(
    { id: 'ntf-01', userId: t1.id, type: 'approval', titleEn: 'Paper approved', titleUr: 'کاغذ منظور شد', bodyEn: `\"${paperA?.title ?? 'Midterm paper'}\" was approved.`, bodyUr: 'کاغذ منظور کر دیا گیا۔', read: false, createdAt: daysAgo(0) },
    { id: 'ntf-02', userId: t1.id, type: 'comment', titleEn: 'Changes requested', titleUr: 'تبدیلیاں درکار', bodyEn: `${paperB?.title ?? 'A paper'} needs changes.`, bodyUr: 'کوئی تبدیلیاں درکار ہیں۔', read: false, createdAt: daysAgo(0) },
    { id: 'ntf-03', userId: t2.id, type: 'comment', titleEn: 'Comment on your paper', titleUr: 'آپ کی کاپی میں تبصرہ', bodyEn: `${paperB?.title ?? 'A paper'} — please add marks.`, bodyUr: 'مارک شامل کریں۔', read: true, createdAt: daysAgo(1) },
    { id: 'ntf-04', userId: t3.id, type: 'approval', titleEn: 'Paper approved', titleUr: 'کاغذ منظور شد', bodyEn: `\"${paperA?.title ?? 'Chapter test'}\" was approved.`, bodyUr: 'کاغذ منظور کر دیا گیا۔', read: false, createdAt: daysAgo(1) },
    { id: 'ntf-05', userId: adminUser.id, type: 'approval', titleEn: 'Paper ready for review', titleUr: 'جائزہ کے لیے تیار', bodyEn: `${paperC?.title ?? 'A paper'} is waiting for review.`, bodyUr: 'جائزہ کے لیے تیار ہے۔', read: false, createdAt: daysAgo(0) },
    { id: 'ntf-06', userId: adminUser.id, type: 'announcement', titleEn: 'New announcement', titleUr: 'نئی اطلاع', bodyEn: 'Weekly board review call on Friday.', bodyUr: 'جمعہ کو ہفتہ وار بورڈ ادائیگی کال۔', read: true, createdAt: daysAgo(2) },
    { id: 'ntf-07', userId: superAdmin.id, type: 'invitation', titleEn: 'New school request', titleUr: 'نئی اسکول درخواست', bodyEn: 'Taj Mirza Academy requested access.', bodyUr: 'تاج میرزا ایسوسی ایشی نے درخواست دی۔', read: false, createdAt: daysAgo(0) },
    { id: 'ntf-08', userId: t2.id, type: 'invitation', titleEn: 'You are invited as a teacher', titleUr: 'استاد کے طور پر مدعو ہیں', bodyEn: 'Aurora College invited you.', bodyUr: 'Aurora College نے آپ کو مدعو کیا۔', read: false, createdAt: daysAgo(3) },
    { id: 'ntf-09', userId: adminUser.id, type: 'approval', titleEn: 'Paper approved', titleUr: 'کاغذ منظور شد', bodyEn: `\"${paperA?.title ?? 'Midterm'}\" was approved by the principal.`, bodyUr: 'کاغذ منظور کر دیا گیا۔', read: true, createdAt: daysAgo(4) },
    { id: 'ntf-10', userId: t1.id, type: 'approval', titleEn: 'Paper printed', titleUr: 'کاغذ پرنٹ ہوا', bodyEn: 'Your printed copy is ready.', bodyUr: 'پرنٹ شدہ کاپی تیار ہے۔', read: false, createdAt: daysAgo(5) },
    { id: 'ntf-11', userId: t3.id, type: 'comment', titleEn: 'Approved with comment', titleUr: 'تبصرہ کے ساتھ منظور شدہ', bodyEn: 'Nice work — consider adding a section.', bodyUr: 'عمدہ کام — ایک حصے کو شامل کرنے پر غور کریں۔', read: true, createdAt: daysAgo(6) },
    { id: 'ntf-12', userId: superAdmin.id, type: 'announcement', titleEn: 'Monthly report ready', titleUr: 'ماہانہ رپورٹ تیار', bodyEn: 'November report is available.', bodyUr: 'نومبر کی رپورٹ موجود ہے۔', read: false, createdAt: daysAgo(1) },
    { id: 'ntf-13', userId: adminUser.id, type: 'invitation', titleEn: 'Teacher invited', titleUr: 'استاد مدعو', bodyEn: 'A teacher has been invited to your school.', bodyUr: 'اسکول میں استاد مدعو ہے۔', read: false, createdAt: daysAgo(7) },
    { id: 'ntf-14', userId: t2.id, type: 'announcement', titleEn: 'New school policy', titleUr: 'نئی اسکول پالیسی', bodyEn: 'Approval policy is now required.', bodyUr: 'منظوری پالیسی اب لازمی ہے۔', read: false, createdAt: daysAgo(8) },
    { id: 'ntf-15', userId: t1.id, type: 'comment', titleEn: 'Changes requested', titleUr: 'تبدیلیاں درکار', bodyEn: `${paperB?.title ?? 'A paper'} — please add marks.`, bodyUr: 'مارک شامل کریں۔', read: true, createdAt: daysAgo(9) },
  )
  return items
})()

/* ---------------- Exams ---------------- */

export interface Exam {
  id: string
  classId: string
  subjectId: string
  term: Term
  examDate: string
  examType: ExamType
  schoolId: string
}

export const EXAMS: Exam[] = (() => {
  const exams: Exam[] = []
  const activeSchools = SCHOOLS.filter(s => s.status === 'active')
  for (let i = 0; i < 12; i++) {
    const school = activeSchools[i % activeSchools.length]
    const subjectId = pick(SUBJECTS).id
    const classId = pick(CLASSES).id
    exams.push({
      id: `exam-${String(i + 1).padStart(2, '0')}`,
      classId,
      subjectId,
      term: pick(TERMS),
      examDate: daysAhead(randInt2(5, 70)).split('T')[0],
      examType: pick(EXAM_TYPES),
      schoolId: school.id,
    })
  }
  return exams
})()

/* ---------------- Templates ---------------- */

export interface Template {
  id: string
  schoolId: string
  name: string
  layout: 'logo-left' | 'logo-center'
  bodyFont: 'serif' | 'nastaliq'
  footerText: string
}

export const TEMPLATES: Template[] = SCHOOLS.filter(s => s.status === 'active').map(s => ({
  id: `tpl-${s.id}`,
  schoolId: s.id,
  name: `${s.name} — Standard header`,
  layout: rng() < 0.5 ? 'logo-left' : 'logo-center',
  bodyFont: 'serif',
  footerText: `© ${s.name} — Confidential`,
}))

/* ---------------- Saved questions ---------------- */

export interface SavedQuestion {
  id: string
  teacherId: string
  subjectId: string
  chapterId: string
  type: 'mcq' | 'short' | 'long'
  marks: number
  text: string
  createdAt: string
}

export const SAVED_QUESTIONS: SavedQuestion[] = (() => {
  const teachers = TEACHERS.filter(t => t.status === 'active')
  const items: SavedQuestion[] = []
  for (let i = 0; i < 12; i++) {
    const teacher = pick(teachers)
    const subjectId = pick(teacher.subjects)
    const chapters = CHAPTERS.filter(c => c.subjectId === subjectId)
    const chapter = pick(chapters)
    const type = pick(['mcq', 'short', 'long'] as const)
    items.push({
      id: `sq-${String(i + 1).padStart(2, '0')}`,
      teacherId: teacher.id,
      subjectId,
      chapterId: chapter.id,
      type,
      marks: type === 'mcq' ? 1 : type === 'short' ? 4 : 8,
      text: `${chapter.nameEn} — sample question (${type.toUpperCase()})`,
      createdAt: daysAgo(randInt2(1, 30)),
    })
  }
  return items
})()

/* ---------------- Helpers ---------------- */

export function byId<T extends { id: string }>(arr: T[], id: string): T {
  const item = arr.find(x => x.id === id)
  if (!item) throw new Error(`Not found: ${id}`)
  return item
}

export function schoolName(id: string) {
  return byId(SCHOOLS, id).name
}

export function teacherName(id: string) {
  return byId(TEACHERS, id).name
}

export function subjectName(id: string, lang: 'en' | 'ur') {
  const s = byId(SUBJECTS, id)
  return lang === 'ur' ? s.nameUr : s.nameEn
}

export function chapterName(id: string, lang: 'en' | 'ur') {
  const c = byId(CHAPTERS, id)
  return lang === 'ur' ? c.nameUr : c.nameEn
}

export function className(id: string) {
  return byId(CLASSES, id).name
}

export function personName(id: string) {
  return byId(USERS, id).name
}

export function personRole(id: string): PersonRole {
  return byId(USERS, id).role
}

/* ---------------- Approval requests (school onboarding, B3/B4) ---------------- */

/**
 * A school's request for platform access. `id` IS the public reference
 * number (for example "PB-2026-1042") — it is what the school quotes and
 * what /request-status?id= looks up. `rejectionReason`, when present, is
 * an i18n key suffix under request.status.reasons.* (not display copy).
 * `missingItems` entries are key suffixes under request.status.missing.*.
 */
export type ApprovalRequestStatus = 'pending' | 'info-requested' | 'rejected' | 'approved'

export type ApprovalTimelineType =
  | 'submitted' | 'under-review' | 'info-requested' | 'resubmitted' | 'approved' | 'rejected'

export interface ApprovalTimelineEvent {
  id: string
  type: ApprovalTimelineType
  at: string // ISO
}

export type ApprovalMissingItem = 'certificate' | 'contact' | 'address'

export interface ApprovalRequest {
  id: string
  schoolName: string
  city: string
  status: ApprovalRequestStatus
  submittedAt: string // ISO
  expectedBy: string // ISO — decision expected by this date
  planId: PlanId
  contactName: string
  contactRole?: string
  contactPhone?: string
  contactEmail?: string
  address?: string
  board?: string
  studentsRange?: string
  schoolType?: string
  notes?: string
  documentNames?: string[]
  missingItems?: ApprovalMissingItem[]
  rejectionReason?: string
  /** Internal note written by the reviewing Super Admin (not shown to the school). */
  internalNotes?: string
  timeline: ApprovalTimelineEvent[]
}

/** Seed requests — newest first. New submissions continue the sequence (next: PB-2026-1043). */
export const APPROVAL_REQUESTS: ApprovalRequest[] = [
  {
    id: 'PB-2026-1042',
    schoolName: 'Taj Mirza Academy',
    city: 'Rawalpindi',
    status: 'pending',
    submittedAt: daysAgo(1),
    expectedBy: daysAhead(1),
    planId: 'growth',
    contactName: 'Tariq Mirza',
    contactRole: 'principal',
    contactPhone: '03001234567',
    contactEmail: 'tariq.mirza@example.pk',
    address: 'Main Murree Road, Rawalpindi',
    board: 'bise-rawalpindi',
    studentsRange: '301-600',
    schoolType: 'high',
    notes: '',
    documentNames: ['registration-certificate.pdf'],
    timeline: [
      { id: 'tl-1042-1', type: 'submitted', at: daysAgo(1) },
      { id: 'tl-1042-2', type: 'under-review', at: daysAgo(0) },
    ],
  },
  {
    id: 'PB-2026-1041',
    schoolName: 'Al-Rehman Model School',
    city: 'Bahawalpur',
    status: 'info-requested',
    submittedAt: daysAgo(3),
    expectedBy: daysAhead(1),
    planId: 'starter',
    contactName: 'Rehman Gul',
    contactRole: 'owner',
    contactPhone: '03019876543',
    contactEmail: 'rehman.gul@example.pk',
    address: 'Model Town, Bahawalpur',
    board: 'bise-lahore',
    studentsRange: '101-300',
    schoolType: 'middle',
    notes: '',
    documentNames: [],
    missingItems: ['certificate', 'contact'],
    timeline: [
      { id: 'tl-1041-1', type: 'submitted', at: daysAgo(3) },
      { id: 'tl-1041-2', type: 'under-review', at: daysAgo(2) },
      { id: 'tl-1041-3', type: 'info-requested', at: daysAgo(1) },
    ],
  },
  {
    id: 'PB-2026-1040',
    schoolName: 'City View School',
    city: 'Sialkot',
    status: 'rejected',
    submittedAt: daysAgo(6),
    expectedBy: daysAgo(4),
    planId: 'growth',
    contactName: 'Nadia Aslam',
    contactRole: 'principal',
    contactPhone: '03015551234',
    contactEmail: 'nadia.aslam@example.pk',
    address: 'Cantt Road, Sialkot',
    board: 'bise-lahore',
    studentsRange: '301-600',
    schoolType: 'high',
    notes: '',
    documentNames: ['registration-certificate.pdf'],
    rejectionReason: 'incomplete',
    timeline: [
      { id: 'tl-1040-1', type: 'submitted', at: daysAgo(6) },
      { id: 'tl-1040-2', type: 'under-review', at: daysAgo(5) },
      { id: 'tl-1040-3', type: 'rejected', at: daysAgo(4) },
    ],
  },
  {
    id: 'PB-2026-1039',
    schoolName: 'Ibrahim Model School',
    city: 'Faisalabad',
    status: 'approved',
    submittedAt: daysAgo(9),
    expectedBy: daysAgo(7),
    planId: 'starter',
    contactName: 'Ibrahim Khan',
    contactRole: 'principal',
    contactPhone: '03017778899',
    contactEmail: 'ibrahim.khan@example.pk',
    address: 'Jaranwala Road, Faisalabad',
    board: 'bise-lahore',
    studentsRange: '101-300',
    schoolType: 'primary',
    notes: '',
    documentNames: ['registration-certificate.pdf'],
    timeline: [
      { id: 'tl-1039-1', type: 'submitted', at: daysAgo(9) },
      { id: 'tl-1039-2', type: 'under-review', at: daysAgo(8) },
      { id: 'tl-1039-3', type: 'approved', at: daysAgo(7) },
    ],
  },
]

/* ---------------- Announcements (platform, B8) ---------------- */

export type AnnouncementTarget = 'all' | 'plan' | 'school'
export type AnnouncementStatus = 'scheduled' | 'sent'

export interface Announcement {
  id: string
  title: string
  body: string
  targetType: AnnouncementTarget
  targetPlanId?: PlanId
  targetSchoolId?: string
  status: AnnouncementStatus
  scheduledAt: string | null // ISO — null means "send now"
  sentAt: string | null // ISO
  createdById: string
  createdByName: string
  createdAt: string // ISO
}

/** Seed announcements — newest first. */
export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-01',
    title: 'Weekly board review call',
    body: 'Join the Friday board review call at 11:00. Bring one paper your school printed this week.',
    targetType: 'all',
    status: 'sent',
    scheduledAt: null,
    sentAt: daysAgo(4),
    createdById: 'u-adm-01',
    createdByName: 'Adnan Butt',
    createdAt: daysAgo(4),
  },
  {
    id: 'ann-02',
    title: 'November papers report is ready',
    body: 'Your November papers report is available in Reports. Papers per class, subject and teacher are included.',
    targetType: 'all',
    status: 'sent',
    scheduledAt: null,
    sentAt: daysAgo(1),
    createdById: 'u-adm-01',
    createdByName: 'Adnan Butt',
    createdAt: daysAgo(1),
  },
  {
    id: 'ann-03',
    title: 'New paper templates for Growth schools',
    body: 'Growth plan schools can now use the new board-pattern header templates. Open Templates to try them.',
    targetType: 'plan',
    targetPlanId: 'growth',
    status: 'scheduled',
    scheduledAt: daysAhead(2),
    sentAt: null,
    createdById: 'u-adm-02',
    createdByName: 'Liaquat Shah',
    createdAt: daysAgo(0),
  },
]

/* ---------------- Platform settings (B10) ---------------- */

export interface PlatformSettings {
  platformName: string
  supportEmail: string
  supportPhone: string
  defaultLanguage: 'en' | 'ur'
  defaultPrintLanguage: 'english' | 'urdu' | 'both'
  legalTermsEn: string
  legalTermsUr: string
  legalPrivacyEn: string
  legalPrivacyUr: string
}

/** Seed settings. Legal copy matches the public /legal pages (i18n public.legal.*). */
export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  platformName: 'PaperBuilder',
  supportEmail: 'support@paperbuilder.example.pk',
  supportPhone: '0800-12345',
  defaultLanguage: 'en',
  defaultPrintLanguage: 'both',
  legalTermsEn: 'PaperBuilder is a school examination and paper management platform. Schools use it to build, approve and print exam papers from their own question banks.',
  legalTermsUr: 'پیپر بلڈر اسکول امتحانات اور پرچوں کے انتظام کا پلیٹ فارم ہے۔ اسکول اس سے اپنے سوالیہ بینک سے پرچے بناتے ہیں، منظور کرواتے ہیں اور پرنٹ کرتے ہیں۔',
  legalPrivacyEn: 'PaperBuilder stores school, teacher and student information only to run the school\'s exams and papers. It is never sold or shared with advertisers.',
  legalPrivacyUr: 'پیپر بلڈر اسکول، استاد اور طالب علم کی معلومات صرف اسکول کے امتحانات اور پرچوں کے لیے محفوظ کرتا ہے۔ یہ کبھی فروخت نہیں ہوتیں اور مشتہرین سے شیئر نہیں کی جاتیں۔',
}
