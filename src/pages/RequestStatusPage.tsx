import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PublicLayout } from '../features/public/PublicLayout'
import { Banner, Button, Card, EmptyState, Skeleton, StatusChip, Timeline } from '../design-system'
import type { TimelineItem } from '../design-system'
import { ApprovalRequestService } from '../services/mock-store'
import type { ApprovalRequest, ApprovalRequestStatus } from '../mock/data'
import { DRAFT_STORAGE_KEY, EMPTY_REQUEST_FORM } from '../features/public/request-schemas'
import type { RequestFormData } from '../features/public/request-schemas'
import { Bidi } from '../utils/bidi'
import { formatDate, formatDateTime } from '../utils/date'
import type { AppLanguage } from '../i18n'
import '../styles/request.css'

const STATE_OVERRIDES: ApprovalRequestStatus[] = ['pending', 'info-requested', 'rejected', 'approved']

/** Short ?state= values from the URL map to stored statuses. */
const QUERY_STATE_MAP: Record<string, ApprovalRequestStatus> = {
  pending: 'pending',
  info: 'info-requested',
  rejected: 'rejected',
  approved: 'approved',
}
const STATE_QUERY_MAP: Record<ApprovalRequestStatus, string> = {
  pending: 'pending',
  'info-requested': 'info',
  rejected: 'rejected',
  approved: 'approved',
}

/** Timeline event types (hyphenated) map to camelCase i18n keys. */
const TIMELINE_KEY: Record<string, string> = {
  submitted: 'submitted',
  'under-review': 'underReview',
  'info-requested': 'infoRequested',
  resubmitted: 'resubmitted',
  approved: 'approved',
  rejected: 'rejected',
}

const CHIP_STATUS: Record<ApprovalRequestStatus, 'pending' | 'in-review' | 'rejected' | 'approved'> = {
  pending: 'pending',
  'info-requested': 'in-review',
  rejected: 'rejected',
  approved: 'approved',
}

const LRI = '\u2066'
const PDI = '\u2069'

/**
 * Wrap each numeric run in Unicode isolates (LRI…PDI) so a mixed
 * date-time string keeps its logical order inside the design-system
 * Timeline's <Bidi>: the global `.bdi` class forces `direction: ltr`,
 * which otherwise reorders "19 نومبر 2026 · 18:37" into month-year-time-day
 * in Urdu. Harmless in English (isolates preserve LTR order). The shared
 * `.bdi` rule is the real fix; this keeps B4 correct without touching it.
 */
function bidiSafe(value: string): string {
  return value.replace(/[\d:]+/g, (m) => `${LRI}${m}${PDI}`)
}

/** Render a formatted date as one <Bidi> per token — same reason as above. */
function DateParts({ value, lang }: { value: string; lang: AppLanguage }) {
  const parts = formatDate(value, lang).split(' ')
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 ? ' ' : ''}
          <Bidi>{part}</Bidi>
        </span>
      ))}
    </>
  )
}

