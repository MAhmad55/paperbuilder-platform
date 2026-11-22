import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { Button, Input } from '../design-system'
import { PublicLayout } from '../features/public/PublicLayout'
import { useAuth } from '../shell/AuthContext'
import { USERS } from '../services/mock-store'
import type { Person } from '../services/mock-store'
import type { Role } from '../services/types'
import { Bidi } from '../utils/bidi'
import { DEMO_PASSWORD, signInSchema } from '../features/public/auth-schemas'
import '../styles/auth.css'

function roleHome(role: Role): string {
  return role === 'super-admin' ? '/admin' : role === 'school-admin' ? '/school' : '/teacher'
}

function roleKey(role: Role): 'superAdmin' | 'schoolAdmin' | 'teacher' {
  return role === 'super-admin' ? 'superAdmin' : role === 'school-admin' ? 'schoolAdmin' : 'teacher'
}

/** Demo accounts shown in the one-click box: u-adm-01, u-adm-03, u-tch-01. */
const DEMO_IDS = ['u-adm-01', 'u-adm-03', 'u-tch-01'] as const

/**
 * Password field with a show/hide toggle. The design-system Input has no
 * trailing slot, so this is built on the same .pb-input-group markup.
 * Shared by the forgot-password and invite pages (imported from here until
 * the design system gains a trailing-slot Input).
 */
export function PasswordField({
  id, label, value, onChange, error, autoComplete, placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string | null
  autoComplete?: string
  placeholder?: string
}) {
  const { t } = useTranslation()
  const [show, setShow] = useState(false)
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className="pb-field auth-password">
      <label htmlFor={id} className="pb-label">
        {label}
        <span aria-hidden="true" style={{ color: 'var(--pen-600)' }}> *</span>
      </label>
      <div className="pb-input-group">
        <span className="pb-input-group__icon" aria-hidden="true"><Lock size={16} /></span>
        <input
          id={id}
          type={show ? 'text' : 'password'}
          className={['pb-input', error && 'pb-input--error'].filter(Boolean).join(' ')}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          required
        />
        <span className="pb-input-group__trailing">
          <button
            type="button"
            className="auth-password-toggle"
            aria-label={show ? t('auth.signIn.hidePassword') : t('auth.signIn.showPassword')}
            aria-pressed={show}
            onClick={() => setShow(v => !v)}
          >
            {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </span>
      </div>
      {error && <p className="pb-error-text" id={errorId} role="alert">{error}</p>}
    </div>
  )
}

export function SignInPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { switchRole } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [busy, setBusy] = useState(false)

  const demoAccounts: Person[] = DEMO_IDS.flatMap(id => {
    const user = USERS.find(u => u.id === id)
    return user ? [user] : []
  })

  const doSignIn = (role: Role, nextEmail?: string, nextPassword?: string) => {
    if (nextEmail !== undefined) setEmail(nextEmail)
    if (nextPassword !== undefined) setPassword(nextPassword)
    setBusy(true)
    window.setTimeout(() => {
      switchRole(role)
      navigate(roleHome(role), { replace: true })
    }, 350)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    const result = signInSchema.safeParse({ email, password })
    if (!result.success) {
      const next: { email?: string; password?: string } = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as 'email' | 'password'
        if (!next[field]) next[field] = t(`auth.errors.${issue.message}`)
      }
      setErrors(next)
      /* Move focus to the first invalid field, as the request form does. */
      const firstId = next.email ? 'signin-email' : 'signin-password'
      window.setTimeout(() => document.getElementById(firstId)?.focus(), 50)
      return
    }
    setErrors({})
    const match = USERS.find(u => u.email.toLowerCase() === result.data.email.toLowerCase())
    doSignIn(match?.role ?? 'teacher')
  }

  const onDemo = (user: Person) => {
    if (busy) return
    setErrors({})
    doSignIn(user.role, user.email, DEMO_PASSWORD)
  }

  return (
    <PublicLayout>
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">
            <span className="app-rail__logo" aria-hidden="true">PB</span>
          </div>
          <h1>{t('auth.signIn.title')}</h1>
          <p className="auth-subtitle">{t('auth.signIn.subtitle')}</p>

          <form onSubmit={onSubmit} noValidate>
            <div className="auth-field">
              <Input
                id="signin-email"
                type="email"
                label={t('auth.signIn.email')}
                placeholder={t('auth.signIn.emailPlaceholder')}
                leadingIcon={<Mail size={16} />}
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
                error={errors.email ?? null}
              />
            </div>
            <div className="auth-field">
              <PasswordField
                id="signin-password"
                label={t('auth.signIn.password')}
                value={password}
                onChange={setPassword}
                error={errors.password}
                autoComplete="current-password"
                placeholder={t('signIn.passwordPlaceholder')}
              />
            </div>
            <div className="auth-field-links">
              <Link className="auth-link" to="/forgot-password">{t('auth.signIn.forgotPassword')}</Link>
            </div>
            <Button
              type="submit"
              size="lg"
              loading={busy}
              className="auth-submit"
              trailingIcon={<ArrowRight size={18} className="flip-rtl" aria-hidden="true" />}
            >
              {busy ? t('auth.signIn.signingIn') : t('auth.signIn.signIn')}
            </Button>
          </form>

          <div className="auth-demo">
            <h2 className="auth-demo__title">{t('auth.signIn.demoTitle')}</h2>
            <p className="auth-demo__note">{t('auth.signIn.demoNote')}</p>
            <div className="auth-demo__list">
              {demoAccounts.map(user => (
                <button
                  key={user.id}
                  type="button"
                  className="auth-demo__account"
                  disabled={busy}
                  onClick={() => onDemo(user)}
                >
                  <span className="auth-demo__account-text">
                    <span className="auth-demo__account-role">{t(`roles.${roleKey(user.role)}`)}</span>
                    <span className="auth-demo__account-email">
                      <Bidi>{user.name} · {user.email}</Bidi>
                    </span>
                  </span>
                  <ArrowRight size={18} className="flip-rtl auth-demo__account-arrow" aria-hidden="true" />
                </button>
              ))}
            </div>
            <p className="auth-demo__hint">{t('auth.signIn.demoHint')}</p>
          </div>
        </div>

        <p className="auth-foot">
          {t('auth.signIn.noAccess')}{' '}
          <Link className="auth-link" to="/request-access">{t('auth.signIn.requestAccess')}</Link>
        </p>
      </div>
    </PublicLayout>
  )
}

export default SignInPage
