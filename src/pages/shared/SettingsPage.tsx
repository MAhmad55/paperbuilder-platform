import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../shell/PageHeader'
import { Banner, Button, Card, EmptyState, SegmentedControl, Skeleton, Switch, useToast } from '../../design-system'
import { SharedService } from '../../services/mock-store'
import { applyFontSize, DEFAULT_USER_SETTINGS, type FontSize, type PrintLanguage, type UserSettings } from '../../services/shared'
import { setLanguage, type AppLanguage } from '../../i18n'
import { demoModeOf, useSchoolDemo, useSharedUser } from './shared'

/** Settings (blueprint 4.5.2) — language, print language, text size,
    notification preferences. Every change persists in the mock store at
    once and takes effect immediately (language flips the whole app). */
export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const [params] = useSearchParams()
  const demoMode = demoModeOf(params.get('demo'))
  const { loading, loadFailed, retry } = useSchoolDemo(demoMode)
  const forceEmpty = demoMode === 'empty'

  const user = useSharedUser()
  const [settings, setSettings] = useState<UserSettings>(() =>
    user ? SharedService.getUserSettings(user.id) : DEFAULT_USER_SETTINGS,
  )
  const [savedAt, setSavedAt] = useState<string | null>(null)

  if (!user) {
    return (
      <div className="shared">
        <Banner variant="error" title={t('shared.settings.error.title')}>
          {t('shared.settings.error.body')}
        </Banner>
      </div>
    )
  }

  const persist = (patch: Partial<UserSettings>) => {
    const next = SharedService.updateUserSettings(user.id, patch)
    setSettings(next)
    setSavedAt(new Date().toLocaleTimeString())
    return next
  }

  const changeLanguage = (value: string) => {
    const lang = (value === 'ur' ? 'ur' : 'en') as AppLanguage
    persist({ language: lang })
    setLanguage(lang)
  }

  const changePrintLanguage = (value: string) => {
    persist({ defaultPrintLanguage: value as PrintLanguage })
  }

  const changeFontSize = (value: string) => {
    const size = (value === 'large' ? 'large' : 'standard') as FontSize
    persist({ fontSize: size })
    applyFontSize(size)
  }

  const changeNotif = (key: keyof UserSettings['notifications'], value: boolean) => {
    persist({ notifications: { ...settings.notifications, [key]: value } })
  }

  const resetAll = () => {
    const next = SharedService.updateUserSettings(user.id, {
      ...DEFAULT_USER_SETTINGS,
      notifications: { ...DEFAULT_USER_SETTINGS.notifications },
    })
    setSettings(next)
    applyFontSize(next.fontSize)
    setLanguage(next.language)
    setSavedAt(new Date().toLocaleTimeString())
    toast({ variant: 'success', message: t('shared.settings.resetDone') })
  }

  const restoreDefaults = () => {
    const next = SharedService.updateUserSettings(user.id, {
      ...DEFAULT_USER_SETTINGS,
      notifications: { ...DEFAULT_USER_SETTINGS.notifications },
    })
    setSettings(next)
    applyFontSize(next.fontSize)
    setLanguage(next.language)
  }

  const breadcrumb = [
    { label: t('nav.dashboard'), to: user.role === 'super-admin' ? '/admin' : user.role === 'school-admin' ? '/school' : '/teacher' },
    { label: t('shared.settings.title') },
  ]

  return (
    <div className="shared">
      <PageHeader
        breadcrumb={breadcrumb}
        title={t('shared.settings.title')}
        lead={t('shared.settings.lead')}
        action={savedAt ? <span className="shared__note" role="status">{t('shared.settings.saved')} · {savedAt}</span> : undefined}
      />

      {loading ? (
        <div className="shared__skeleton" aria-label={t('common.loading')} role="status">
          <Skeleton variant="rect" height={120} />
          <Skeleton variant="rect" height={180} />
          <Skeleton variant="rect" height={160} />
        </div>
      ) : loadFailed ? (
        <div>
          <Banner variant="error" title={t('shared.settings.error.title')}>
            {t('shared.settings.error.body')}
          </Banner>
          <div className="shared__retry">
            <Button variant="primary" onClick={retry}>{t('common.retry')}</Button>
          </div>
        </div>
      ) : forceEmpty ? (
        <Card>
          <EmptyState
            title={t('shared.settings.empty.title')}
            body={t('shared.settings.empty.body')}
          >
            <Button variant="primary" onClick={restoreDefaults}>
              {t('shared.settings.empty.restore')}
            </Button>
          </EmptyState>
        </Card>
      ) : (
        <div className="shared__grid">
          <div className="shared__stack">
            <Card title={t('shared.settings.language.title')}>
              <div className="shared__stack">
                <SegmentedControl
                  ariaLabel={t('shared.settings.language.label')}
                  value={i18n.language === 'ur' ? 'ur' : 'en'}
                  onChange={changeLanguage}
                  options={[
                    { value: 'en', label: t('shared.settings.language.english') },
                    { value: 'ur', label: t('shared.settings.language.urdu') },
                  ]}
                />
                <p className="shared__note">{t('shared.settings.language.note')}</p>
              </div>
            </Card>

            <Card title={t('shared.settings.print.title')}>
              <div className="shared__stack">
                <SegmentedControl
                  ariaLabel={t('shared.settings.print.label')}
                  value={settings.defaultPrintLanguage}
                  onChange={changePrintLanguage}
                  options={[
                    { value: 'en', label: t('shared.settings.print.english') },
                    { value: 'ur', label: t('shared.settings.print.urdu') },
                    { value: 'both', label: t('shared.settings.print.both') },
                  ]}
                />
                <p className="shared__note">{t('shared.settings.print.note')}</p>
              </div>
            </Card>

            <Card title={t('shared.settings.font.title')}>
              <div className="shared__stack">
                <SegmentedControl
                  ariaLabel={t('shared.settings.font.label')}
                  value={settings.fontSize}
                  onChange={changeFontSize}
                  options={[
                    { value: 'standard', label: t('shared.settings.font.standard') },
                    { value: 'large', label: t('shared.settings.font.large') },
                  ]}
                />
                <p className="shared__note">{t('shared.settings.font.note')}</p>
              </div>
            </Card>
          </div>

          <div className="shared__stack">
            <Card title={t('shared.settings.notifications.title')}>
              <div className="shared__stack">
                {(['approvals', 'comments', 'announcements', 'invitations'] as const).map((key) => (
                  <Switch
                    key={key}
                    checked={settings.notifications[key]}
                    onChange={(v) => changeNotif(key, v)}
                    label={t(`shared.settings.notifications.${key}`)}
                  />
                ))}
                <p className="shared__note">{t('shared.settings.notifications.note')}</p>
              </div>
            </Card>

            <Card>
              <Button variant="secondary" onClick={resetAll}>
                {t('shared.settings.reset')}
              </Button>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsPage
