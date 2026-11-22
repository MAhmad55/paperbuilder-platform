import { z } from 'zod'

/**
 * Request-access (B3) validation schemas — pure, unit-testable.
 *
 * Each constraint carries a short error *code* as its message (not copy):
 * the page maps `request.errors.<code>` through i18n. Codes: required,
 * tooShort, invalidEmail, invalidPhone, fileRequired, fileTooLarge,
 * fileType, consentRequired.
 *
 * Documents are validated as plain descriptors ({ name, size, type }) so
 * the schema works for freshly picked Files and for files restored from
 * the saved draft alike.
 */

export const MAX_FILE_BYTES = 5 * 1024 * 1024

export const BOARDS = ['bise-lahore', 'bise-rawalpindi', 'bise-karachi', 'fbise', 'cambridge', 'other'] as const
export const STUDENT_RANGES = ['1-100', '101-300', '301-600', '601-1000', '1000+'] as const
export const SCHOOL_TYPES = ['primary', 'middle', 'high', 'higher-secondary'] as const
export const CONTACT_ROLES = ['principal', 'vice-principal', 'admin', 'owner', 'other'] as const
export const PLAN_IDS = ['starter', 'growth', 'enterprise'] as const

export type Board = (typeof BOARDS)[number]
export type StudentRange = (typeof STUDENT_RANGES)[number]
export type SchoolType = (typeof SCHOOL_TYPES)[number]
export type ContactRole = (typeof CONTACT_ROLES)[number]
export type PlanIdChoice = (typeof PLAN_IDS)[number]

/** DOM id of the first focusable control for each form field. */
export const FIELD_IDS = {
  schoolName: 'req-school-name',
  city: 'req-city',
  address: 'req-address',
  board: 'req-board',
  studentsRange: 'req-students',
  schoolType: 'req-school-type',
  contactName: 'req-contact-name',
  contactRole: 'req-contact-role',
  contactPhone: 'req-contact-phone',
  contactEmail: 'req-contact-email',
  certificate: 'req-certificate',
  additional: 'req-additional',
  planId: 'req-plan-starter',
  notes: 'req-notes',
  consent: 'req-consent',
} as const

export type RequestFieldKey = keyof typeof FIELD_IDS

export const DRAFT_STORAGE_KEY = 'paperbuilder.request-draft.v1'

/* ---------------- Section 1 — school details ---------------- */

export const schoolDetailsSchema = z.object({
  schoolName: z.string().trim().min(1, 'required').min(3, 'tooShort'),
  city: z.string().trim().min(1, 'required').min(2, 'tooShort'),
  address: z.string().trim().min(1, 'required').min(8, 'tooShort'),
  board: z.enum(BOARDS, { message: 'required' }),
  studentsRange: z.enum(STUDENT_RANGES, { message: 'required' }),
  schoolType: z.enum(SCHOOL_TYPES, { message: 'required' }),
})

export type SchoolDetailsForm = z.infer<typeof schoolDetailsSchema>

/* ---------------- Section 2 — contact person ---------------- */

const PAK_MOBILE = /^(\+92|0)3\d{9}$/

export const contactSchema = z.object({
  contactName: z.string().trim().min(1, 'required').min(3, 'tooShort'),
  contactRole: z.enum(CONTACT_ROLES, { message: 'required' }),
  contactPhone: z
    .string()
    .trim()
    .min(1, 'required')
    .refine((v) => PAK_MOBILE.test(v.replace(/[\s-]/g, '')), 'invalidPhone'),
  contactEmail: z.string().trim().min(1, 'required').email('invalidEmail'),
})

export type ContactForm = z.infer<typeof contactSchema>

/* ---------------- Section 3 — documents ---------------- */

export interface FileDescriptor {
  name: string
  size: number
  type: string
}

export function toDescriptor(f: File): FileDescriptor {
  return { name: f.name, size: f.size, type: f.type }
}

const ACCEPTED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png']

export const fileDescriptorSchema = z
  .object({
    name: z.string().min(1, 'required'),
    size: z.number(),
    type: z.string(),
  })
  .superRefine((f, ctx) => {
    if (f.size > MAX_FILE_BYTES) {
      ctx.addIssue({ code: 'custom', message: 'fileTooLarge' })
    }
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      ctx.addIssue({ code: 'custom', message: 'fileType' })
    }
  })

