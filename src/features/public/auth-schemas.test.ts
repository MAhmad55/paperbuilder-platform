import { describe, it, expect } from 'vitest'
import {
  DEMO_PASSWORD,
  MOCK_RESET_CODE_EXAMPLE,
  signInSchema,
  forgotEmailSchema,
  resetPasswordSchema,
  inviteSchema,
  passwordStrength,
  strengthLabel,
} from './auth-schemas'

/** First error message code for a field, or undefined when the parse passes. */
type SafeParseLike = {
  success: boolean
  error?: { issues: { path: (string | number)[]; message: string }[] }
}

function codeFor(result: SafeParseLike, field: string): string | undefined {
  if (result.success) return undefined
  return result.error?.issues.find((i) => i.path[0] === field)?.message
}

describe('signInSchema (B2)', () => {
  it('accepts a valid email and any non-empty password', () => {
    expect(signInSchema.safeParse({ email: 'teacher@school.example.pk', password: DEMO_PASSWORD }).success).toBe(true)
  })

  it('trims surrounding whitespace from the email', () => {
    const r = signInSchema.safeParse({ email: '  teacher@school.example.pk  ', password: 'x' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.email).toBe('teacher@school.example.pk')
  })

  it('rejects an empty email with required', () => {
    expect(codeFor(signInSchema.safeParse({ email: '', password: 'x' }), 'email')).toBe('required')
  })

  it('rejects a malformed email with emailInvalid', () => {
    for (const bad of ['not-an-email', 'teacher@', '@school.pk', 'teacher@school']) {
      expect(codeFor(signInSchema.safeParse({ email: bad, password: 'x' }), 'email')).toBe('emailInvalid')
    }
  })

  it('rejects an empty password with required', () => {
    expect(codeFor(signInSchema.safeParse({ email: 'a@b.pk', password: '' }), 'password')).toBe('required')
  })
})

describe('forgotEmailSchema (B5 step 1)', () => {
  it('accepts a valid email', () => {
    expect(forgotEmailSchema.safeParse({ email: 'admin@school.example.pk' }).success).toBe(true)
  })

  it('rejects an empty email with required', () => {
    const r = forgotEmailSchema.safeParse({ email: '' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0]?.message).toBe('required')
  })

  it('rejects a malformed email with emailInvalid', () => {
    const r = forgotEmailSchema.safeParse({ email: 'no-at-sign' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0]?.message).toBe('emailInvalid')
  })
})

describe('resetPasswordSchema (B5 step 2)', () => {
  const valid = { code: MOCK_RESET_CODE_EXAMPLE, password: 'NewPass1!', confirmPassword: 'NewPass1!' }

  it('accepts any 6-digit code with a matching password of 8+ characters', () => {
    expect(resetPasswordSchema.safeParse(valid).success).toBe(true)
    expect(resetPasswordSchema.safeParse({ ...valid, code: '999999' }).success).toBe(true)
  })

  it('rejects a 5-digit code with codeInvalid', () => {
    expect(codeFor(resetPasswordSchema.safeParse({ ...valid, code: '12345' }), 'code')).toBe('codeInvalid')
  })

  it('rejects a 7-digit code with codeInvalid', () => {
    expect(codeFor(resetPasswordSchema.safeParse({ ...valid, code: '1234567' }), 'code')).toBe('codeInvalid')
  })

  it('rejects letters in the code with codeInvalid', () => {
    expect(codeFor(resetPasswordSchema.safeParse({ ...valid, code: '12345a' }), 'code')).toBe('codeInvalid')
  })

  it('rejects an empty code with required', () => {
    expect(codeFor(resetPasswordSchema.safeParse({ ...valid, code: '' }), 'code')).toBe('required')
  })

  it('rejects a password shorter than 8 characters with passwordTooShort', () => {
    expect(
      codeFor(resetPasswordSchema.safeParse({ ...valid, password: 'Short1!', confirmPassword: 'Short1!' }), 'password'),
    ).toBe('passwordTooShort')
  })

  it('rejects a mismatched confirmation with passwordMismatch on confirmPassword', () => {
    expect(
      codeFor(resetPasswordSchema.safeParse({ ...valid, confirmPassword: 'OtherPass1!' }), 'confirmPassword'),
    ).toBe('passwordMismatch')
  })

  it('rejects an empty confirmation with required, not mismatch', () => {
    expect(
      codeFor(resetPasswordSchema.safeParse({ ...valid, confirmPassword: '' }), 'confirmPassword'),
    ).toBe('required')
  })
})

describe('inviteSchema (B6)', () => {
  const valid = { password: 'Teach123!', confirmPassword: 'Teach123!', termsAccepted: true }

  it('accepts a matching 8+ password with terms accepted', () => {
    expect(inviteSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects a password shorter than 8 characters with passwordTooShort', () => {
    expect(codeFor(inviteSchema.safeParse({ ...valid, password: 'T1!', confirmPassword: 'T1!' }), 'password')).toBe(
      'passwordTooShort',
    )
  })

  it('rejects a mismatched confirmation with passwordMismatch on confirmPassword', () => {
    expect(
      codeFor(inviteSchema.safeParse({ ...valid, confirmPassword: 'Different1!' }), 'confirmPassword'),
    ).toBe('passwordMismatch')
  })

  it('rejects unchecked terms with termsRequired on termsAccepted', () => {
    expect(codeFor(inviteSchema.safeParse({ ...valid, termsAccepted: false }), 'termsAccepted')).toBe('termsRequired')
  })
})

describe('passwordStrength', () => {
  it('scores 0 for an empty password', () => {
    expect(passwordStrength('')).toBe(0)
  })

  it('scores 1 for length 8 alone', () => {
    expect(passwordStrength('abcdefgh')).toBe(1)
  })

  it('scores 2 for length 8 with mixed case', () => {
    expect(passwordStrength('Abcdefgh')).toBe(2)
  })

  it('scores 3 for mixed case plus a digit', () => {
    expect(passwordStrength('Abcdefg1')).toBe(3)
  })

  it('scores 4 for mixed case plus a digit plus a symbol', () => {
    expect(passwordStrength('Abcdefg1!')).toBe(4)
  })

  it('does not count length below 8 even with mixed case, digit and symbol', () => {
    expect(passwordStrength('Ab1!')).toBe(3)
  })
})

describe('strengthLabel', () => {
  it('maps 0–1 to weak, 2 to fair, 3 to good, 4 to strong', () => {
    expect(strengthLabel(0)).toBe('weak')
    expect(strengthLabel(1)).toBe('weak')
    expect(strengthLabel(2)).toBe('fair')
    expect(strengthLabel(3)).toBe('good')
    expect(strengthLabel(4)).toBe('strong')
  })
})
