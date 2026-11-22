import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Paperclip, X } from 'lucide-react'
import { PublicLayout } from '../features/public/PublicLayout'
import {
  Banner, Button, Card, Checkbox, FileUpload, Input, Radio, Select, Stepper, Textarea,
} from '../design-system'
import { PLANS } from '../mock/data'
import type { PlanId } from '../mock/data'
import { ApprovalRequestService } from '../services/mock-store'
import { Bidi } from '../utils/bidi'
import {
  BOARDS, CONTACT_ROLES, DRAFT_STORAGE_KEY, EMPTY_REQUEST_FORM, FIELD_IDS, REQUEST_STEPS,
  SECTION_FIELDS, SCHOOL_TYPES, STUDENT_RANGES, firstErrorField, toDescriptor, validateFullForm,
  validateSection,
} from '../features/public/request-schemas'
import type {
  FieldErrors, FileDescriptor, RequestFieldKey, RequestFormData, RequestStepId,
} from '../features/public/request-schemas'
import '../styles/request.css'

const MIN_LEN: Partial<Record<RequestFieldKey, number>> = {
  schoolName: 3,
  city: 2,
  address: 8,
  contactName: 3,
}

function loadDraft(): { form: RequestFormData; resumed: boolean } {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!raw) return { form: EMPTY_REQUEST_FORM, resumed: false }
    const parsed = JSON.parse(raw) as Partial<RequestFormData>
    const form: RequestFormData = {
      ...EMPTY_REQUEST_FORM,
      ...parsed,
      certificate: Array.isArray(parsed.certificate) ? parsed.certificate : [],
      additional: Array.isArray(parsed.additional) ? parsed.additional : [],
      consent: false,
    }
    return { form, resumed: true }
  } catch {
    return { form: EMPTY_REQUEST_FORM, resumed: false }
  }
}

const isDescriptorOf = (a: FileDescriptor) => (b: FileDescriptor) => a.name === b.name && a.size === b.size