/** Request status — Phase 2 B4. Timeline-driven status screen with a dev-only state switcher. */
export function RequestStatusPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const [loading, setLoading] = useState(true)

  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage
  const idParam = params.get('id') ?? undefined
  const stateParam = params.get('state') ?? undefined
  const stateOverride = stateParam ? (QUERY_STATE_MAP[stateParam] ?? null) : null
  const wasResubmitted = (location.state as { resubmitted?: boolean } | null)?.resubmitted === true

  /* Simulated fetch so the loading state is real (mock data is synchronous). */
  useEffect(() => {
    setLoading(true)
    const handle = window.setTimeout(() => setLoading(false), 350)
    return () => window.clearTimeout(handle)
  }, [idParam, stateParam])

  const request: ApprovalRequest | undefined = useMemo(() => {
    const base = idParam ? ApprovalRequestService.get(idParam) : ApprovalRequestService.getLatest()
    if (!stateOverride) return base
    /* Dev preview: render the seeded mock request that carries this status. */
    const seeded = ApprovalRequestService.list().find((r) => r.status === stateOverride)
    if (seeded) return seeded
    return base ? { ...base, status: stateOverride } : undefined
  }, [idParam, stateOverride])

  const setStatePreview = (state: ApprovalRequestStatus) => {
    const next = new URLSearchParams(params)
    next.set('state', STATE_QUERY_MAP[state])
    setParams(next, { replace: true })
    window.scrollTo({ top: 0 })
  }

  /** Back to the form with this request's details restored, so resubmitting keeps the same reference. */
  const editAndResubmit = (req: ApprovalRequest) => {
    const draft: RequestFormData = {
      ...EMPTY_REQUEST_FORM,
      schoolName: req.schoolName,
      city: req.city,
      address: req.address ?? '',
      board: (req.board ?? '') as RequestFormData['board'],
      studentsRange: (req.studentsRange ?? '') as RequestFormData['studentsRange'],
      schoolType: (req.schoolType ?? '') as RequestFormData['schoolType'],
      contactName: req.contactName,
      contactRole: (req.contactRole ?? '') as RequestFormData['contactRole'],
      contactPhone: req.contactPhone ?? '',
      contactEmail: req.contactEmail ?? '',
      certificate: (req.documentNames ?? []).map((name) => ({ name, size: 0, type: '' })),
      additional: [],
      planId: req.planId,
      notes: req.notes ?? '',
      consent: false,
      resubmitRef: req.id,
    }
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
    } catch {
      /* storage unavailable — the form still opens empty */
    }
    navigate('/request-access')
  }

  const startNewRequest = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
    } catch {
      /* ignore */
    }
    navigate('/request-access')
  }

  const timelineItems: TimelineItem[] = (request?.timeline ?? []).map((event) => ({
    id: event.id,
    title: t(`request.status.timeline.${TIMELINE_KEY[event.type] ?? event.type}`),
    meta: bidiSafe(formatDateTime(event.at, lang)),
  }))

  return (
    <PublicLayout>
      <div className="req-page req-page--narrow">
        {loading ? (
          <div className="req-skeleton" aria-label={t('common.loading')} role="status">
            <Skeleton variant="rect" height={36} width="55%" />
            <Skeleton variant="rect" height={20} width="80%" />
            <Skeleton variant="rect" height={120} />
            <Skeleton variant="rect" height={180} />
          </div>
        ) : !request ? (
          <Card className="req-card">
            <EmptyState
              title={t('request.status.notFoundTitle')}
              body={t('request.status.notFoundBody')}
            >
              <Button variant="primary" onClick={startNewRequest}>
                {t('request.status.actions.startNew')}
              </Button>
            </EmptyState>
          </Card>
        ) : (
          <>
            <div className="req-status__head">
              <h1>{t('request.status.title')}</h1>
              <StatusChip status={CHIP_STATUS[request.status]} />
            </div>

            {wasResubmitted && (
              <div style={{ marginBlockEnd: 16 }}>
                <Banner variant="success">{t('request.status.resubmittedNote')}</Banner>
              </div>
            )}

            <div className="req-ref">
              <div className="req-ref__label">{t('request.status.reference')}</div>
              <div className="req-ref__value"><Bidi>{request.id}</Bidi></div>
              <div className="req-ref__meta">
                <span>
                  {t('request.status.submittedOn')}
                  {' '}
                  <DateParts value={request.submittedAt} lang={lang} />
                </span>
                <span>
                  {t('request.status.expectedBy')}
                  {' '}
                  <DateParts value={request.expectedBy} lang={lang} />
                </span>
              </div>
              <p className="pb-helper" style={{ marginBlock: '12px 0' }}>{t('request.status.expectedNote')}</p>
            </div>

            {request.status === 'pending' && (
              <Card className="req-card">
                <h2>{t('request.status.pendingTitle')}</h2>
                <p className="req-status__body" style={{ marginBlockStart: 8 }}>{t('request.status.pendingBody')}</p>
                <Button variant="ghost" onClick={startNewRequest}>
                  {t('request.status.actions.newRequest')}
                </Button>
              </Card>
            )}

            {request.status === 'info-requested' && (
              <Card className="req-card">
                <h2>{t('request.status.infoTitle')}</h2>
                <p className="req-status__body" style={{ marginBlockStart: 8 }}>{t('request.status.infoBody')}</p>
                <h3 style={{ fontSize: 'var(--text-base)', margin: '0 0 8px' }}>{t('request.status.missingTitle')}</h3>
                <ul className="req-missing">
                  {(request.missingItems ?? []).map((item) => (
                    <li key={item}>{t(`request.status.missing.${item}`)}</li>
                  ))}
                </ul>
                <Button variant="primary" onClick={() => editAndResubmit(request)}>
                  {t('request.status.actions.editAndResubmit')}
                </Button>
              </Card>
            )}

            {request.status === 'rejected' && (
              <Card className="req-card">
                <h2>{t('request.status.rejectedTitle')}</h2>
                <div style={{ marginBlock: '8px 16px' }}>
                  <Banner variant="error">
                    {request.rejectionReason
                      ? t(`request.status.reasons.${request.rejectionReason}`, { defaultValue: request.rejectionReason })
                      : t('request.status.reasons.incomplete')}
                  </Banner>
                </div>
                <Button variant="primary" onClick={startNewRequest}>
                  {t('request.status.actions.startNew')}
                </Button>
              </Card>
            )}

            {request.status === 'approved' && (
              <Card className="req-card">
                <h2>{t('request.status.approvedTitle')}</h2>
                <p className="req-status__body" style={{ marginBlockStart: 8 }}>{t('request.status.approvedBody')}</p>
                <Button variant="primary" onClick={() => navigate('/sign-in')}>
                  {t('request.status.actions.signIn')}
                </Button>
              </Card>
            )}

            <section className="req-section" aria-label={t('request.status.timelineTitle')}>
              <h2>{t('request.status.timelineTitle')}</h2>
              <Timeline items={timelineItems} ariaLabel={t('request.status.timelineTitle')} />
            </section>

            <div className="req-dev" role="group" aria-label={t('request.status.devOnly')}>
              <div className="req-dev__label">{t('request.status.devOnly')}</div>
              <div className="req-dev__buttons">
                {STATE_OVERRIDES.map((state) => (
                  <Button
                    key={state}
                    variant={stateOverride === state ? 'primary' : 'secondary'}
                    size="md"
                    aria-pressed={stateOverride === state}
                    onClick={() => setStatePreview(state)}
                  >
                    {state === 'info-requested'
                      ? t('request.status.infoTitle')
                      : t(`status.${state === 'pending' ? 'pending' : state}`)}
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </PublicLayout>
  )
}

export default RequestStatusPage
