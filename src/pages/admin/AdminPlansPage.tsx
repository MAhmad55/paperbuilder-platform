import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, X } from 'lucide-react'
import { PageHeader } from '../../shell/PageHeader'
import {
  Banner,
  Button,
  Card,
  Checkbox,
  Dialog,
  EmptyState,
  Input,
  Skeleton,
  useToast,
} from '../../design-system'
import { AuthService, PlatformService, SchoolService, SUPER_ADMINS } from '../../services/mock-store'
import { validatePlanLimits, type PlanLimitPatch } from '../../services/plan-limits'
import type { Plan, PlanId } from '../../mock/data'
import { Bidi } from '../../utils/bidi'
import '../../styles/admin-plans.css'

type FieldKey = 'maxTeachers' | 'maxPapersPerMonth' | 'maxTemplates'
const FIELD_KEYS: FieldKey[] = ['maxTeachers', 'maxPapersPerMonth', 'maxTemplates']

interface FieldState {
  text: string
  unlimited: boolean
}

function fieldsFromPlan(plan: Plan): Record<FieldKey, FieldState> {
  const out = {} as Record<FieldKey, FieldState>
  for (const key of FIELD_KEYS) {
    const value = plan[key]
    out[key] = value === 'unlimited' ? { text: '', unlimited: true } : { text: String(value), unlimited: false }
  }
  return out
}

function patchFromFields(fields: Record<FieldKey, FieldState>): PlanLimitPatch {
  const patch: PlanLimitPatch = {}
  for (const key of FIELD_KEYS) {
    const field = fields[key]
    patch[key] = field.unlimited ? 'unlimited' : field.text.trim() === '' ? NaN : Number(field.text)
  }
  return patch
}