/** Request school access — Phase 2 B3. Multi-section form with draft autosave. */
export function RequestAccessPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [draft] = useState(loadDraft)
  const [form, setForm] = useState<RequestFormData>(draft.form)
  const [step, setStep] = useState<RequestStepId>('school')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [showErrorBanner, setShowErrorBanner] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [resumed, setResumed] = useState(draft.resumed)
  const [submitting, setSubmitting] = useState(false)
  const [certNew, setCertNew] = useState<File[]>([])
  const [addNew, setAddNew] = useState<File[]>([])
  const firstRender = useRef(true)
  const stepHeadingRef = useRef<HTMLHeadingElement>(null)
  const isUrdu = i18n.language === 'ur'
  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as 'ur' | 'en'

  const stepIndex = REQUEST_STEPS.indexOf(step)

  /* ---- Draft autosave (debounced) with a visible "Saved" indicator ---- */
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const handle = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(form))
        /* Only announce a save once the user has actually entered something. */
        if (JSON.stringify(form) !== JSON.stringify(EMPTY_REQUEST_FORM)) {
          const now = new Date()
          setSavedAt(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
        }
      } catch {
        /* storage unavailable — the form still works in memory */
      }
    }, 400)
    return () => window.clearTimeout(handle)
  }, [form])

  const setField = <K extends keyof RequestFormData>(key: K, value: RequestFormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => {
      if (!(key in e)) return e
      const next = { ...e }
      delete next[key as RequestFieldKey]
      return next
    })
  }

  const errText = (code?: string, field?: RequestFieldKey): string | null => {
    if (!code) return null
    if (code === 'tooShort') return t('request.errors.tooShort', { min: MIN_LEN[field ?? 'schoolName'] ?? 3 })
    return t(`request.errors.${code}`)
  }

  const focusField = (key: RequestFieldKey) => {
    window.setTimeout(() => {
      const el = document.getElementById(FIELD_IDS[key])
      el?.scrollIntoView({ block: 'center' })
      el?.focus()
    }, 50)
  }

  const goToStep = (next: RequestStepId) => {
    setStep(next)
    setErrors({})
    setShowErrorBanner(false)
    window.scrollTo({ top: 0 })
    /* Keyboard: move focus to the new step heading so the step is announced. */
    window.setTimeout(() => stepHeadingRef.current?.focus(), 50)
  }

  const handleContinue = () => {
    const check = validateSection(step, form)
    if (!check.ok) {
      setErrors(check.errors)
      setShowErrorBanner(true)
      const first = firstErrorField(step, check.errors)
      if (first) focusField(first)
      return
    }
    setErrors({})
    setShowErrorBanner(false)
    if (step === 'review') {
      handleSubmit()
      return
    }
    goToStep(REQUEST_STEPS[stepIndex + 1])
  }

  const handleSubmit = () => {
    const check = validateFullForm(form)
    if (!check.ok) {
      setErrors(check.errors)
      setShowErrorBanner(true)
      const badStep = REQUEST_STEPS.find((s) => SECTION_FIELDS[s].some((f) => check.errors[f]))
      if (badStep) {
        setStep(badStep)
        const first = firstErrorField(badStep, check.errors)
        if (first) focusField(first)
      }
      return
    }
    setSubmitting(true)
    const input = {
      schoolName: form.schoolName.trim(),
      city: form.city.trim(),
      planId: form.planId as PlanId,
      contactName: form.contactName.trim(),
      contactRole: form.contactRole,
      contactPhone: form.contactPhone.trim(),
      contactEmail: form.contactEmail.trim(),
      address: form.address.trim(),
      board: form.board,
      studentsRange: form.studentsRange,
      schoolType: form.schoolType,
      notes: form.notes.trim(),
      documentNames: [...form.certificate, ...form.additional].map((d) => d.name),
    }
    let ref: string
    let wasResubmit = false
    if (form.resubmitRef && ApprovalRequestService.get(form.resubmitRef)) {
      const updated = ApprovalRequestService.resubmit(form.resubmitRef, input)
      ref = updated?.id ?? form.resubmitRef
      wasResubmit = true
    } else {
      ref = ApprovalRequestService.create(input).id
    }
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
    } catch {
      /* ignore */
    }
    navigate(`/request-status?id=${encodeURIComponent(ref)}`, { state: { resubmitted: wasResubmit } })
  }

  /* ---- Documents: new picks (File objects) + draft-restored descriptors ---- */
  const storedCert = useMemo(
    () => form.certificate.filter((d) => !certNew.some(isDescriptorOf(d))),
    [form.certificate, certNew],
  )
  const storedAdd = useMemo(
    () => form.additional.filter((d) => !addNew.some(isDescriptorOf(d))),
    [form.additional, addNew],
  )

  const addFiles = (kind: 'certificate' | 'additional', files: File[]) => {
    const file = files[0]
    if (!file) return
    const desc = toDescriptor(file)
    if (kind === 'certificate') {
      setCertNew([file])
      setForm((f) => ({ ...f, certificate: [desc] }))
    } else {
      setAddNew([file])
      setForm((f) => ({ ...f, additional: [desc] }))
    }
    setErrors((e) => {
      if (!(kind in e)) return e
      const next = { ...e }
      delete next[kind]
      return next
    })
  }

  const removeFiles = (kind: 'certificate' | 'additional') => {
    if (kind === 'certificate') {
      setCertNew([])
      setForm((f) => ({ ...f, certificate: [] }))
    } else {
      setAddNew([])
      setForm((f) => ({ ...f, additional: [] }))
    }
  }

  const removeStored = (kind: 'certificate' | 'additional', desc: FileDescriptor) => {
    setForm((f) => ({ ...f, [kind]: f[kind].filter((d) => !isDescriptorOf(desc)(d)) }))
  }

  /* ---- Stepper ---- */
  const planName = (id: string) => {
    const plan = PLANS.find((p) => p.id === id)
    if (!plan) return ''
    return isUrdu ? plan.nameUr : plan.name
  }

  const stepperSteps = REQUEST_STEPS.map((id, i) => {
    const done = i < stepIndex && validateSection(id, form).ok
    return {
      id,
      title: t(`request.steps.${id}`),
      summary:
        id === 'school' ? form.schoolName || undefined
        : id === 'contact' ? form.contactName || undefined
        : id === 'documents' ? form.certificate[0]?.name
        : id === 'plan' ? planName(form.planId) || undefined
        : undefined,
      state: (id === step ? 'current' : done ? 'done' : 'pending') as 'done' | 'current' | 'pending',
    }
  })

  const boardLabel = (v: string) => (v ? t(`request.school.boardOptions.${v}`) : '—')
  const studentsLabel = (v: string) => (v ? t(`request.school.studentsOptions.${v}`) : '—')
  const typeLabel = (v: string) => (v ? t(`request.school.typeOptions.${v}`) : '—')
  const roleLabel = (v: string) => (v ? t(`request.contact.roleOptions.${v}`) : '—')

  const summarySections: { id: RequestStepId; rows: [string, string][] }[] = [
    {
      id: 'school',
      rows: [
        [t('request.school.name'), form.schoolName],
        [t('request.school.city'), form.city],
        [t('request.school.address'), form.address],
        [t('request.school.board'), boardLabel(form.board)],
        [t('request.school.students'), studentsLabel(form.studentsRange)],
        [t('request.school.type'), typeLabel(form.schoolType)],
      ],
    },
    {
      id: 'contact',
      rows: [
        [t('request.contact.name'), form.contactName],
        [t('request.contact.role'), roleLabel(form.contactRole)],
        [t('request.contact.phone'), form.contactPhone],
        [t('request.contact.email'), form.contactEmail],
      ],
    },
    {
      id: 'documents',
      rows: [
        [t('request.documents.certificate'), form.certificate.map((d) => d.name).join(', ') || '—'],
        [t('request.documents.additional'), form.additional.map((d) => d.name).join(', ') || '—'],
      ],
    },
    {
      id: 'plan',
      rows: [
        [t('request.steps.plan'), planName(form.planId)],
        [t('request.plan.notes'), form.notes || '—'],
      ],
    },
  ]

  return (
    <PublicLayout>
      <div className="req-page">
        <div className="req-page__header">
          <h1>{t('request.title')}</h1>
          <p className="req-page__subtitle">{t('request.subtitle')}</p>
        </div>

        {resumed && (
          <div style={{ marginBlockEnd: 16 }}>
            <Banner variant="info" onClose={() => setResumed(false)}>{t('request.resumeNote')}</Banner>
          </div>
        )}
        {form.resubmitRef && (
          <div style={{ marginBlockEnd: 16 }}>
            <Banner variant="info">
              <Bidi>{t('request.editingResubmit', { ref: form.resubmitRef })}</Bidi>
            </Banner>
          </div>
        )}
        {showErrorBanner && (
          <div style={{ marginBlockEnd: 16 }}>
            <Banner variant="error">{t('request.errors.fixErrors')}</Banner>
          </div>
        )}

        <div className="req-progress" aria-hidden="true">
          <div className="req-progress__label">
            {t('request.stepOf', { current: stepIndex + 1, total: REQUEST_STEPS.length })}
            {' — '}
            {t(`request.steps.${step}`)}
          </div>
          <div className="req-progress__bar">
            <span className="req-progress__fill" style={{ width: `${((stepIndex + 1) / REQUEST_STEPS.length) * 100}%` }} />
          </div>
        </div>

        <div className="req-layout">
          <aside className="req-layout__rail" aria-label={t('request.stepOf', { current: stepIndex + 1, total: REQUEST_STEPS.length })}>
            <Stepper steps={stepperSteps} onStepClick={(id) => goToStep(id as RequestStepId)} />
          </aside>

          <Card className="req-card">
            <h2 ref={stepHeadingRef} tabIndex={-1}>{t(`request.steps.${step}`)}</h2>

            {step === 'school' && (
              <div className="req-fields" style={{ marginBlockStart: 20 }}>
                <Input
                  id={FIELD_IDS.schoolName}
                  label={t('request.school.name')}
                  placeholder={t('request.school.namePlaceholder')}
                  value={form.schoolName}
                  onChange={(e) => setField('schoolName', e.target.value)}
                  error={errText(errors.schoolName, 'schoolName')}
                  required
                  autoComplete="organization"
                />
                <div className="req-grid-2">
                  <Input
                    id={FIELD_IDS.city}
                    label={t('request.school.city')}
                    placeholder={t('request.school.cityPlaceholder')}
                    value={form.city}
                    onChange={(e) => setField('city', e.target.value)}
                    error={errText(errors.city, 'city')}
                    required
                    autoComplete="address-level2"
                  />
                  <Select
                    id={FIELD_IDS.board}
                    label={t('request.school.board')}
                    value={form.board}
                    onChange={(e) => setField('board', e.target.value as RequestFormData['board'])}
                    error={errText(errors.board)}
                    required
                    options={[
                      { value: '', label: t('request.school.boardPlaceholder') },
                      ...BOARDS.map((b) => ({ value: b, label: t(`request.school.boardOptions.${b}`) })),
                    ]}
                  />
                </div>
                <Textarea
                  id={FIELD_IDS.address}
                  label={t('request.school.address')}
                  placeholder={t('request.school.addressPlaceholder')}
                  value={form.address}
                  onChange={(e) => setField('address', e.target.value)}
                  error={errText(errors.address, 'address')}
                  required
                  rows={3}
                />
                <div className="req-grid-2">
                  <Select
                    id={FIELD_IDS.studentsRange}
                    label={t('request.school.students')}
                    value={form.studentsRange}
                    onChange={(e) => setField('studentsRange', e.target.value as RequestFormData['studentsRange'])}
                    error={errText(errors.studentsRange)}
                    required
                    options={[
                      { value: '', label: t('request.school.studentsPlaceholder') },
                      ...STUDENT_RANGES.map((r) => ({ value: r, label: t(`request.school.studentsOptions.${r}`) })),
                    ]}
                  />
                  <Select
                    id={FIELD_IDS.schoolType}
                    label={t('request.school.type')}
                    value={form.schoolType}
                    onChange={(e) => setField('schoolType', e.target.value as RequestFormData['schoolType'])}
                    error={errText(errors.schoolType)}
                    required
                    options={[
                      { value: '', label: t('request.school.typePlaceholder') },
                      ...SCHOOL_TYPES.map((s) => ({ value: s, label: t(`request.school.typeOptions.${s}`) })),
                    ]}
                  />
                </div>
              </div>
            )}

            {step === 'contact' && (
              <div className="req-fields" style={{ marginBlockStart: 20 }}>
                <Input
                  id={FIELD_IDS.contactName}
                  label={t('request.contact.name')}
                  placeholder={t('request.contact.namePlaceholder')}
                  value={form.contactName}
                  onChange={(e) => setField('contactName', e.target.value)}
                  error={errText(errors.contactName, 'contactName')}
                  required
                  autoComplete="name"
                />
                <Select
                  id={FIELD_IDS.contactRole}
                  label={t('request.contact.role')}
                  value={form.contactRole}
                  onChange={(e) => setField('contactRole', e.target.value as RequestFormData['contactRole'])}
                  error={errText(errors.contactRole)}
                  required
                  options={[
                    { value: '', label: t('request.contact.rolePlaceholder') },
                    ...CONTACT_ROLES.map((r) => ({ value: r, label: t(`request.contact.roleOptions.${r}`) })),
                  ]}
                />
                <div className="req-grid-2">
                  <Input
                    id={FIELD_IDS.contactPhone}
                    label={t('request.contact.phone')}
                    placeholder={t('request.contact.phonePlaceholder')}
                    helper={t('request.contact.phoneHint')}
                    value={form.contactPhone}
                    onChange={(e) => setField('contactPhone', e.target.value)}
                    error={errText(errors.contactPhone)}
                    required
                    autoComplete="tel"
                    inputMode="tel"
                    dir="ltr"
                  />
                  <Input
                    id={FIELD_IDS.contactEmail}
                    label={t('request.contact.email')}
                    placeholder={t('request.contact.emailPlaceholder')}
                    value={form.contactEmail}
                    onChange={(e) => setField('contactEmail', e.target.value)}
                    error={errText(errors.contactEmail)}
                    required
                    autoComplete="email"
                    inputMode="email"
                    dir="ltr"
                  />
                </div>
              </div>
            )}

            {step === 'documents' && (
              <div className="req-fields" style={{ marginBlockStart: 20 }}>
                <div id={FIELD_IDS.certificate} tabIndex={-1}>
                  <p className="pb-label" style={{ margin: '0 0 6px' }}>
                    {t('request.documents.certificate')}
                    <span aria-hidden="true" style={{ color: 'var(--pen-600)' }}> *</span>
                    <span className="pb-muted" style={{ fontWeight: 400 }}> — {t('request.documents.certificateRequired')}</span>
                  </p>
                  <FileUpload
                    files={certNew}
                    onAdd={(files) => addFiles('certificate', files)}
                    onRemove={() => removeFiles('certificate')}
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple={false}
                    title={t('request.documents.uploadTitle')}
                    hint={t('request.documents.certificateHint')}
                    error={errText(errors.certificate)}
                  />
                  {storedCert.length > 0 && (
                    <>
                      <p className="pb-helper" style={{ marginTop: 8 }}>{t('request.documents.reattachNote')}</p>
                      <ul className="req-stored-files">
                        {storedCert.map((d) => (
                          <li key={`${d.name}-${d.size}`} className="req-stored-files__item">
                            <Paperclip size={15} aria-hidden="true" />
                            <span className="req-stored-files__name"><Bidi>{d.name}</Bidi></span>
                            <span className="req-stored-files__tag">{t('request.documents.storedFile')}</span>
                            <button
                              type="button"
                              className="pb-icon-btn pb-icon-btn--sm"
                              aria-label={`${t('common.removeFile')} — ${d.name}`}
                              onClick={() => removeStored('certificate', d)}
                            >
                              <X size={15} aria-hidden="true" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
                <div id={FIELD_IDS.additional} tabIndex={-1}>
                  <p className="pb-label" style={{ margin: '0 0 6px' }}>{t('request.documents.additional')}</p>
                  <FileUpload
                    files={addNew}
                    onAdd={(files) => addFiles('additional', files)}
                    onRemove={() => removeFiles('additional')}
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple={false}
                    title={t('request.documents.uploadTitle')}
                    hint={t('request.documents.additionalHint')}
                    error={errText(errors.additional)}
                  />
                  {storedAdd.length > 0 && (
                    <ul className="req-stored-files">
                      {storedAdd.map((d) => (
                        <li key={`${d.name}-${d.size}`} className="req-stored-files__item">
                          <Paperclip size={15} aria-hidden="true" />
                          <span className="req-stored-files__name"><Bidi>{d.name}</Bidi></span>
                          <span className="req-stored-files__tag">{t('request.documents.storedFile')}</span>
                          <button
                            type="button"
                            className="pb-icon-btn pb-icon-btn--sm"
                            aria-label={`${t('common.removeFile')} — ${d.name}`}
                            onClick={() => removeStored('additional', d)}
                          >
                            <X size={15} aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {step === 'plan' && (
              <div className="req-fields" style={{ marginBlockStart: 20 }}>
                <div role="radiogroup" aria-label={t('request.plan.choose')} aria-describedby={errors.planId ? 'req-plan-error' : undefined}>
                  <p className="pb-label" style={{ margin: '0 0 6px' }}>
                    {t('request.plan.choose')}
                    <span aria-hidden="true" style={{ color: 'var(--pen-600)' }}> *</span>
                  </p>
                  <p className="pb-helper" style={{ margin: '0 0 12px' }}>{t('request.plan.chooseHint')}</p>
                  <div className="req-plans">
                    {PLANS.map((plan, i) => (
                      <div
                        key={plan.id}
                        className={['req-plan', form.planId === plan.id && 'req-plan--selected'].filter(Boolean).join(' ')}
                        onClick={() => setField('planId', plan.id as RequestFormData['planId'])}
                      >
                        <Radio
                          id={i === 0 ? FIELD_IDS.planId : `req-plan-${plan.id}`}
                          name="planId"
                          checked={form.planId === plan.id}
                          onChange={() => setField('planId', plan.id as RequestFormData['planId'])}
                          aria-invalid={errors.planId ? true : undefined}
                          label={(
                            <span className="req-plan__body">
                              <span className="req-plan__name">{lang === 'ur' ? plan.nameUr : plan.name}</span>
                              <span className="req-plan__desc" style={{ display: 'block' }}>
                                {t(`request.plan.desc.${plan.id}`)}
                              </span>
                            </span>
                          )}
                        />
                      </div>
                    ))}
                  </div>
                  {errors.planId && (
                    <p className="pb-error-text" id="req-plan-error" role="alert" style={{ marginTop: 8 }}>
                      {errText(errors.planId)}
                    </p>
                  )}
                </div>
                <Textarea
                  id={FIELD_IDS.notes}
                  label={t('request.plan.notes')}
                  placeholder={t('request.plan.notesPlaceholder')}
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  rows={3}
                  maxLength={500}
                />
              </div>
            )}

            {step === 'review' && (
              <div style={{ marginBlockStart: 20 }}>
                <p className="req-card__intro">{t('request.review.intro')}</p>
                <div className="req-summary">
                  {summarySections.map((section) => (
                    <section key={section.id} className="req-summary__section" aria-label={t(`request.steps.${section.id}`)}>
                      <div className="req-summary__head">
                        <h3>{t(`request.steps.${section.id}`)}</h3>
                        <Button variant="ghost" size="md" onClick={() => goToStep(section.id)}>
                          {t('request.actions.edit')}
                        </Button>
                      </div>
                      <dl className="req-summary__rows">
                        {section.rows.map(([label, value]) => (
                          <div key={label} style={{ display: 'contents' }}>
                            <dt>{label}</dt>
                            <dd><Bidi>{value || '—'}</Bidi></dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  ))}
                </div>
                <div className="req-consent" id={FIELD_IDS.consent} tabIndex={-1}>
                  <Checkbox
                    checked={form.consent}
                    onChange={(e) => setField('consent', e.target.checked)}
                    label={t('request.review.consent')}
                  />
                  {errors.consent && (
                    <p className="pb-error-text req-consent__error" role="alert">{errText(errors.consent)}</p>
                  )}
                </div>
              </div>
            )}

            <div className="req-actions">
              {stepIndex > 0 && (
                <Button variant="secondary" onClick={() => goToStep(REQUEST_STEPS[stepIndex - 1])}>
                  {t('request.actions.back')}
                </Button>
              )}
              <span className="req-actions__spacer" />
              {savedAt && (
                <span className="req-saved" role="status">
                  <span className="req-saved__dot" aria-hidden="true" />
                  {t('request.savedAt', { time: savedAt })}
                </span>
              )}
              <Button variant="primary" size="lg" loading={submitting} onClick={handleContinue}>
                {step === 'review' ? t('request.review.submit') : t('request.actions.continue')}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </PublicLayout>
  )
}

export default RequestAccessPage
