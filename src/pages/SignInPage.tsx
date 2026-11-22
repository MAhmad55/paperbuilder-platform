import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import { Input, Button } from '../design-system'
import { useAuth } from '../shell/AuthContext'

export function SignInPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('demo@paperbuilder.example.pk')
  const [password, setPassword] = useState('demo-password')
  const [busy, setBusy] = useState(false)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    window.setTimeout(() => {
      signIn()
      setBusy(false)
      navigate('/')
    }, 350)
  }

  return (
    <main className="signin-page">
      <div className="signin-page__card">
        <div className="signin-page__brand">
          <span className="app-rail__logo" aria-hidden="true">PB</span>
        </div>
        <h1>{t('signIn.title')}</h1>
        <p className="signin-page__subtitle">{t('signIn.subtitle')}</p>

        <form onSubmit={onSubmit} noValidate>
          <div className="signin-page__field">
            <Input
              type="email"
              label={t('signIn.email')}
              placeholder={t('signIn.emailPlaceholder')}
              leadingIcon={<Mail size={16} />}
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="signin-page__field">
            <Input
              type="password"
              label={t('signIn.password')}
              placeholder={t('signIn.passwordPlaceholder')}
              leadingIcon={<Lock size={16} />}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" size="lg" loading={busy} trailingIcon={<ArrowRight size={18} className="flip-rtl" aria-hidden="true" />} style={{ width: '100%', marginTop: 8 }}>
            {t('signIn.signIn')}
          </Button>
        </form>

        <p className="signin-page__note">{t('signIn.demoNote')}</p>
      </div>
    </main>
  )
}

export default SignInPage
