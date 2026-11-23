import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Megaphone } from 'lucide-react'
import { PageHeader } from '../../shell/PageHeader'
import {
  Banner, Button, Card, DatePicker, Input, Radio, Select, Skeleton, Table, Textarea, useToast,
} from '../../design-system'
import type { TableColumn } from '../../design-system'
import { AuthService, PlatformService, PLANS, SchoolService, SUPER_ADMINS } from '../../services/mock-store'
import type { Announcement, AnnouncementTarget, PlanId } from '../../services/mock-store'
import { Bidi } from '../../utils/bidi'
import { formatDateTime } from '../../utils/date'
import type { AppLanguage } from '../../i18n'
import '../../styles/admin-announcements.css'

type ScheduleMode = 'now' | 'scheduled'

/** Scheduled time for a chosen date: 09:00 local. */
function scheduledIso(date: string): string {
  return `${date}T09:00:00`
}

/** Announcements — Phase 3 B8. Compose form with live preview, scheduled + sent lists. */
export function AdminAnnouncementsPage() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const [params, setParams] = useSearchParams()
  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage
  const demo = params.get('demo')

  const actor = AuthService.currentUser() ?? SUPER_ADMINS[0]

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [targetType, setTargetType] = useState<AnnouncementTarget>('all')
  const [targetPlanId, setTargetPlanId] = useState<PlanId | ''>('')
  const [targetSchoolId, setTargetSchoolId] = useState('')
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('now')
  const [date, setDate] = useState('')
  const [errors, setErrors] = useState<{
    title?: string
    body?: string
    target?: string
    date?: string
    form?: string
  }>({})
  const [submitBusy, setSubmitBusy] = useState(false)

  const formRef = useRef<HTMLDivElement>(null)
  const schools = useMemo(() => SchoolService.list(), [])

  /* Simulated fetch so the loading state is real (mock data is synchronous). */
  useEffect(() => {
    setLoading(true)
    setLoadError(false)
    if (demo === 'loading') return undefined
    const handle = window.setTimeout(() => {
      if (demo === 'error') {
        setLoadError(true)
      } else {
        setAnnouncements(demo === 'empty' ? [] : PlatformService.listAnnouncements())
      }
      setLoading(false)
    }, 350)
    return () => window.clearTimeout(handle)
  }, [demo, reloadKey])

  const scheduled = useMemo(
    () => announcements.filter((a) => a.status === 'scheduled'),
    [announcements],
  )
  const sent = useMemo(
    () => announcements.filter((a) => a.status === 'sent'),
    [announcements],
  )

  const retryLoad = () => {
    const next = new URLSearchParams(params)
    next.delete('demo')
    setParams(next, { replace: true })
    setReloadKey((k) => k + 1)
  }

  const scrollToCompose = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => document.getElementById('ann-title')?.focus(), 350)
  }

  const planName = (planId: PlanId): string => {
    const plan = PLANS.find((p) => p.id === planId)
    if (!plan) return planId
    return lang === 'ur' ? plan.nameUr : plan.name
  }

  const targetLabel = (a: Pick<Announcement, 'targetType' | 'targetPlanId' | 'targetSchoolId'>): string => {
    if (a.targetType === 'plan' && a.targetPlanId) {
      return t('admin.announcements.preview.toPlan', { plan: planName(a.targetPlanId) })
    }
    if (a.targetType === 'school' && a.targetSchoolId) {
      const school = schools.find((s) => s.id === a.targetSchoolId)
      return t('admin.announcements.preview.toSchool', { school: school?.name ?? a.targetSchoolId })
    }
    return t('admin.announcements.preview.toAll')
  }

  const previewTarget = targetLabel({
    targetType,
    targetPlanId: targetPlanId || undefined,
    targetSchoolId: targetSchoolId || undefined,
  })

  const previewDate =
    scheduleMode === 'scheduled' && date
      ? t('admin.announcements.preview.scheduledFor', {
          date: formatDateTime(scheduledIso(date), lang),
        })
      : t('admin.announcements.preview.sendNow')

  const resetForm = () => {
    setTitle('')
    setBody('')
    setTargetType('all')
    setTargetPlanId('')
    setTargetSchoolId('')
    setScheduleMode('now')
    setDate('')
    setErrors({})
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (submitBusy) return
    const next: typeof errors = {}
    if (!title.trim()) next.title = t('admin.announcements.errors.titleRequired')
    if (!body.trim()) next.body = t('admin.announcements.errors.bodyRequired')
    if (targetType === 'plan' && !targetPlanId) {
      next.target = t('admin.announcements.errors.planRequired')
    }
    if (targetType === 'school' && !targetSchoolId) {
      next.target = t('admin.announcements.errors.schoolRequired')
    }
    if (scheduleMode === 'scheduled') {
      if (!date) {
        next.date = t('admin.announcements.errors.dateRequired')
      } else if (new Date(scheduledIso(date)).getTime() <= Date.now()) {
        next.date = t('admin.announcements.errors.scheduleFuture')
      }
    }
    if (next.title || next.body || next.target || next.date) {
      setErrors(next)
      const firstId = next.title ? 'ann-title' : next.body ? 'ann-body' : next.target ? 'ann-target-select' : 'ann-date'
      window.setTimeout(() => document.getElementById(firstId)?.focus(), 50)
      return
    }
    setErrors({})
    setSubmitBusy(true)
    window.setTimeout(() => {
      const result = PlatformService.createAnnouncement(
        {
          title,
          body,
          targetType,
          targetPlanId: targetType === 'plan' ? (targetPlanId as PlanId) : undefined,
          targetSchoolId: targetType === 'school' ? targetSchoolId : undefined,
          scheduledAt: scheduleMode === 'scheduled' ? scheduledIso(date) : null,
        },
        actor,
      )
      setSubmitBusy(false)
      if (!result.ok) {
        setErrors({ form: t('admin.announcements.errors.submitFailed') })
        return
      }
      setAnnouncements(PlatformService.listAnnouncements())
      resetForm()
      toast({
        variant: 'success',
        message: t(
          result.value.status === 'scheduled'
            ? 'admin.announcements.toast.scheduled'
            : 'admin.announcements.toast.sent',
        ),
      })
    }, 200)
  }

  const listColumns: TableColumn<Announcement>[] = [
    {
      id: 'title',
      header: t('admin.announcements.table.title'),
      cell: (a) => <Bidi>{a.title}</Bidi>,
    },
    {
      id: 'target',
      header: t('admin.announcements.table.target'),
      cell: (a) => targetLabel(a),
    },
    {
      id: 'date',
      header: t('admin.announcements.table.date'),
      cell: (a) => (
        <Bidi>
          {formatDateTime(a.status === 'scheduled' ? (a.scheduledAt ?? a.createdAt) : (a.sentAt ?? a.createdAt), lang)}
        </Bidi>
      ),
    },
    {
      id: 'author',
      header: t('admin.announcements.table.author'),
      cell: (a) => <Bidi>{a.createdByName}</Bidi>,
    },
  ]

  return (
    <div className="admin-ann">
      <PageHeader
        title={t('admin.announcements.title')}
        lead={t('admin.announcements.lead')}
        action={
          <Button variant="primary" size="lg" leadingIcon={<Megaphone size={18} aria-hidden="true" />} onClick={scrollToCompose}>
            {t('admin.announcements.compose')}
          </Button>
        }
      />

      {loading ? (
        <div className="admin-ann__skeleton" role="status" aria-label={t('admin.announcements.loading')}>
          <Skeleton variant="rect" height={44} width="100%" />
          <Skeleton variant="rect" height={180} width="100%" />
          <Skeleton variant="rect" height={44} width="100%" />
          <Skeleton variant="rect" height={44} width="100%" />
          <Skeleton variant="rect" height={44} width="65%" />
        </div>
      ) : loadError ? (
        <Banner variant="error" title={t('admin.announcements.error.title')}>
          {t('admin.announcements.error.body')}
          <div className="admin-ann__banner-action">
            <Button variant="secondary" onClick={retryLoad}>
              {t('admin.announcements.error.retry')}
            </Button>
          </div>
        </Banner>
      ) : (
        <>
          <div className="admin-ann__compose" ref={formRef}>
            <Card className="admin-ann__form-card">
              <h2>{t('admin.announcements.composeTitle')}</h2>
              <form onSubmit={submit} noValidate>
                {errors.form && (
                  <div style={{ marginBlockEnd: 12 }}>
                    <Banner variant="error">{errors.form}</Banner>
                  </div>
                )}
                <div className="admin-ann__fields">
                  <Input
                    id="ann-title"
                    label={t('admin.announcements.form.title')}
                    placeholder={t('admin.announcements.form.titlePlaceholder')}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    error={errors.title ?? null}
                  />
                  <Textarea
                    id="ann-body"
                    label={t('admin.announcements.form.body')}
                    placeholder={t('admin.announcements.form.bodyPlaceholder')}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={5}
                    required
                    error={errors.body ?? null}
                  />

                  <fieldset className="admin-ann__fieldset">
                    <legend>{t('admin.announcements.form.target')}</legend>
                    <div className="admin-ann__radios">
                      <Radio
                        name="ann-target"
                        value="all"
                        checked={targetType === 'all'}
                        onChange={() => setTargetType('all')}
                        label={t('admin.announcements.form.targetAll')}
                      />
                      <Radio
                        name="ann-target"
                        value="plan"
                        checked={targetType === 'plan'}
                        onChange={() => setTargetType('plan')}
                        label={t('admin.announcements.form.targetPlan')}
                      />
                      <Radio
                        name="ann-target"
                        value="school"
                        checked={targetType === 'school'}
                        onChange={() => setTargetType('school')}
                        label={t('admin.announcements.form.targetSchool')}
                      />
                    </div>
                    {targetType === 'plan' && (
                      <Select
                        id="ann-target-select"
                        label={t('admin.announcements.form.plan')}
                        value={targetPlanId}
                        onChange={(e) => setTargetPlanId(e.target.value as PlanId | '')}
                        required
                        error={errors.target ?? null}
                        options={[
                          { value: '', label: t('admin.announcements.form.planPlaceholder') },
                          ...PLANS.map((p) => ({
                            value: p.id,
                            label: lang === 'ur' ? p.nameUr : p.name,
                          })),
                        ]}
                      />
                    )}
                    {targetType === 'school' && (
                      <Select
                        id="ann-target-select"
                        label={t('admin.announcements.form.school')}
                        value={targetSchoolId}
                        onChange={(e) => setTargetSchoolId(e.target.value)}
                        required
                        error={errors.target ?? null}
                        options={[
                          { value: '', label: t('admin.announcements.form.schoolPlaceholder') },
                          ...schools.map((s) => ({ value: s.id, label: s.name })),
                        ]}
                      />
                    )}
                  </fieldset>

                  <fieldset className="admin-ann__fieldset">
                    <legend>{t('admin.announcements.form.schedule')}</legend>
                    <div className="admin-ann__radios">
                      <Radio
                        name="ann-schedule"
                        value="now"
                        checked={scheduleMode === 'now'}
                        onChange={() => setScheduleMode('now')}
                        label={t('admin.announcements.form.sendNow')}
                      />
                      <Radio
                        name="ann-schedule"
                        value="scheduled"
                        checked={scheduleMode === 'scheduled'}
                        onChange={() => setScheduleMode('scheduled')}
                        label={t('admin.announcements.form.scheduleFor')}
                      />
                    </div>
                    {scheduleMode === 'scheduled' && (
                      <DatePicker
                        id="ann-date"
                        label={t('admin.announcements.form.date')}
                        value={date}
                        onChange={setDate}
                        required
                        helper={t('admin.announcements.form.dateHint')}
                        error={errors.date ?? null}
                      />
                    )}
                  </fieldset>
                </div>

                <div className="admin-ann__actions">
                  <Button type="submit" variant="primary" size="lg" loading={submitBusy}>
                    {scheduleMode === 'scheduled'
                      ? t('admin.announcements.form.submitScheduled')
                      : t('admin.announcements.form.submit')}
                  </Button>
                  <Button type="button" variant="ghost" onClick={resetForm}>
                    {t('admin.announcements.form.reset')}
                  </Button>
                </div>
              </form>
            </Card>

            <Card className="admin-ann__preview-card" aria-label={t('admin.announcements.preview.title')}>
              <h2>{t('admin.announcements.preview.title')}</h2>
              <div className="admin-ann__preview">
                <div className="admin-ann__preview-title">
                  {title.trim() || t('admin.announcements.preview.titlePlaceholder')}
                </div>
                <p className="admin-ann__preview-body">
                  {body.trim() || t('admin.announcements.preview.bodyPlaceholder')}
                </p>
                <div className="admin-ann__preview-meta">
                  <span>{previewTarget}</span>
                  <span>{previewDate}</span>
                </div>
              </div>
            </Card>
          </div>

          <section className="admin-ann__list" aria-label={t('admin.announcements.scheduled.title')}>
            <h2>{t('admin.announcements.scheduled.title')}</h2>
            <Table
              columns={listColumns}
              data={scheduled}
              ariaLabel={t('admin.announcements.scheduled.title')}
              emptyTitle={t('admin.announcements.scheduled.emptyTitle')}
              emptyBody={t('admin.announcements.scheduled.emptyBody')}
              emptyAction={{ label: t('admin.announcements.scheduled.emptyAction'), onClick: scrollToCompose }}
            />
          </section>

          <section className="admin-ann__list" aria-label={t('admin.announcements.sent.title')}>
            <h2>{t('admin.announcements.sent.title')}</h2>
            <Table
              columns={listColumns}
              data={sent}
              ariaLabel={t('admin.announcements.sent.title')}
              emptyTitle={t('admin.announcements.sent.emptyTitle')}
              emptyBody={t('admin.announcements.sent.emptyBody')}
              emptyAction={{ label: t('admin.announcements.sent.emptyAction'), onClick: scrollToCompose }}
            />
          </section>
        </>
      )}
    </div>
  )
}

export default AdminAnnouncementsPage
