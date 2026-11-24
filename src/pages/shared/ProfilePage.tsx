import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../shell/PageHeader'
import { Banner, Button, Card, EmptyState, Input, Skeleton, useToast } from '../../design-system'
import { SharedService } from '../../services/mock-store'
import { AVATAR_CHOICES, validatePasswordChange } from '../../services/shared'
import type { AppLanguage } from '../../i18n'
import { Bidi } from '../../utils/bidi'
import { useAuth } from '../../shell/AuthContext'
import { roleLabelKey } from '../../shell/navigation'
import {
  AVATAR_COLOURS, avatarInitials, className, demoModeOf, subjectName,
  useSchoolDemo, useSharedUser, userSchool,
} from './shared'

const PROFILE_ERROR_KEYS: Record<string, string> = {
  'name-required': 'nameRequired',
  'email-invalid': 'emailInvalid',
  'phone-invalid': 'phoneInvalid',
}

const PASSWORD_ERROR_KEYS: Record<string, string> = {
  'current-required': 'currentRequired',
  'password-too-short': 'tooShort',
  'password-mismatch': 'mismatch',
  'password-same-as-current': 'sameAsCurrent',
}

/** Profile (blueprint 4.5.1) — name, photo, subjects, contact, password.
    Edits persist in the mock store (profile override) and the TopBar name
    updates at once via AuthContext.refreshProfile. */
