import { z } from 'zod'

/**
 * Auth validation schemas (Phase 2, B2 / B5 / B6).
 *
 * Pure and unit-testable: no i18n, no React, no storage. Each issue's
 * `message` is a short code; pages map it to a copy string via
 * `t('auth.errors.' + code)`. All schemas are demo-only — there is no
 * backend, so the reset code accepts any 6 digits (see B5 decision in
 * DECISIONS.md) and the demo password is a fixed constant.
 */

/** Fixed demo password pre-filled on the sign-in form. */
export const DEMO_PASSWORD = 'demo-password'

/** Example 6-digit code shown in the forgot-password dev hint. Any 6 digits work. */
export const MOCK_RESET_CODE_EXAMPLE = '123456'

const emailField = z
  .string()
  .trim()
  .min(1, { message: 'required' })
  .email({ message: 'emailInvalid' })

const passwordField = (minLength = 8) =>
  z.string().min(minLength, { message: 'passwordTooShort' })

function withPasswordMatch<T extends { password: string; confirmPassword: string }>(
  schema: z.ZodType<T>,
) {
  return schema.superRefine((value, ctx) => {
    if (value.password !== value.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'passwordMismatch',
      })
    }
  })
}

/** B2 — Sign in: email + password. */
export const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, { message: 'required' }),
})
export type SignInInput = z.infer<typeof signInSchema>

/** B5 step 1 — Forgot password: account email only. */
export const forgotEmailSchema = z.object({
  email: emailField,
})
export type ForgotEmailInput = z.infer<typeof forgotEmailSchema>

/** B5 step 2 — Reset: any 6-digit mock code + new password + confirmation. */
export const resetPasswordSchema = withPasswordMatch(
  z.object({
    code: z
      .string()
      .trim()
      .min(1, { message: 'required' })
      .regex(/^\d{6}$/, { message: 'codeInvalid' }),
    password: passwordField(),
    confirmPassword: z.string().min(1, { message: 'required' }),
  }),
)
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

/** B6 — Accept teacher invitation: password + confirmation + terms. */
export const inviteSchema = withPasswordMatch(
  z.object({
    password: passwordField(),
    confirmPassword: z.string().min(1, { message: 'required' }),
    termsAccepted: z.boolean().refine((v) => v === true, { message: 'termsRequired' }),
  }),
)
export type InviteInput = z.infer<typeof inviteSchema>

/**
 * Password strength score, 0–4: length ≥ 8, mixed case, a digit, a symbol.
 * Pure helper for the invite screen's inline strength indicator.
 */
export function passwordStrength(password: string): number {
  let score = 0
  if (password.length >= 8) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  return score
}

export type StrengthLabel = 'weak' | 'fair' | 'good' | 'strong'

export function strengthLabel(score: number): StrengthLabel {
  if (score <= 1) return 'weak'
  if (score === 2) return 'fair'
  if (score === 3) return 'good'
  return 'strong'
}