/** Plans & limits — Phase 3 B5. One card per plan, edit limits in a dialog. */
export function AdminPlansPage() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const [params] = useSearchParams()
  const demo = params.get('demo')
  const lang = i18n.language === 'ur' ? 'ur' : 'en'

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [plans, setPlans] = useState<Plan[]>([])
  const [attempt, setAttempt] = useState(0)

  const [editing, setEditing] = useState<Plan | null>(null)
  const [fields, setFields] = useState<Record<FieldKey, FieldState> | null>(null)
  const [step, setStep] = useState<'edit' | 'confirm'>('edit')
  const [saveAttempted, setSaveAttempted] = useState(false)
  const [saving, setSaving] = useState(false)

  /* Simulated fetch so the loading state is real (mock data is synchronous). */
  useEffect(() => {
    setLoading(true)
    setLoadError(false)
    if (demo === 'loading') return
    const handle = window.setTimeout(() => {
      if (demo === 'error' && attempt === 0) {
        setLoadError(true)
      } else if (demo === 'empty') {
        setPlans([])
      } else {
        setPlans(PlatformService.listPlans())
      }
      setLoading(false)
    }, 350)
    return () => window.clearTimeout(handle)
  }, [demo, attempt])

  const schools = useMemo(() => SchoolService.list(), [])
  const schoolsOnPlan = (planId: PlanId) => schools.filter((s) => s.plan === planId).length

  const planName = (plan: Plan) => (lang === 'ur' ? plan.nameUr : plan.name)
  const displayValue = (value: number | 'unlimited') =>
    value === 'unlimited' ? t('admin.plans.unlimited') : String(value)

  const patch: PlanLimitPatch = editing && fields ? patchFromFields(fields) : {}
  const errors: string[] = editing && fields ? validatePlanLimits(editing, patch) : []
  const changedKeys: FieldKey[] =
    editing && fields ? FIELD_KEYS.filter((key) => patch[key] !== editing[key]) : []

  const openEdit = (plan: Plan) => {
    setEditing(plan)
    setFields(fieldsFromPlan(plan))
    setStep('edit')
    setSaveAttempted(false)
  }

  const closeDialog = () => {
    setEditing(null)
    setFields(null)
    setSaving(false)
  }

  const setField = (key: FieldKey, next: Partial<FieldState>) => {
    setFields((current) => (current ? { ...current, [key]: { ...current[key], ...next } } : current))
  }

  /** Edit step → confirm step, only when the patch is valid. */
  const reviewChange = () => {
    if (errors.length > 0) {
      setSaveAttempted(true)
      const firstField = FIELD_KEYS.find((key) => errors.includes(key))
      if (firstField) {
        window.setTimeout(() => document.getElementById(`plan-limit-${firstField}`)?.focus(), 50)
      }
      return
    }
    setStep('confirm')
  }

  const saveChange = () => {
    if (!editing) return
    setSaving(true)
    const actor = AuthService.currentUser() ?? SUPER_ADMINS[0]
    const result = PlatformService.updatePlanLimit(editing.id, patch, actor)
    setSaving(false)
    if (result.ok) {
      setPlans(PlatformService.listPlans())
      toast({ variant: 'success', message: t('admin.plans.toast.saved', { plan: planName(editing) }) })
      closeDialog()
      return
    }
    const message = result.error
      .split(',')
      .map((key) => t(`admin.plans.errors.${key}`, { defaultValue: key }))
      .join(' ')
    toast({ variant: 'error', message: message || t('admin.plans.toast.saveFailed') })
  }

  return (
    <div className="admin-plans">
      <PageHeader
        breadcrumb={[{ label: t('nav.dashboard'), to: '/admin' }]}
        title={t('admin.plans.title')}
        lead={t('admin.plans.lead')}
      />

      {loading ? (
        <div className="admin-plans__skeleton" aria-label={t('common.loading')} role="status">
          <Skeleton variant="rect" height={36} width="45%" />
          <Skeleton variant="rect" height={20} width="70%" />
          <div className="admin-plans__grid">
            <Skeleton variant="rect" height={260} />
            <Skeleton variant="rect" height={260} />
            <Skeleton variant="rect" height={260} />
          </div>
        </div>
      ) : loadError ? (
        <div className="admin-plans__error">
          <Banner variant="error" title={t('admin.plans.error.title')}>
            {t('admin.plans.error.body')}
          </Banner>
          <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
            {t('common.retry')}
          </Button>
        </div>
      ) : plans.length === 0 ? (
        <Card>
          <EmptyState title={t('admin.plans.empty.title')} body={t('admin.plans.empty.body')} />
        </Card>
      ) : (
        <div className="admin-plans__grid">
          {plans.map((plan) => (
            <Card key={plan.id} title={planName(plan)} className="admin-plans__card">
              <dl className="admin-plans__limits">
                {FIELD_KEYS.map((key) => (
                  <div key={key} className="admin-plans__limit">
                    <dt>{t(`admin.plans.limits.${key}`)}</dt>
                    <dd>
                      <Bidi>{displayValue(plan[key])}</Bidi>
                    </dd>
                  </div>
                ))}
              </dl>
              <ul className="admin-plans__features">
                <li>
                  {plan.customBranding ? (
                    <Check size={18} aria-hidden="true" className="admin-plans__feature-icon--yes" />
                  ) : (
                    <X size={18} aria-hidden="true" className="admin-plans__feature-icon--no" />
                  )}
                  <span>{t('admin.plans.features.customBranding')}</span>
                </li>
                <li>
                  {plan.prioritySupport ? (
                    <Check size={18} aria-hidden="true" className="admin-plans__feature-icon--yes" />
                  ) : (
                    <X size={18} aria-hidden="true" className="admin-plans__feature-icon--no" />
                  )}
                  <span>{t('admin.plans.features.prioritySupport')}</span>
                </li>
              </ul>
              <p className="admin-plans__schools">
                {t('admin.plans.schoolsOnPlan', { count: schoolsOnPlan(plan.id) })}
              </p>
              <Button variant="secondary" onClick={() => openEdit(plan)}>
                {t('admin.plans.editLimits')}
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={editing !== null}
        onClose={closeDialog}
        title={
          step === 'edit'
            ? t('admin.plans.dialog.title', { plan: editing ? planName(editing) : '' })
            : t('admin.plans.dialog.confirmTitle')
        }
        footer={
          step === 'edit' ? (
            <>
              <Button variant="ghost" onClick={closeDialog}>
                {t('admin.plans.dialog.cancel')}
              </Button>
              <Button variant="primary" onClick={reviewChange}>
                {t('admin.plans.dialog.review')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep('edit')}>
                {t('admin.plans.dialog.back')}
              </Button>
              <Button variant="primary" loading={saving} onClick={saveChange}>
                {t('admin.plans.dialog.confirm')}
              </Button>
            </>
          )
        }
      >
        {editing && fields && step === 'edit' && (
          <div className="admin-plans__form">
            {FIELD_KEYS.map((key) => {
              const fieldError = errors.includes(key) ? t(`admin.plans.errors.${key}`) : null
              return (
                <div key={key} className="admin-plans__field">
                  <Input
                    id={`plan-limit-${key}`}
                    type="number"
                    inputMode="numeric"
                    label={t(`admin.plans.limits.${key}`)}
                    value={fields[key].text}
                    disabled={fields[key].unlimited}
                    onChange={(e) => setField(key, { text: e.target.value })}
                    error={fieldError}
                  />
                  <Checkbox
                    id={`plan-unlimited-${key}`}
                    label={t('admin.plans.dialog.unlimited')}
                    checked={fields[key].unlimited}
                    onChange={(e) => setField(key, { unlimited: e.target.checked })}
                  />
                </div>
              )
            })}
            {saveAttempted && errors.includes('noChange') && (
              <p className="pb-error-text" role="alert">
                {t('admin.plans.errors.noChange')}
              </p>
            )}
          </div>
        )}
        {editing && fields && step === 'confirm' && (
          <div className="admin-plans__confirm">
            <p>{t('admin.plans.dialog.confirmLead')}</p>
            <dl className="admin-plans__summary">
              {changedKeys.map((key) => (
                <div key={key} className="admin-plans__summary-row">
                  <dt>{t(`admin.plans.limits.${key}`)}</dt>
                  <dd>
                    <span className="admin-plans__summary-old">
                      <span>{t('admin.plans.dialog.oldValue')}: </span>
                      <Bidi>{displayValue(editing[key])}</Bidi>
                    </span>
                    <span aria-hidden="true" className="flip-rtl" style={{ display: 'inline-block' }}> → </span>
                    <span className="admin-plans__summary-new">
                      <span>{t('admin.plans.dialog.newValue')}: </span>
                      <Bidi>{displayValue(patch[key] as number | 'unlimited')}</Bidi>
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </Dialog>
    </div>
  )
}

export default AdminPlansPage