export function ProfilePage() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const { refreshProfile } = useAuth()
  const [params] = useSearchParams()
  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage
  const demoMode = demoModeOf(params.get('demo'))
  const { loading, loadFailed, retry } = useSchoolDemo(demoMode)
  const forceEmpty = demoMode === 'empty'

  const user = useSharedUser()
  const school = userSchool(user)

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [avatar, setAvatar] = useState(user?.avatar ?? 'initials')
  const [saveErrors, setSaveErrors] = useState<string[]>([])
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])

  // The demo user is fixed per role; re-seed the form when it changes.
  useEffect(() => {
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
    setPhone(user?.phone ?? '')
    setAvatar(user?.avatar ?? 'initials')
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const subjects = useMemo(
    () => (forceEmpty || !user ? [] : user.subjects),
    [forceEmpty, user],
  )
  const classes = useMemo(
    () => (forceEmpty || !user ? [] : user.classes),
    [forceEmpty, user],
  )

  if (!user) {
    return (
      <div className="shared">
        <Banner variant="error" title={t('shared.profile.error.title')}>
          {t('shared.profile.error.body')}
        </Banner>
      </div>
    )
  }

  const scopeKey = user.role === 'teacher'
    ? 'scopeTeacher' : user.role === 'school-admin' ? 'scopeSchoolAdmin' : 'scopeSuperAdmin'

  const handleSave = () => {
    const result = SharedService.updateProfile(user.id, { name, email, phone, avatar }, user)
    if (!result.ok) {
      setSaveErrors(result.error.split(','))
      return
    }
    setSaveErrors([])
    refreshProfile()
    toast({ variant: 'success', message: t('shared.profile.saved') })
  }

  const handlePassword = () => {
    const errors = validatePasswordChange({ current, next, confirm })
    if (errors.length > 0) {
      setPasswordErrors(errors)
      return
    }
    const result = SharedService.changePassword(user.id, { current, next, confirm }, user)
    if (!result.ok) {
      setPasswordErrors(result.error.split(','))
      return
    }
    setPasswordErrors([])
    setCurrent('')
    setNext('')
    setConfirm('')
    toast({ variant: 'success', message: t('shared.profile.password.changed') })
  }

  const breadcrumb = [
    { label: t('nav.dashboard'), to: user.role === 'super-admin' ? '/admin' : user.role === 'school-admin' ? '/school' : '/teacher' },
    { label: t('shared.profile.title') },
  ]

  return (
    <div className="shared">
      <PageHeader
        breadcrumb={breadcrumb}
        title={t('shared.profile.title')}
        lead={t('shared.profile.lead')}
      />

      {loading ? (
        <div className="shared__skeleton" aria-label={t('common.loading')} role="status">
          <Skeleton variant="rect" height={120} />
          <Skeleton variant="rect" height={220} />
          <Skeleton variant="rect" height={180} />
        </div>
      ) : loadFailed ? (
        <div>
          <Banner variant="error" title={t('shared.profile.error.title')}>
            {t('shared.profile.error.body')}
          </Banner>
          <div className="shared__retry">
            <Button variant="primary" onClick={retry}>{t('common.retry')}</Button>
          </div>
        </div>
      ) : (
        <div className="shared__grid">
          <Card title={t('shared.profile.cardTitle')}>
            <div className="shared__stack">
              <div className="shared-profile__head">
                <span
                  className="shared-profile__avatar-btn"
                  style={{ background: AVATAR_COLOURS[avatar]?.bg, color: AVATAR_COLOURS[avatar]?.fg, cursor: 'default' }}
                  aria-hidden="true"
                >
                  {avatarInitials(name || user.name)}
                </span>
                <div>
                  <div style={{ fontWeight: 600 }}><Bidi>{name || user.name}</Bidi></div>
                  <div className="shared__note"><Bidi>{email || user.email}</Bidi></div>
                </div>
              </div>

              {saveErrors.length > 0 && (
                <Banner variant="error" title={t('shared.profile.errors.nameRequired')}>
                  {saveErrors.map((e) => t(`shared.profile.errors.${PROFILE_ERROR_KEYS[e] ?? 'nameRequired'}`)).join(' ')}
                </Banner>
              )}

              <Input
                id="profile-name"
                label={t('shared.profile.name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                error={saveErrors.includes('name-required') ? t('shared.profile.errors.nameRequired') : null}
              />
              <Input
                id="profile-email"
                label={t('shared.profile.email')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                error={saveErrors.includes('email-invalid') ? t('shared.profile.errors.emailInvalid') : null}
              />
              <Input
                id="profile-phone"
                label={t('shared.profile.phone')}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                helper={t('shared.profile.phoneHelper')}
                error={saveErrors.includes('phone-invalid') ? t('shared.profile.errors.phoneInvalid') : null}
              />

              <div>
                <h3 className="shared__section-title">{t('shared.profile.avatar.title')}</h3>
                <p className="shared__note">{t('shared.profile.avatar.note')}</p>
                <div className="shared-profile__avatar-pick" role="group" aria-label={t('shared.profile.avatar.title')}>
                  {AVATAR_CHOICES.map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      className="shared-profile__avatar-btn"
                      aria-pressed={avatar === choice}
                      aria-label={t(`shared.profile.avatar.${choice}`)}
                      title={t(`shared.profile.avatar.${choice}`)}
                      style={{ background: AVATAR_COLOURS[choice].bg, color: AVATAR_COLOURS[choice].fg }}
                      onClick={() => setAvatar(choice)}
                    >
                      {avatarInitials(name || user.name)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Button variant="primary" onClick={handleSave}>{t('shared.profile.save')}</Button>
              </div>
            </div>
          </Card>

          <div className="shared__stack">
            <Card title={t('shared.profile.scopeTitle')}>
              <div className="shared__stack">
                <p className="shared__note">{t(`shared.profile.${scopeKey}`)}</p>
                <dl className="shared-profile__rows">
                  <div><dt>{t('shared.profile.role')}</dt><dd>{t(roleLabelKey(user.role))}</dd></div>
                  <div><dt>{t('shared.profile.school')}</dt><dd><Bidi>{school?.name ?? t('shared.profile.noSchool')}</Bidi></dd></div>
                </dl>

                {user.role === 'teacher' && (
                  <>
                    <div>
                      <h3 className="shared__section-title">{t('shared.profile.subjectsTitle')}</h3>
                      {subjects.length === 0 ? (
                        <EmptyState title={t('shared.profile.subjectsEmpty')} body="" />
                      ) : (
                        <div className="shared-profile__chips">
                          {subjects.map((s) => (
                            <span key={s} className="shared-profile__chip"><Bidi>{subjectName(s, lang)}</Bidi></span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="shared__section-title">{t('shared.profile.classesTitle')}</h3>
                      {classes.length === 0 ? (
                        <EmptyState title={t('shared.profile.classesEmpty')} body="" />
                      ) : (
                        <div className="shared-profile__chips">
                          {classes.map((c) => (
                            <span key={c} className="shared-profile__chip"><Bidi>{className(c)}</Bidi></span>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </Card>

            <Card title={t('shared.profile.password.title')}>
              <div className="shared__stack">
                {passwordErrors.length > 0 && (
                  <Banner variant="error" title={t('shared.profile.password.errors.tooShort')}>
                    {passwordErrors.map((e) => t(`shared.profile.password.errors.${PASSWORD_ERROR_KEYS[e] ?? 'tooShort'}`)).join(' ')}
                  </Banner>
                )}
                <Input
                  label={t('shared.profile.password.current')}
                  type="password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  autoComplete="current-password"
                  error={passwordErrors.includes('current-required') ? t('shared.profile.password.errors.currentRequired') : null}
                />
                <Input
                  label={t('shared.profile.password.next')}
                  type="password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  autoComplete="new-password"
                  error={passwordErrors.includes('password-too-short') ? t('shared.profile.password.errors.tooShort') : null}
                />
                <Input
                  label={t('shared.profile.password.confirm')}
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  error={passwordErrors.includes('password-mismatch') ? t('shared.profile.password.errors.mismatch') : null}
                />
                <div>
                  <Button variant="secondary" onClick={handlePassword}>{t('shared.profile.password.change')}</Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfilePage
