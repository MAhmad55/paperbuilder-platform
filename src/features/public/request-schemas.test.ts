import { describe, it, expect } from 'vitest'
import {
  MAX_FILE_BYTES,
  EMPTY_REQUEST_FORM,
  schoolDetailsSchema,
  contactSchema,
  documentsSchema,
  planSchema,
  reviewSchema,
  requestFormSchema,
  validateSection,
  validateFullForm,
  firstErrorField,
  addWorkingDays,
  type RequestFormData,
} from './request-schemas'

function codes(result: { success: boolean; error?: { issues: { path: (string | number)[]; message: string }[] } }) {
  if (result.success) return {}
  const out: Record<string, string> = {}
  for (const issue of result.error!.issues) {
    const key = String(issue.path[0])
    if (!(key in out)) out[key] = issue.message
  }
  return out
}

const validSchool = {
  schoolName: 'Beacon Model School',
  city: 'Lahore',
  address: '12 Garden Town, Lahore',
  board: 'bise-lahore' as const,
  studentsRange: '301-600' as const,
  schoolType: 'high' as const,
}

const validContact = {
  contactName: 'Asma Malik',
  contactRole: 'principal' as const,
  contactPhone: '03001234567',
  contactEmail: 'asma@school.example.pk',
}

const validDocs = {
  certificate: [{ name: 'registration.pdf', size: 1024, type: 'application/pdf' }],
  additional: [],
}

const validPlan = { planId: 'growth' as const, notes: '' }

const validForm: RequestFormData = {
  ...EMPTY_REQUEST_FORM,
  ...validSchool,
  ...validContact,
  ...validDocs,
  ...validPlan,
  consent: true,
}

describe('schoolDetailsSchema (B3 section 1)', () => {
  it('accepts a complete valid section', () => {
    expect(schoolDetailsSchema.safeParse(validSchool).success).toBe(true)
  })

  it('rejects an empty school name with required', () => {
    expect(codes(schoolDetailsSchema.safeParse({ ...validSchool, schoolName: '' })).schoolName).toBe('required')
  })

  it('rejects a 2-letter school name with tooShort', () => {
    expect(codes(schoolDetailsSchema.safeParse({ ...validSchool, schoolName: 'AB' })).schoolName).toBe('tooShort')
  })

  it('rejects a 1-letter city with tooShort', () => {
    expect(codes(schoolDetailsSchema.safeParse({ ...validSchool, city: 'L' })).city).toBe('tooShort')
  })

  it('rejects a short address with tooShort', () => {
    expect(codes(schoolDetailsSchema.safeParse({ ...validSchool, address: 'Short' })).address).toBe('tooShort')
  })

  it('rejects an unknown board with required', () => {
    expect(codes(schoolDetailsSchema.safeParse({ ...validSchool, board: 'unknown-board' })).board).toBe('required')
  })

  it('rejects an unknown students range with required', () => {
    expect(codes(schoolDetailsSchema.safeParse({ ...validSchool, studentsRange: 'many' })).studentsRange).toBe(
      'required',
    )
  })

  it('rejects an unknown school type with required', () => {
    expect(codes(schoolDetailsSchema.safeParse({ ...validSchool, schoolType: 'college' })).schoolType).toBe('required')
  })
})

describe('contactSchema (B3 section 2) — Pakistani phone', () => {
  it('accepts a complete valid section', () => {
    expect(contactSchema.safeParse(validContact).success).toBe(true)
  })

  it('accepts the +92 international form', () => {
    expect(contactSchema.safeParse({ ...validContact, contactPhone: '+923001234567' }).success).toBe(true)
  })

  it('accepts spaces and dashes in the number', () => {
    expect(contactSchema.safeParse({ ...validContact, contactPhone: '+92 300 1234567' }).success).toBe(true)
    expect(contactSchema.safeParse({ ...validContact, contactPhone: '0300-1234567' }).success).toBe(true)
  })

  it('rejects a number with too few digits with invalidPhone', () => {
    expect(codes(contactSchema.safeParse({ ...validContact, contactPhone: '0300123456' })).contactPhone).toBe(
      'invalidPhone',
    )
  })

  it('rejects a number with too many digits with invalidPhone', () => {
    expect(codes(contactSchema.safeParse({ ...validContact, contactPhone: '030012345678' })).contactPhone).toBe(
      'invalidPhone',
    )
  })

  it('rejects a non-mobile prefix (04…) with invalidPhone', () => {
    expect(codes(contactSchema.safeParse({ ...validContact, contactPhone: '04001234567' })).contactPhone).toBe(
      'invalidPhone',
    )
  })

  it('rejects a landline-style number with invalidPhone', () => {
    expect(codes(contactSchema.safeParse({ ...validContact, contactPhone: '04235712345' })).contactPhone).toBe(
      'invalidPhone',
    )
  })

  it('rejects an empty phone with required', () => {
    expect(codes(contactSchema.safeParse({ ...validContact, contactPhone: '' })).contactPhone).toBe('required')
  })

  it('rejects a malformed email with invalidEmail', () => {
    expect(codes(contactSchema.safeParse({ ...validContact, contactEmail: 'asma@' })).contactEmail).toBe('invalidEmail')
  })

  it('rejects a short contact name with tooShort', () => {
    expect(codes(contactSchema.safeParse({ ...validContact, contactName: 'As' })).contactName).toBe('tooShort')
  })
})

