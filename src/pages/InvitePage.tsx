import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { Banner, Button, Card, Checkbox, SegmentedControl } from '../design-system'
import { PublicLayout } from '../features/public/PublicLayout'
import { useAuth } from '../shell/AuthContext'
import { SCHOOLS, SCHOOL_ADMINS } from '../services/mock-store'
import { setLanguage, type AppLanguage } from '../i18n'
import { Bidi } from '../utils/bidi'
import {
  inviteSchema,
  passwordStrength,
  strengthLabel,
  type StrengthLabel,
} from '../features/public/auth-schemas'
import { PasswordField } from './SignInPage'
import '../styles/auth.css'

const STRENGTH_KEY: Record<StrengthLabel, string> = {
  weak: 'strengthWeak',
  fair: 'strengthFair',
  good: 'strengthGood',
  strong: 'strengthStrong',
}

/**
 * Accept teacher invitation — Phase 2 B6. Mock invitation: the first
 * school in mock data (Beacon Model School, Lahore) and its school admin
 * (Asma Malik, u-adm-03) as inviter. On accept, a demo teacher session is
 * created and the teacher dashboard opens.
 */
export function InvitePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { switchRole } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [terms, setTerms] = useState(false)
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string; terms?: string }>({})
  const [busy, setBusy] = useState(false)

  const school = SCHOOLS[0]
  const inviter = SCHOOL_ADMINS[0]

  if (!school || !inviter) {
    return (
      <PublicLayout>
        <div className="auth-page">
          <Banner variant="error" title={t('error.title')}>
            {t('error.lead')}
          </Banner>
        </div>
      </PublicLayout>
    )
  }

  const score = passwordStrength(password)
  const strength = strengthLabel(score)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    const result = inviteSchema.safeParse({ password, confirmPassword, termsAccepted: terms })
    if (!result.success) {
      const next: typeof errors = {}
      for (const issue of result.error.issues) {
        const field = String(issue.path[0])
        if (field === 'termsAccepted') {
          if (!next.terms) next.terms = t(`auth.errors.${issue.message}`)
        } else if ((field === 'password' || field === 'confirmPassword') && !next[field]) {
          next[field] = t(`auth.errors.${issue.message}`)
        }
      }
      setErrors(next)
      /* Move focus to the first invalid field, in form order. */
      const firstId = next.password
        ? 'invite-password'
        : next.confirmPassword
          ? 'invite-confirm-password'
          : 'invite-terms'
      window.setTimeout(() => document.getElementById(firstId)?.focus(), 50)
      return
    }
    setErrors({})
    setBusy(true)
    window.setTimeout(() => {
      switchRole('teacher')
      navigate('/teacher', { replace: true })
    }, 400)
  }

  /* Latin names inside the Urdu sentence: isolate each with <Bidi>. */
  const subtitle = t('auth.invite.subtitle', { inviter: '§INVITER§', school: '§SCHOOL§' })
  const [subtitleBefore, subtitleRest = ''] = subtitle.split('§INVITER§')
  const [subtitleMiddle, subtitleAfter = ''] = subtitleRest.split('§SCHOOL§')

  return (
    <PublicLayout>
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">
            <span className="app-rail__logo" aria-hidden="true">PB</span>
          </div>
          <h1>{t('auth.invite.title')}</h1>
          <p className="auth-subtitle">
            {subtitleBefore}<Bidi>{inviter.name}</Bidi>{subtitleMiddle}<Bidi>{school.name}</Bidi>{subtitleAfter}
          </p>

          <Card className="auth-invite-card" padding="sm">
            <div className="auth-invite-row">
              <span className="auth-invite-row__label">{t('auth.invite.schoolLabel')}</span>
              <span><Bidi>{`${school.name} · ${school.city}`}</Bidi></span>
            </div>
            <div className="auth-invite-row">
              <span className="auth-invite-row__label">{t('auth.invite.invitedBy')}</span>
              <span><Bidi>{inviter.name}</Bidi></span>
              <span className="auth-invite-row__sub"><Bidi>{inviter.email}</Bidi></span>
            </div>
          </Card>

          <form onSubmit={onSubmit} noValidate>
            <div className="auth-block">
              <h2 className="auth-section-label">{t('auth.invite.setPassword')}</h2>
              <div className="auth-field">
                <PasswordField
                  id="invite-password"
                  label={t('auth.invite.password')}
                  value={password}
                  onChange={setPassword}
                  error={errors.password}
                  autoComplete="new-password"
                  placeholder={t('signIn.passwordPlaceholder')}
                />
              </div>
              {password.length > 0 && (
                <div className="auth-strength" aria-live="polite">
                  <span className="auth-strength__bars" aria-hidden="true">
                    {[0, 1, 2, 3].map(i => (
                      <span
                        key={i}
                        className={[
                          'auth-strength__bar',
                          i < score && `auth-strength__bar--on-${strength}`,
                        ].filter(Boolean).join(' ')}
                      />
                    ))}
                  </span>
                  <span className="auth-strength__label">
                    {t('auth.invite.strength')}: {t(`auth.invite.${STRENGTH_KEY[strength]}`)}
                  </span>
                </div>
              )}
              <p className="auth-hint">{t('auth.invite.passwordHint')}</p>
              <div className="auth-field">
                <PasswordField
                  id="invite-confirm-password"
                  label={t('auth.invite.confirmPassword')}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  error={errors.confirmPassword}
                  autoComplete="new-password"
                  placeholder={t('signIn.passwordPlaceholder')}
                />
              </div>
            </div>

            <div className="auth-block">
              <h2 className="auth-section-label">{t('auth.invite.language')}</h2>
              <SegmentedControl
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'ur', label: 'اردو' },
                ]}
                value={i18n.language}
                onChange={v => setLanguage(v as AppLanguage)}
                ariaLabel={t('auth.invite.language')}
              />
              <p className="auth-section-hint">{t('auth.invite.languageHint')}</p>
            </div>

            <div className="auth-block">
              <Checkbox
                id="invite-terms"
                label={t('auth.invite.terms')}
                checked={terms}
                onChange={e => setTerms(e.target.checked)}
                error={errors.terms}
              />
              {errors.terms && (
                <p className="pb-error-text auth-terms-error" role="alert">{errors.terms}</p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              loading={busy}
              className="auth-submit"
              trailingIcon={<ArrowRight size={18} className="flip-rtl" aria-hidden="true" />}
            >
              {busy ? t('auth.invite.accepting') : t('auth.invite.acceptButton')}
            </Button>
          </form>
        </div>
      </div>
    </PublicLayout>
  )
}

export default InvitePage
