import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../shell/PageHeader'
import {
  Banner, Button, FileUpload, Input, Radio, Select, Skeleton, Switch, useToast,
} from '../../design-system'
import { SchoolService } from '../../services/mock-store'
import type { SchoolSettings } from '../../mock/data'
import {
  demoActor, demoModeOf, demoSchool, useSchoolDemo,
} from './shared'
import '../../styles/school.css'

/** School settings — Phase 4. Name, logo, address, header layout, default
    language/medium, approval policy (gates the paper flow) and the
    roll-number block. Saving writes a toast and one audit event. */
export function SchoolSettingsPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const { toast } = useToast()
  const demoMode = demoModeOf(params.get('demo'))
  const { loading, loadFailed, retry } = useSchoolDemo(demoMode)
  const forceEmpty = demoMode === 'empty'

  const actor = demoActor()
  const school = demoSchool()
  const schoolId = school?.id ?? ''

  const saved = useMemo(
    () => (forceEmpty || !schoolId ? undefined : SchoolService.getSettings(schoolId)),
    [forceEmpty, schoolId],
  )

  const [name, setName] = useState<string | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [headerLayout, setHeaderLayout] = useState<SchoolSettings['headerLayout'] | null>(null)
  const [defaultLanguage, setDefaultLanguage] = useState<SchoolSettings['defaultLanguage'] | null>(null)
  const [defaultMedium, setDefaultMedium] = useState<SchoolSettings['defaultMedium'] | null>(null)
  const [approvalPolicy, setApprovalPolicy] = useState<SchoolSettings['approvalPolicy'] | null>(null)
  const [rollNumberBlock, setRollNumberBlock] = useState<boolean | null>(null)
  const [logoFiles, setLogoFiles] = useState<File[]>([])
  const [nameError, setNameError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [version, setVersion] = useState(0)

  /* Form state follows the saved settings; null means "not yet edited". */
  const current: SchoolSettings | undefined = useMemo(() => {
    if (!saved) return undefined
    return {
      name: name ?? saved.name,
      address: address ?? saved.address,
      headerLayout: headerLayout ?? saved.headerLayout,
      defaultLanguage: defaultLanguage ?? saved.defaultLanguage,
      defaultMedium: defaultMedium ?? saved.defaultMedium,
      approvalPolicy: approvalPolicy ?? saved.approvalPolicy,
      rollNumberBlock: rollNumberBlock ?? saved.rollNumberBlock,
      logoName: saved.logoName,
    }
  }, [saved, name, address, headerLayout, defaultLanguage, defaultMedium, approvalPolicy, rollNumberBlock, version])

  const save = () => {
    if (!current || saving) return
    if (!current.name.trim()) {
      setNameError(t('school.settings.form.nameRequired'))
      window.setTimeout(() => document.getElementById('school-settings-name')?.focus(), 50)
      return
    }
    setNameError(null)
    setSaving(true)
    window.setTimeout(() => {
      const result = SchoolService.updateSettings(schoolId, {
        ...current,
        logoName: logoFiles[0]?.name ?? current.logoName,
      }, actor)
      setSaving(false)
      if (!result.ok) {
        toast({ variant: 'error', message: t('school.settings.errorToast') })
        return
      }
      setVersion((v) => v + 1)
      toast({ variant: 'success', message: t('school.settings.form.savedToast') })
    }, 200)
  }

  return (
    <div className="school">
      <PageHeader title={t('school.settings.title')} lead={t('school.settings.lead')} />

      {loading ? (
        <div className="school__skeleton" aria-label={t('common.loading')} role="status">
          <Skeleton variant="rect" height={48} />
          <Skeleton variant="rect" height={120} />
          <Skeleton variant="rect" height={220} />
        </div>
      ) : loadFailed ? (
        <div>
          <Banner variant="error" title={t('school.settings.error.title')}>
            {t('school.settings.error.body')}
          </Banner>
          <div className="school__retry">
            <Button variant="primary" onClick={retry}>
              {t('common.retry')}
            </Button>
          </div>
        </div>
      ) : current ? (
        <form
          className="school-form"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
          noValidate
        >
          <Input
            id="school-settings-name"
            label={t('school.settings.form.name')}
            value={current.name}
            onChange={(e) => {
              setName(e.target.value)
              if (nameError) setNameError(null)
            }}
            required
            error={nameError}
          />
          <Input
            id="school-settings-address"
            label={t('school.settings.form.address')}
            placeholder={t('school.settings.form.addressPlaceholder')}
            value={current.address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <FileUpload
            files={logoFiles}
            onAdd={(files) => setLogoFiles(files)}
            onRemove={(index) => setLogoFiles(logoFiles.filter((_, i) => i !== index))}
            accept="image/png,image/jpeg"
            multiple={false}
            title={t('school.settings.form.logo')}
            hint={t('school.settings.form.logoHint')}
          />
          {current.logoName && logoFiles.length === 0 && (
            <p className="school-note">{current.logoName}</p>
          )}
          <Select
            id="school-settings-layout"
            label={t('school.settings.form.headerLayout')}
            value={current.headerLayout}
            onChange={(e) => setHeaderLayout(e.target.value as SchoolSettings['headerLayout'])}
            options={[
              { value: 'logo-left', label: t('school.settings.form.layoutLogoLeft') },
              { value: 'logo-center', label: t('school.settings.form.layoutLogoCenter') },
            ]}
          />
          <Select
            id="school-settings-language"
            label={t('school.settings.form.defaultLanguage')}
            value={current.defaultLanguage}
            onChange={(e) => setDefaultLanguage(e.target.value as SchoolSettings['defaultLanguage'])}
            options={[
              { value: 'en', label: t('school.settings.form.languageEnglish') },
              { value: 'ur', label: t('school.settings.form.languageUrdu') },
            ]}
          />
          <Select
            id="school-settings-medium"
            label={t('school.settings.form.defaultMedium')}
            value={current.defaultMedium}
            onChange={(e) => setDefaultMedium(e.target.value as SchoolSettings['defaultMedium'])}
            options={[
              { value: 'english', label: t('medium.english') },
              { value: 'urdu', label: t('medium.urdu') },
            ]}
          />
          <fieldset className="school-fieldset">
            <legend>{t('school.settings.form.approvalPolicy')}</legend>
            <div className="school-radios">
              <Radio
                name="school-approval-policy"
                value="required"
                checked={current.approvalPolicy === 'required'}
                onChange={() => setApprovalPolicy('required')}
                label={t('school.settings.form.policyRequired')}
              />
              <Radio
                name="school-approval-policy"
                value="optional"
                checked={current.approvalPolicy === 'optional'}
                onChange={() => setApprovalPolicy('optional')}
                label={t('school.settings.form.policyOptional')}
              />
            </div>
            <Banner variant="info">{t('school.settings.form.policyHint')}</Banner>
          </fieldset>
          <Switch
            checked={current.rollNumberBlock}
            onChange={setRollNumberBlock}
            label={t('school.settings.form.rollNumber')}
            description={t('school.settings.form.rollNumberHint')}
          />
          <div className="school-form__actions">
            <Button variant="primary" size="lg" loading={saving} type="submit">
              {t('school.settings.form.save')}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  )
}

export default SchoolSettingsPage