export const documentsSchema = z.object({
  certificate: z.array(fileDescriptorSchema).min(1, 'fileRequired'),
  additional: z.array(fileDescriptorSchema),
})

export type DocumentsForm = z.infer<typeof documentsSchema>

/* ---------------- Section 4 — plan interest ---------------- */

export const planSchema = z.object({
  planId: z.enum(PLAN_IDS, { message: 'required' }),
  notes: z.string(),
})

export type PlanForm = z.infer<typeof planSchema>

/* ---------------- Section 5 — review ---------------- */

export const reviewSchema = z.object({
  consent: z.boolean().refine((v) => v === true, 'consentRequired'),
})

export type ReviewForm = z.infer<typeof reviewSchema>

/* ---------------- Full form ---------------- */

export const requestFormSchema = schoolDetailsSchema
  .merge(contactSchema)
  .merge(documentsSchema)
  .merge(planSchema)
  .merge(reviewSchema)
  .extend({
    /** Set when editing a request that was sent back for information. */
    resubmitRef: z.string().optional(),
  })

export type RequestFormData = z.infer<typeof requestFormSchema>

export const EMPTY_REQUEST_FORM: RequestFormData = {
  schoolName: '',
  city: '',
  address: '',
  board: '' as Board,
  studentsRange: '' as StudentRange,
  schoolType: '' as SchoolType,
  contactName: '',
  contactRole: '' as ContactRole,
  contactPhone: '',
  contactEmail: '',
  certificate: [],
  additional: [],
  planId: '' as PlanIdChoice,
  notes: '',
  consent: false,
}

export type RequestStepId = 'school' | 'contact' | 'documents' | 'plan' | 'review'

export const REQUEST_STEPS: RequestStepId[] = ['school', 'contact', 'documents', 'plan', 'review']

export const SECTION_SCHEMAS: Record<RequestStepId, z.ZodTypeAny> = {
  school: schoolDetailsSchema,
  contact: contactSchema,
  documents: documentsSchema,
  plan: planSchema,
  review: reviewSchema,
}

export const SECTION_FIELDS: Record<RequestStepId, RequestFieldKey[]> = {
  school: ['schoolName', 'city', 'address', 'board', 'studentsRange', 'schoolType'],
  contact: ['contactName', 'contactRole', 'contactPhone', 'contactEmail'],
  documents: ['certificate', 'additional'],
  plan: ['planId', 'notes'],
  review: ['consent'],
}

/** Field-level errors for one section: field key -> error code. */
export type FieldErrors = Partial<Record<RequestFieldKey, string>>

export function validateSection(
  step: RequestStepId,
  data: RequestFormData,
): { ok: boolean; errors: FieldErrors } {
  const result = SECTION_SCHEMAS[step].safeParse(data)
  if (result.success) return { ok: true, errors: {} }
  const errors: FieldErrors = {}
  for (const issue of result.error.issues) {
    const key = issue.path[0] as RequestFieldKey | undefined
    if (key && !(key in errors)) errors[key] = issue.message
  }
  return { ok: false, errors }
}

export function validateFullForm(data: RequestFormData): { ok: boolean; errors: FieldErrors } {
  const result = requestFormSchema.safeParse(data)
  if (result.success) return { ok: true, errors: {} }
  const errors: FieldErrors = {}
  for (const issue of result.error.issues) {
    const key = issue.path[0] as RequestFieldKey | undefined
    if (key && !(key in errors)) errors[key] = issue.message
  }
  return { ok: false, errors }
}

/** First invalid field of a section, in form order (for focus management). */
export function firstErrorField(step: RequestStepId, errors: FieldErrors): RequestFieldKey | undefined {
  return SECTION_FIELDS[step].find((f) => errors[f])
}

/**
 * Add `days` working days to an ISO date (skips Saturday and Sunday,
 * the Pakistan weekend). Used for the expected-decision date.
 */
export function addWorkingDays(isoDate: string, days: number): string {
  const d = new Date(isoDate)
  if (isNaN(d.getTime())) return isoDate
  let remaining = days
  while (remaining > 0) {
    d.setDate(d.getDate() + 1)
    const day = d.getDay()
    if (day !== 0 && day !== 6) remaining -= 1
  }
  return d.toISOString()
}
