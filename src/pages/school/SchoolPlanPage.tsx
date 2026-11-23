import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../shell/PageHeader'
import {
  Banner, Button, Card, Meter, Select, Skeleton, useToast,
} from '../../design-system'
import { PaperService, PlatformService, SchoolService } from '../../services/mock-store'
import { PLANS } from '../../mock/data'
import type { PlanId } from '../../mock/data'
import { Bidi } from '../../utils/bidi'
import type { AppLanguage } from '../../i18n'
import {
  demoActor, demoModeOf, demoSchool, useSchoolDemo,
} from './shared'
import '../../styles/school.css'

const PLAN_ORDER: PlanId[] = ['starter', 'growth', 'enterprise']

/** Plan & usage — Phase 4. Current plan, honest quota meters computed from
    the mock data, and a mock upgrade request (toast + audit event). */
export function SchoolPlanPage() {
  const { t, i18n } = useTranslation()
  const [params] = useSearchParams()
  const { toast } = useToast()
  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage
  const demoMode = demoModeOf(params.get('demo'))
  const { loading, loadFailed, retry } = useSchoolDemo(demoMode)
  const forceEmpty = demoMode === 'empty'

  const actor = demoActor()
  const school = demoSchool()
  const schoolId = school?.id ?? ''

  const [version, setVersion] = useState(0)
  const [targetPlan, setTargetPlan] = useState<PlanId | ''>('')
  const [requestBusy, setRequestBusy] = useState(false)

  const plan = useMemo(
    () => (forceEmpty || !school ? undefined : PlatformService.listPlans().find((p) => p.id === school.plan)),
    [forceEmpty, school, version],
  )
  const requested = useMemo(
    () => (forceEmpty || !schoolId ? undefined : SchoolService.getUpgradeRequest(schoolId)),
    [forceEmpty, schoolId, version],
  )
  const papersThisMonth = useMemo(() => {
    if (forceEmpty || !schoolId) return 0
    const now = new Date()
    return PaperService.list({ schoolId }).filter((p) => {
      const d = new Date(p.createdAt)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    }).length
  }, [forceEmpty, schoolId])
  const activeTeachers = useMemo(
    () => (forceEmpty || !schoolId
      ? 0
      : SchoolService.listTeachers(schoolId).filter((u) => u.status === 'active').length),
    [forceEmpty, schoolId],
  )
  const templateCount = useMemo(
    () => (forceEmpty || !schoolId ? 0 : PlatformService.listTemplates(schoolId).length),
    [forceEmpty, schoolId],
  )

  const higherPlans = useMemo(() => {
    if (!plan) return []
    const idx = PLAN_ORDER.indexOf(plan.id)
    return PLANS.filter((p) => PLAN_ORDER.indexOf(p.id) > idx)
  }, [plan])

  /* Default the upgrade target to the next plan up. */
  useEffect(() => {
    if (higherPlans.length > 0 && !targetPlan) setTargetPlan(higherPlans[0].id)
  }, [higherPlans, targetPlan])

  const planName = (id: PlanId) => {
    const p = PLANS.find((x) => x.id === id)
    return p ? (lang === 'ur' ? p.nameUr : p.name) : id
  }

  const requestUpgrade = () => {
    if (!targetPlan || requestBusy || !schoolId) return
    setRequestBusy(true)
    window.setTimeout(() => {
      const result = SchoolService.requestPlanUpgrade(schoolId, targetPlan, actor)
      setRequestBusy(false)
      if (!result.ok) {
        toast({ variant: 'error', message: result.error })
        return
      }
      setVersion((v) => v + 1)
      toast({ variant: 'success', message: t('school.plan.upgradeToast') })
    }, 200)
  }

  const quotaRow = (label: string, current: number, limit: number | 'unlimited') =>
    limit === 'unlimited' ? (
      <p className="school-rows__row">
        <span>{label}</span>
        <span>
          <Bidi>{current}</Bidi>
          {' · '}
          {t('school.plan.unlimited')}
        </span>
      </p>
    ) : (
      <Meter target={limit} current={current} label={label} />
    )

  return (
    <div className="school">
      <PageHeader title={t('school.plan.title')} lead={t('school.plan.lead')} />

      {loading ? (
        <div className="school__skeleton" aria-label={t('common.loading')} role="status">
          <Skeleton variant="rect" height={48} />
          <Skeleton variant="rect" height={120} />
          <Skeleton variant="rect" height={120} />
        </div>
      ) : loadFailed ? (
        <div>
          <Banner variant="error" title={t('school.plan.error.title')}>
            {t('school.plan.error.body')}
          </Banner>
          <div className="school__retry">
            <Button variant="primary" onClick={retry}>
              {t('common.retry')}
            </Button>
          </div>
        </div>
      ) : plan ? (
        <>
          <Card title={t('school.plan.current.title')}>
            <p className="school-rows__row">
              <span><Bidi>{planName(plan.id)}</Bidi></span>
            </p>
            <div className="school-usage">
              {quotaRow(t('school.plan.current.papersThisMonth'), papersThisMonth, plan.maxPapersPerMonth)}
              {quotaRow(t('school.plan.current.teachers'), activeTeachers, plan.maxTeachers)}
              {quotaRow(t('school.plan.current.templates'), templateCount, plan.maxTemplates)}
            </div>
          </Card>

          {higherPlans.length > 0 && (
            <div className="school__section" style={{ marginBlockStart: 16 }}>
              <Card title={t('school.plan.upgrade.title')}>
                {requested ? (
                  <Banner variant="info" title={t('school.plan.upgrade.requested')}>
                    <Bidi>
                      {t('school.plan.upgrade.requestedNote', { plan: planName(requested) })}
                    </Bidi>
                  </Banner>
                ) : (
                  <>
                    <p className="school-note">{t('school.plan.upgrade.body')}</p>
                    <div className="school-form">
                      <Select
                        id="school-plan-target"
                        label={t('common.plan')}
                        value={targetPlan}
                        onChange={(e) => setTargetPlan(e.target.value as PlanId | '')}
                        options={higherPlans.map((p) => ({
                          value: p.id,
                          label: lang === 'ur' ? p.nameUr : p.name,
                        }))}
                      />
                      <div className="school-form__actions">
                        <Button
                          variant="primary"
                          loading={requestBusy}
                          disabled={!targetPlan}
                          onClick={requestUpgrade}
                        >
                          {t('school.plan.upgrade.request')}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </Card>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

export default SchoolPlanPage
