import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Banner,
  Button,
  Card,
  EmptyState,
  FileUpload,
  Input,
  SegmentedControl,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from '../../design-system'
import { PageHeader } from '../../shell/PageHeader'
import { DEFAULT_PLATFORM_SETTINGS, PlatformService } from '../../services/mock-store'
import type { PlatformSettings } from '../../services/mock-store'
import '../../styles/admin-settings.css'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type SettingsErrors = {
  platformName?: string
  supportEmail?: string
  supportPhone?: string
}

/** Platform settings — Phase 3 B10. Branding, default languages, legal text, support contacts. */
export function AdminSettingsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [params] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [loadCycle, setLoadCycle] = useState(0)
  const [errorDismissed, setErrorDismissed] = useState(false)
  const [emptyDismissed, setEmptyDismissed] = useState(false)

  const demo = params.get('demo')

  const [saved, setSaved] = useState<PlatformSettings | null>(null)
  const [form, setForm] = useState<PlatformSettings | null>(null)
  const [errors, setErrors] = useState<SettingsErrors>({})
  const [logoFiles, setLogoFiles] = useState<File[]>([])

  /* Simulated fetch so the loading state is real (mock data is synchronous). */
  useEffect(() => {
    if (demo === 'loading') return
    setLoading(true)
    const handle = window.setTimeout(() => {
      const settings = PlatformService.getSettings()
      setSaved(settings)
      setForm(settings)
      setLoading(false)
    }, 350)
    return () => window.clearTimeout(handle)
  }, [demo, loadCycle])

  const showEmpty = !loading && demo === 'empty' && !emptyDismissed
  const showError = !loading && demo === 'error' && !errorDismissed
  const isDirty = form !== null && saved !== null && JSON.stringify(form) !== JSON.stringify(saved)

  const setField = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current))
    if (key === 'platformName') setErrors((current) => ({ ...current, platformName: undefined }))
    else if (key === 'supportEmail') setErrors((current) => ({ ...current, supportEmail: undefined }))
    else if (key === 'supportPhone') setErrors((current) => ({ ...current, supportPhone: undefined }))
  }

  const loadDefaults = () => {
    const defaults = { ...DEFAULT_PLATFORM_SETTINGS }
    setSaved(defaults)
    setForm(defaults)
    setEmptyDismissed(true)
  }

  const retryLoad = () => {
    setErrorDismissed(true)
    setLoadCycle((c) => c + 1)
  }

  const resetForm = () => {
    if (!saved) return
    setForm({ ...saved })
    setErrors({})
    toast({ variant: 'info', message: t('admin.settings.resetDone') })
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!form) return
    const next: SettingsErrors = {}
    if (!form.platformName.trim()) next.platformName = t('admin.settings.errors.nameRequired')
    if (!EMAIL_PATTERN.test(form.supportEmail.trim())) next.supportEmail = t('admin.settings.errors.emailInvalid')
    if (!form.supportPhone.trim()) next.supportPhone = t('admin.settings.errors.phoneRequired')
    setErrors(next)
    if (next.platformName || next.supportEmail || next.supportPhone) {
      /* Move focus to the first invalid field, as the sign-in form does. */
      const firstId = next.platformName
        ? 'settings-platform-name'
        : next.supportEmail
          ? 'settings-support-email'
          : 'settings-support-phone'
      window.setTimeout(() => document.getElementById(firstId)?.focus(), 50)
      return
    }
    const updated = PlatformService.updateSettings({ ...form })
    setSaved(updated)
    setForm(updated)
    toast({ variant: 'success', message: t('admin.settings.saved') })
  }

  return (
    <div className="admin-settings">
      <PageHeader
        title={t('admin.settings.title')}
        lead={t('admin.settings.lead')}
      />

      {loading ? (
        <div className="admin-settings__skeleton" aria-label={t('common.loading')} role="status">
          <Skeleton variant="rect" height={36} width="55%" />
          <Skeleton variant="rect" height={180} />
          <Skeleton variant="rect" height={140} />
          <Skeleton variant="rect" height={220} />
        </div>
      ) : showError ? (
        <div className="admin-settings__error">
          <Banner variant="error" title={t('admin.settings.errorTitle')}>
            {t('admin.settings.errorBody')}
          </Banner>
          <Button variant="primary" size="lg" onClick={retryLoad}>
            {t('common.retry')}
          </Button>
        </div>
      ) : showEmpty || !form ? (
        <Card className="admin-settings__empty">
          <EmptyState
            title={t('admin.settings.emptyTitle')}
            body={t('admin.settings.emptyBody')}
          >
            <Button variant="primary" size="lg" onClick={loadDefaults}>
              {t('admin.settings.loadDefaults')}
            </Button>
          </EmptyState>
        </Card>
      ) : (
        <form className="admin-settings__form" onSubmit={onSubmit} noValidate>
          <Card className="admin-settings__card" title={t('admin.settings.brandingTitle')} subtitle={t('admin.settings.brandingSubtitle')}>
            <div className="admin-settings__fields">
              <Input
                id="settings-platform-name"
                label={t('admin.settings.platformName')}
                placeholder={t('admin.settings.platformNamePlaceholder')}
                value={form.platformName}
                onChange={(e) => setField('platformName', e.target.value)}
                required
                error={errors.platformName ?? null}
              />
              <div>
                <span className="admin-settings__label" id="settings-logo-label">
                  {t('admin.settings.logoTitle')}
                </span>
                <FileUpload
                  files={logoFiles}
                  onAdd={(files) => setLogoFiles(files.slice(0, 1))}
                  onRemove={(index) => setLogoFiles((current) => current.filter((_, i) => i !== index))}
                  accept="image/*"
                  multiple={false}
                  title={t('admin.settings.logoTitle')}
                  hint={t('admin.settings.logoHint')}
                />
                <p className="admin-settings__note">{t('admin.settings.logoMockNote')}</p>
              </div>
            </div>
          </Card>

          <Card className="admin-settings__card" title={t('admin.settings.languagesTitle')} subtitle={t('admin.settings.languagesSubtitle')}>
            <div className="admin-settings__fields">
              <div>
                <span className="admin-settings__label" id="settings-language-label">
                  {t('admin.settings.languageLabel')}
                </span>
                <SegmentedControl
                  ariaLabel={t('admin.settings.languageLabel')}
                  value={form.defaultLanguage}
                  onChange={(value) => setField('defaultLanguage', value as PlatformSettings['defaultLanguage'])}
                  options={[
                    { value: 'en', label: t('admin.settings.languageEnglish') },
                    { value: 'ur', label: t('admin.settings.languageUrdu') },
                  ]}
                />
              </div>
              <Select
                id="settings-print-language"
                label={t('admin.settings.printLanguageLabel')}
                value={form.defaultPrintLanguage}
                onChange={(e) => setField('defaultPrintLanguage', e.target.value as PlatformSettings['defaultPrintLanguage'])}
                options={[
                  { value: 'english', label: t('admin.settings.printEnglish') },
                  { value: 'urdu', label: t('admin.settings.printUrdu') },
                  { value: 'both', label: t('admin.settings.printBoth') },
                ]}
              />
            </div>
          </Card>

          <Card className="admin-settings__card" title={t('admin.settings.legalTitle')} subtitle={t('admin.settings.legalSubtitle')}>
            <div className="admin-settings__fields">
              <div className="admin-settings__legal-note">
                <Banner variant="info">{t('admin.settings.legalNote')}</Banner>
              </div>
              <div className="admin-settings__grid-2">
                <Textarea
                  id="settings-terms-en"
                  label={t('admin.settings.termsEn')}
                  dir="ltr"
                  rows={4}
                  value={form.legalTermsEn}
                  onChange={(e) => setField('legalTermsEn', e.target.value)}
                />
                <Textarea
                  id="settings-terms-ur"
                  label={t('admin.settings.termsUr')}
                  dir="rtl"
                  rows={4}
                  value={form.legalTermsUr}
                  onChange={(e) => setField('legalTermsUr', e.target.value)}
                />
              </div>
              <div className="admin-settings__grid-2">
                <Textarea
                  id="settings-privacy-en"
                  label={t('admin.settings.privacyEn')}
                  dir="ltr"
                  rows={4}
                  value={form.legalPrivacyEn}
                  onChange={(e) => setField('legalPrivacyEn', e.target.value)}
                />
                <Textarea
                  id="settings-privacy-ur"
                  label={t('admin.settings.privacyUr')}
                  dir="rtl"
                  rows={4}
                  value={form.legalPrivacyUr}
                  onChange={(e) => setField('legalPrivacyUr', e.target.value)}
                />
              </div>
            </div>
          </Card>

          <Card className="admin-settings__card" title={t('admin.settings.supportTitle')} subtitle={t('admin.settings.supportSubtitle')}>
            <div className="admin-settings__fields">
              <div className="admin-settings__grid-2">
                <Input
                  id="settings-support-email"
                  type="email"
                  label={t('admin.settings.supportEmail')}
                  dir="ltr"
                  value={form.supportEmail}
                  onChange={(e) => setField('supportEmail', e.target.value)}
                  required
                  autoComplete="email"
                  error={errors.supportEmail ?? null}
                />
                <Input
                  id="settings-support-phone"
                  type="tel"
                  label={t('admin.settings.supportPhone')}
                  dir="ltr"
                  value={form.supportPhone}
                  onChange={(e) => setField('supportPhone', e.target.value)}
                  required
                  autoComplete="tel"
                  error={errors.supportPhone ?? null}
                />
              </div>
            </div>
          </Card>

          <div className="admin-settings__actions">
            <Button type="submit" variant="primary" size="lg">
              {t('admin.settings.save')}
            </Button>
            <Button type="button" variant="secondary" size="lg" onClick={resetForm} disabled={!isDirty}>
              {t('admin.settings.reset')}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

export default AdminSettingsPage
