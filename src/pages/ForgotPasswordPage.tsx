import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react'
import { Banner, Button, Input } from '../design-system'
import { PublicLayout } from '../features/public/PublicLayout'
import { Bidi } from '../utils/bidi'
import {
  forgotEmailSchema,
  resetPasswordSchema,
  MOCK_RESET_CODE_EXAMPLE,
} from '../features/public/auth-schemas'
import { PasswordField } from './SignInPage'
import '../styles/auth.css'

type Step = 'email' | 'reset' | 'success'

type FieldErrors = Partial<Record<'email' | 'code' | 'password' | 'confirmPassword', string>>

function mapIssues(
  issues: { path: (string | number)[]; message: string }[],
  t: (key: string) => string,
): FieldErrors {
  const next: FieldErrors = {}
  for (const issue of issues) {
    const field = issue.path[0] as keyof FieldErrors
    if (field && !next[field]) next[field] = t(`auth.errors.${issue.message}`)
  }
  return next
}

/**
 * Forgot / reset password — Phase 2 B5. Two steps, demo-only: there is no
 * email delivery, so step 2 accepts any 6-digit code and shows a dev hint
 * with an example code. Success state links back to sign-in.
 */
export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [busy, setBusy] = useState(false)
  const [resent, setResent] = useState(false)

  const onEmailSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    const result = forgotEmailSchema.safeParse({ email })
    if (!result.success) {
      setErrors(mapIssues(result.error.issues, t))
      window.setTimeout(() => document.getElementById('forgot-email')?.focus(), 50)
      return
    }
    setErrors({})
    setResent(false)
    setStep('reset')
  }

  const onResetSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    const result = resetPasswordSchema.safeParse({ code, password, confirmPassword })
    if (!result.success) {
      const mapped = mapIssues(result.error.issues, t)
      setErrors(mapped)
      /* Move focus to the first invalid field, in form order. */
      const firstId = mapped.code
        ? 'forgot-code'
        : mapped.password
          ? 'reset-password'
          : 'reset-confirm-password'
      window.setTimeout(() => document.getElementById(firstId)?.focus(), 50)
      return
    }
    setErrors({})
    setBusy(true)
    window.setTimeout(() => {
      setBusy(false)
      setStep('success')
    }, 400)
  }

  const onResend = () => {
    setCode('')
    setResent(true)
  }

  /* Email is a Latin run inside an Urdu sentence: isolate it with <Bidi>. */
  const codeSubtitle = t('auth.forgot.codeSubtitle', { email: '§EMAIL§' })
  const [subtitleBefore, subtitleAfter = ''] = codeSubtitle.split('§EMAIL§')

  return (
    <PublicLayout>
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">
            <span className="app-rail__logo" aria-hidden="true">PB</span>
          </div>
          <h1>{t('auth.forgot.title')}</h1>

          {step === 'email' && (
            <>
              <p className="auth-step">{t('auth.forgot.step1')}</p>
              <p className="auth-subtitle">{t('auth.forgot.subtitle')}</p>
              <form onSubmit={onEmailSubmit} noValidate>
                <div className="auth-field">
                  <Input
                    id="forgot-email"
                    type="email"
                    label={t('auth.forgot.email')}
                    placeholder={t('auth.signIn.emailPlaceholder')}
                    leadingIcon={<Mail size={16} />}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    error={errors.email ?? null}
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  loading={busy}
                  className="auth-submit"
                  trailingIcon={<ArrowRight size={18} className="flip-rtl" aria-hidden="true" />}
                >
                  {t('auth.forgot.sendCode')}
                </Button>
              </form>
            </>
          )}

          {step === 'reset' && (
            <>
              <p className="auth-step">{t('auth.forgot.step2')}</p>
              <p className="auth-subtitle">
                {subtitleBefore}<Bidi>{email}</Bidi>{subtitleAfter}
              </p>
              <p className="auth-hint auth-hint--info">
                {t('auth.forgot.codeHint', { code: MOCK_RESET_CODE_EXAMPLE })}
              </p>
              <form onSubmit={onResetSubmit} noValidate>
                <div className="auth-field">
                  <Input
                    id="forgot-code"
                    type="text"
                    inputMode="numeric"
                    label={t('auth.forgot.codeLabel')}
                    placeholder={t('auth.forgot.codePlaceholder')}
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    error={errors.code ?? null}
                  />
                </div>
                <div className="auth-field">
                  <PasswordField
                    id="reset-password"
                    label={t('auth.forgot.newPassword')}
                    value={password}
                    onChange={setPassword}
                    error={errors.password}
                    autoComplete="new-password"
                    placeholder={t('signIn.passwordPlaceholder')}
                  />
                </div>
                <div className="auth-field">
                  <PasswordField
                    id="reset-confirm-password"
                    label={t('auth.forgot.confirmPassword')}
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    error={errors.confirmPassword}
                    autoComplete="new-password"
                    placeholder={t('signIn.passwordPlaceholder')}
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  loading={busy}
                  className="auth-submit"
                  trailingIcon={<ArrowRight size={18} className="flip-rtl" aria-hidden="true" />}
                >
                  {t('auth.forgot.resetPassword')}
                </Button>
              </form>
              <div className="auth-resend">
                <button type="button" className="auth-link" onClick={() => setStep('email')}>
                  <span className="auth-back" style={{ marginBlockEnd: 0 }}>
                    <ArrowLeft size={16} className="flip-rtl" aria-hidden="true" />
                    {t('auth.forgot.backToEmail')}
                  </span>
                </button>
                <span>
                  {resent && <span className="auth-resend__sent">{t('auth.forgot.codeResent')} </span>}
                  <button type="button" className="auth-link" onClick={onResend}>
                    {t('auth.forgot.resendCode')}
                  </button>
                </span>
              </div>
            </>
          )}

          {step === 'success' && (
            <>
              <Banner variant="success" title={t('auth.forgot.successTitle')}>
                {t('auth.forgot.successLead')}
              </Banner>
              <Button
                size="lg"
                className="auth-submit"
                onClick={() => navigate('/sign-in')}
                trailingIcon={<ArrowRight size={18} className="flip-rtl" aria-hidden="true" />}
              >
                {t('auth.forgot.backToSignIn')}
              </Button>
            </>
          )}
        </div>

        {step !== 'success' && (
          <p className="auth-foot">
            <button type="button" className="auth-link" onClick={() => navigate('/sign-in')}>
              {t('auth.forgot.backToSignIn')}
            </button>
          </p>
        )}
      </div>
    </PublicLayout>
  )
}

export default ForgotPasswordPage