describe('documentsSchema (B3 section 3)', () => {
  it('accepts a certificate PDF under the size limit', () => {
    expect(documentsSchema.safeParse(validDocs).success).toBe(true)
  })

  it('accepts jpg / jpeg / png certificates', () => {
    for (const name of ['cert.jpg', 'cert.jpeg', 'cert.png']) {
      expect(
        documentsSchema.safeParse({ certificate: [{ name, size: 500, type: 'image/jpeg' }], additional: [] }).success,
      ).toBe(true)
    }
  })

  it('rejects a missing certificate with fileRequired', () => {
    expect(codes(documentsSchema.safeParse({ certificate: [], additional: [] })).certificate).toBe('fileRequired')
  })

  it('rejects an oversized file with fileTooLarge', () => {
    const r = documentsSchema.safeParse({
      certificate: [{ name: 'big.pdf', size: MAX_FILE_BYTES + 1, type: 'application/pdf' }],
      additional: [],
    })
    expect(codes(r).certificate).toBe('fileTooLarge')
  })

  it('accepts a file exactly at the size limit', () => {
    expect(
      documentsSchema.safeParse({
        certificate: [{ name: 'edge.pdf', size: MAX_FILE_BYTES, type: 'application/pdf' }],
        additional: [],
      }).success,
    ).toBe(true)
  })

  it('rejects an unsupported extension with fileType', () => {
    const r = documentsSchema.safeParse({
      certificate: [{ name: 'cert.exe', size: 100, type: 'application/octet-stream' }],
      additional: [],
    })
    expect(codes(r).certificate).toBe('fileType')
  })

  it('rejects an oversized additional file too', () => {
    const r = documentsSchema.safeParse({
      ...validDocs,
      additional: [{ name: 'huge.pdf', size: MAX_FILE_BYTES + 1, type: 'application/pdf' }],
    })
    expect(codes(r).additional).toBe('fileTooLarge')
  })
})

describe('planSchema and reviewSchema (B3 sections 4–5)', () => {
  it('accepts a chosen plan with optional notes', () => {
    expect(planSchema.safeParse(validPlan).success).toBe(true)
    expect(planSchema.safeParse({ planId: 'starter', notes: 'Need Urdu medium.' }).success).toBe(true)
  })

  it('rejects a missing plan with required', () => {
    expect(codes(planSchema.safeParse({ planId: '', notes: '' })).planId).toBe('required')
  })

  it('accepts consent given', () => {
    expect(reviewSchema.safeParse({ consent: true }).success).toBe(true)
  })

  it('rejects missing consent with consentRequired', () => {
    expect(codes(reviewSchema.safeParse({ consent: false })).consent).toBe('consentRequired')
  })
})

describe('requestFormSchema (full form)', () => {
  it('accepts a complete valid form', () => {
    expect(requestFormSchema.safeParse(validForm).success).toBe(true)
  })

  it('accepts an optional resubmit reference', () => {
    expect(requestFormSchema.safeParse({ ...validForm, resubmitRef: 'req-123' }).success).toBe(true)
  })

  it('rejects the empty form', () => {
    const r = requestFormSchema.safeParse(EMPTY_REQUEST_FORM)
    expect(r.success).toBe(false)
  })
})

describe('validateSection / validateFullForm / firstErrorField', () => {
  it('validateSection reports ok for a valid section', () => {
    expect(validateSection('school', validForm)).toEqual({ ok: true, errors: {} })
  })

  it('validateSection reports the first error code per field', () => {
    const bad = { ...validForm, contactPhone: '123', contactEmail: 'bad' }
    const { ok, errors } = validateSection('contact', bad)
    expect(ok).toBe(false)
    expect(errors.contactPhone).toBe('invalidPhone')
    expect(errors.contactEmail).toBe('invalidEmail')
  })

  it('validateFullForm catches an invalid section anywhere in the form', () => {
    const { ok, errors } = validateFullForm({ ...validForm, consent: false })
    expect(ok).toBe(false)
    expect(errors.consent).toBe('consentRequired')
  })

  it('firstErrorField returns the first invalid field in form order', () => {
    const bad = { ...validForm, schoolName: '', city: '' }
    const { errors } = validateSection('school', bad)
    expect(firstErrorField('school', errors)).toBe('schoolName')
  })

  it('firstErrorField returns undefined when there are no errors', () => {
    expect(firstErrorField('school', {})).toBeUndefined()
  })
})

describe('addWorkingDays', () => {
  it('adds 1 working day from Friday to Monday, skipping the weekend', () => {
    // 2026-11-20 is a Friday; Sat 21 and Sun 22 are skipped.
    expect(addWorkingDays('2026-11-20', 1)).toBe('2026-11-23T00:00:00.000Z')
  })

  it('adds 3 working days from Friday to Wednesday', () => {
    expect(addWorkingDays('2026-11-20', 3)).toBe('2026-11-25T00:00:00.000Z')
  })

  it('adds 5 working days from Friday to the next Friday', () => {
    expect(addWorkingDays('2026-11-20', 5)).toBe('2026-11-27T00:00:00.000Z')
  })

  it('adds 1 working day from a Saturday to Monday', () => {
    expect(addWorkingDays('2026-11-21', 1)).toBe('2026-11-23T00:00:00.000Z')
  })

  it('adds 0 working days unchanged', () => {
    expect(addWorkingDays('2026-11-20', 0)).toBe('2026-11-20T00:00:00.000Z')
  })

  it('returns the input unchanged for an invalid date', () => {
    expect(addWorkingDays('not-a-date', 3)).toBe('not-a-date')
  })
})
