import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FileText } from 'lucide-react'
import { PageHeader } from '../../shell/PageHeader'
import {
  Banner, Button, Card, Checkbox, Dialog, EmptyState, SearchField, Select,
  Skeleton, StatusChip, Textarea, Timeline, useToast,
} from '../../design-system'
import type { TimelineItem } from '../../design-system'
import {
  ApprovalRequestService, AuthService, PlatformService, SUPER_ADMINS,
} from '../../services/mock-store'
import type { ApprovalMissingItem, ApprovalRequest, ApprovalRequestStatus } from '../../mock/data'
import { Bidi } from '../../utils/bidi'
import { formatDate, formatDateTime } from '../../utils/date'
import type { AppLanguage } from '../../i18n'
import '../../styles/admin-approvals.css'

type StatusFilter = 'all' | ApprovalRequestStatus

const TIMELINE_KEY: Record<string, string> = {
  submitted: 'submitted',
  'under-review': 'underReview',
  'info-requested': 'infoRequested',
  resubmitted: 'resubmitted',
  approved: 'approved',
  rejected: 'rejected',
}

const CHIP_STATUS: Record<ApprovalRequestStatus, 'pending' | 'changes-requested' | 'rejected' | 'approved'> = {
  pending: 'pending',
  'info-requested': 'changes-requested',
  rejected: 'rejected',
  approved: 'approved',
}

const MISSING_ITEMS: ApprovalMissingItem[] = ['certificate', 'contact', 'address']

/** Approval queue — Phase 3 B4. List plus review panel. */
export function AdminApprovalsPage() {
  const { t, i18n } = useTranslation()
  const [params] = useSearchParams()
  const { toast } = useToast()

  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage
  const demo = params.get('demo')
  const forceEmpty = demo === 'empty'

  const [loading, setLoading] = useState(demo !== 'error')
  const [demoError, setDemoError] = useState(demo === 'error')
  const [version, setVersion] = useState(0)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [approveOpen, setApproveOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [missing, setMissing] = useState<ApprovalMissingItem[]>([])
  const [infoError, setInfoError] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState<string | null>(null)

  /* Simulated fetch so the loading state is real (mock data is synchronous). */
  useEffect(() => {
    if (demo === 'loading') return
    setLoading(true)
    const handle = window.setTimeout(() => setLoading(false), 350)
    return () => window.clearTimeout(handle)
  }, [demo])

  const actor = AuthService.currentUser() ?? SUPER_ADMINS[0]

  const requests = useMemo(
    () => (forceEmpty ? [] : ApprovalRequestService.list()),
    [forceEmpty, version],
  )
  const plans = useMemo(() => PlatformService.listPlans(), [version])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return requests.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (q && !r.schoolName.toLowerCase().includes(q) && !r.id.toLowerCase().includes(q)) return false
      return true
    })
  }, [requests, statusFilter, search])

  const selected: ApprovalRequest | undefined = useMemo(() => {
    if (selectedId) {
      const found = filtered.find((r) => r.id === selectedId)
      if (found) return found
    }
    return filtered[0]
  }, [filtered, selectedId])

  /* Keep the notes editor in sync with the selected request. */
  useEffect(() => {
    setNotes(selected?.internalNotes ?? '')
  }, [selected?.id, selected?.internalNotes])

  const retryLoad = () => {
    setDemoError(false)
    setLoading(true)
    window.setTimeout(() => setLoading(false), 350)
  }

  const planName = (planId: ApprovalRequest['planId']) => {
    const plan = plans.find((p) => p.id === planId)
    return plan ? (lang === 'ur' ? plan.nameUr : plan.name) : planId
  }

  const chipFor = (status: ApprovalRequestStatus) =>
    status === 'info-requested' ? (
      <StatusChip status="changes-requested" label={t('admin.approvals.statusInfoRequested')} />
    ) : (
      <StatusChip status={CHIP_STATUS[status]} />
    )

  const decide = (decision: 'approved' | 'info-requested' | 'rejected') => {
    if (!selected) return
    const opts =
      decision === 'info-requested'
        ? { missingItems: missing }
        : decision === 'rejected'
          ? { rejectionReason: rejectReason.trim() }
          : {}
    const result = ApprovalRequestService.decide(selected.id, decision, actor, opts)
    if (!result.ok) {
      toast({ variant: 'error', message: result.error })
      return
    }
    setApproveOpen(false)
    setInfoOpen(false)
    setRejectOpen(false)
    setMissing([])
    setRejectReason('')
    setVersion((v) => v + 1)
    toast({
      variant: 'success',
      message: t(
        decision === 'approved'
          ? 'admin.approvals.approvedToast'
          : decision === 'info-requested'
            ? 'admin.approvals.infoRequestedToast'
            : 'admin.approvals.rejectedToast',
      ),
    })
  }

  const confirmInfo = () => {
    if (missing.length === 0) {
      setInfoError(t('admin.approvals.infoDialog.error'))
      return
    }
    decide('info-requested')
  }

  const confirmReject = () => {
    if (!rejectReason.trim()) {
      setRejectError(t('admin.approvals.rejectDialog.reasonRequired'))
      window.setTimeout(() => document.getElementById('reject-reason')?.focus(), 50)
      return
    }
    decide('rejected')
  }

  const saveNotes = () => {
    if (!selected) return
    ApprovalRequestService.update(selected.id, { internalNotes: notes.trim() })
    setVersion((v) => v + 1)
    toast({ variant: 'success', message: t('admin.approvals.internalNotes.saved') })
  }

  const clearFilters = () => {
    setStatusFilter('all')
    setSearch('')
  }

  const timelineItems: TimelineItem[] = (selected?.timeline ?? []).map((event) => ({
    id: event.id,
    title: t(`request.status.timeline.${TIMELINE_KEY[event.type] ?? event.type}`),
    meta: formatDateTime(event.at, lang),
  }))

  const isDecided = selected ? selected.status !== 'pending' && selected.status !== 'info-requested' : false

  const statusOptions = [
    { value: 'all', label: t('admin.approvals.filters.all') },
    { value: 'pending', label: t('status.pending') },
    { value: 'info-requested', label: t('admin.approvals.statusInfoRequested') },
    { value: 'approved', label: t('status.approved') },
    { value: 'rejected', label: t('status.rejected') },
  ]

  return (
    <div className="admin-approvals">
      <PageHeader
        title={t('admin.approvals.title')}
        lead={t('admin.approvals.lead')}
      />

      {loading ? (
        <div className="admin-approvals__skeleton" aria-label={t('common.loading')} role="status">
          <Skeleton variant="rect" height={48} />
          <Skeleton variant="rect" height={120} />
          <Skeleton variant="rect" height={220} />
        </div>
      ) : demoError ? (
        <div>
          <Banner variant="error" title={t('admin.approvals.error.title')}>
            {t('admin.approvals.error.body')}
          </Banner>
          <div className="admin-approvals__retry">
            <Button variant="primary" onClick={retryLoad}>
              {t('common.retry')}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="admin-approvals__filters">
            <Select
              id="approvals-status-filter"
              label={t('admin.approvals.filters.statusLabel')}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              options={statusOptions}
            />
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder={t('admin.approvals.filters.searchPlaceholder')}
              ariaLabel={t('admin.approvals.filters.searchPlaceholder')}
            />
          </div>

          <div className="admin-approvals__layout">
            <section className="admin-approvals__list" aria-label={t('admin.approvals.list.title')}>
              <div className="admin-approvals__list-head">
                <h2>{t('admin.approvals.list.title')}</h2>
                <span><Bidi>{t('admin.approvals.list.count', { count: filtered.length })}</Bidi></span>
              </div>
              {filtered.length === 0 ? (
                <EmptyState
                  title={t('admin.approvals.list.emptyTitle')}
                  body={t('admin.approvals.list.emptyBody')}
                >
                  <Button variant="secondary" onClick={clearFilters}>
                    {t('common.clear')}
                  </Button>
                </EmptyState>
              ) : (
                <ul className="admin-approvals__items">
                  {filtered.map((req) => {
                    const isSelected = selected?.id === req.id
                    return (
                      <li key={req.id}>
                        <button
                          type="button"
                          className="admin-approvals__item"
                          aria-current={isSelected ? 'true' : undefined}
                          onClick={() => setSelectedId(req.id)}
                        >
                          <span className="admin-approvals__item-head">
                            <Bidi>{req.schoolName}</Bidi>
                            {chipFor(req.status)}
                          </span>
                          <span className="admin-approvals__item-meta">
                            <Bidi>{req.city}</Bidi>
                            {' · '}
                            {formatDate(req.submittedAt, lang)}
                          </span>
                          <span className="admin-approvals__item-ref"><Bidi>{req.id}</Bidi></span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section className="admin-approvals__panel" aria-label={selected?.schoolName ?? t('admin.approvals.title')}>
              {!selected ? (
                <Card>
                  <EmptyState
                    title={t('admin.approvals.list.emptyTitle')}
                    body={t('admin.approvals.list.emptyBody')}
                  >
                    <Button variant="secondary" onClick={clearFilters}>
                      {t('common.clear')}
                    </Button>
                  </EmptyState>
                </Card>
              ) : (
                <div>
                  <Card className="admin-approvals__card">
                    <div className="admin-approvals__panel-head">
                      <h2><Bidi>{selected.schoolName}</Bidi></h2>
                      {chipFor(selected.status)}
                    </div>
                    <dl className="admin-approvals__facts">
                      <div>
                        <dt>{t('request.status.reference')}</dt>
                        <dd><Bidi>{selected.id}</Bidi></dd>
                      </div>
                      <div>
                        <dt>{t('admin.approvals.details.city')}</dt>
                        <dd><Bidi>{selected.city}</Bidi></dd>
                      </div>
                      <div>
                        <dt>{t('request.status.submittedOn')}</dt>
                        <dd>{formatDate(selected.submittedAt, lang)}</dd>
                      </div>
                      <div>
                        <dt>{t('request.status.expectedBy')}</dt>
                        <dd>{formatDate(selected.expectedBy, lang)}</dd>
                      </div>
                      <div>
                        <dt>{t('admin.approvals.details.plan')}</dt>
                        <dd>{planName(selected.planId)}</dd>
                      </div>
                      <div>
                        <dt>{t('admin.approvals.details.contact')}</dt>
                        <dd>
                          <Bidi>{selected.contactName}</Bidi>
                          {selected.contactRole
                            ? ` · ${t(`request.contact.roleOptions.${selected.contactRole}`, { defaultValue: selected.contactRole })}`
                            : ''}
                        </dd>
                      </div>
                      {selected.contactPhone && (
                        <div>
                          <dt>{t('admin.approvals.details.phone')}</dt>
                          <dd><Bidi>{selected.contactPhone}</Bidi></dd>
                        </div>
                      )}
                      {selected.contactEmail && (
                        <div>
                          <dt>{t('admin.approvals.details.email')}</dt>
                          <dd><Bidi>{selected.contactEmail}</Bidi></dd>
                        </div>
                      )}
                      {selected.address && (
                        <div>
                          <dt>{t('admin.approvals.details.address')}</dt>
                          <dd><Bidi>{selected.address}</Bidi></dd>
                        </div>
                      )}
                      {selected.board && (
                        <div>
                          <dt>{t('admin.approvals.details.board')}</dt>
                          <dd>
                            {t(`request.school.boardOptions.${selected.board}`, { defaultValue: selected.board })}
                          </dd>
                        </div>
                      )}
                      {selected.studentsRange && (
                        <div>
                          <dt>{t('admin.approvals.details.students')}</dt>
                          <dd>
                            {t(`request.school.studentsOptions.${selected.studentsRange}`, {
                              defaultValue: selected.studentsRange,
                            })}
                          </dd>
                        </div>
                      )}
                      {selected.schoolType && (
                        <div>
                          <dt>{t('admin.approvals.details.schoolType')}</dt>
                          <dd>
                            {t(`request.school.typeOptions.${selected.schoolType}`, {
                              defaultValue: selected.schoolType,
                            })}
                          </dd>
                        </div>
                      )}
                      <div>
                        <dt>{t('admin.approvals.details.notes')}</dt>
                        <dd>{selected.notes ? <Bidi>{selected.notes}</Bidi> : t('admin.approvals.details.notesEmpty')}</dd>
                      </div>
                      {(selected.missingItems ?? []).length > 0 && (
                        <div>
                          <dt>{t('admin.approvals.decided.missingTitle')}</dt>
                          <dd>
                            <ul className="admin-approvals__missing">
                              {selected.missingItems!.map((item) => (
                                <li key={item}>{t(`request.status.missing.${item}`)}</li>
                              ))}
                            </ul>
                          </dd>
                        </div>
                      )}
                    </dl>
                  </Card>

                  <Card className="admin-approvals__card" title={t('admin.approvals.documents.title')}>
                    {(selected.documentNames ?? []).length > 0 ? (
                      <ul className="admin-approvals__docs">
                        {selected.documentNames!.map((name) => (
                          <li key={name}>
                            <FileText size={18} aria-hidden="true" />
                            <Bidi>{name}</Bidi>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="admin-approvals__none">{t('admin.approvals.documents.none')}</p>
                    )}
                  </Card>

                  <Card className="admin-approvals__card" title={t('admin.approvals.internalNotes.title')}>
                    <Textarea
                      id="approval-internal-notes"
                      label={t('admin.approvals.internalNotes.label')}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t('admin.approvals.internalNotes.placeholder')}
                      rows={3}
                    />
                    <div className="admin-approvals__actions">
                      <Button variant="secondary" onClick={saveNotes}>
                        {t('common.save')}
                      </Button>
                    </div>
                  </Card>

                  <Card className="admin-approvals__card">
                    {isDecided ? (
                      <div>
                        <p className="admin-approvals__note">{t('admin.approvals.actions.decidedNote')}</p>
                        {selected.status === 'rejected' && selected.rejectionReason && (
                          <div>
                            <h3>{t('admin.approvals.decided.rejectionTitle')}</h3>
                            <Banner variant="error">
                              {t(`request.status.reasons.${selected.rejectionReason}`, {
                                defaultValue: selected.rejectionReason,
                              })}
                            </Banner>
                          </div>
                        )}
                        <div className="admin-approvals__actions" aria-disabled="true">
                          <Button variant="primary" disabled>
                            {t('admin.approvals.actions.approve')}
                          </Button>
                          <Button variant="secondary" disabled>
                            {t('admin.approvals.actions.requestInfo')}
                          </Button>
                          <Button variant="destructive-outline" disabled>
                            {t('admin.approvals.actions.reject')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="admin-approvals__actions">
                        <Button variant="primary" onClick={() => setApproveOpen(true)}>
                          {t('admin.approvals.actions.approve')}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setMissing(selected.missingItems ?? [])
                            setInfoError(null)
                            setInfoOpen(true)
                          }}
                        >
                          {t('admin.approvals.actions.requestInfo')}
                        </Button>
                        <Button
                          variant="destructive-outline"
                          onClick={() => {
                            setRejectReason('')
                            setRejectError(null)
                            setRejectOpen(true)
                          }}
                        >
                          {t('admin.approvals.actions.reject')}
                        </Button>
                      </div>
                    )}
                  </Card>

                  <Card className="admin-approvals__card" title={t('request.status.timelineTitle')}>
                    <Timeline items={timelineItems} ariaLabel={t('request.status.timelineTitle')} />
                  </Card>
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      <Dialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title={t('admin.approvals.approveDialog.title')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setApproveOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={() => decide('approved')}>
              {t('admin.approvals.approveDialog.confirm')}
            </Button>
          </>
        }
      >
        <p>{t('admin.approvals.approveDialog.body')}</p>
      </Dialog>

      <Dialog
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        title={t('admin.approvals.infoDialog.title')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setInfoOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={confirmInfo}>
              {t('admin.approvals.infoDialog.confirm')}
            </Button>
          </>
        }
      >
        <p>{t('admin.approvals.infoDialog.body')}</p>
        <div className="admin-approvals__checks" role="group" aria-label={t('admin.approvals.infoDialog.title')}>
          {MISSING_ITEMS.map((item) => (
            <Checkbox
              key={item}
              label={t(`request.status.missing.${item}`)}
              checked={missing.includes(item)}
              onChange={(e) => {
                setMissing((current) =>
                  e.target.checked ? [...current, item] : current.filter((m) => m !== item),
                )
                if (infoError) setInfoError(null)
              }}
            />
          ))}
        </div>
        {infoError && (
          <p className="pb-error-text" role="alert">
            {infoError}
          </p>
        )}
      </Dialog>

      <Dialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title={t('admin.approvals.rejectDialog.title')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmReject}>
              {t('admin.approvals.rejectDialog.confirm')}
            </Button>
          </>
        }
      >
        <Textarea
          id="reject-reason"
          label={t('admin.approvals.rejectDialog.reasonLabel')}
          value={rejectReason}
          onChange={(e) => {
            setRejectReason(e.target.value)
            if (rejectError) setRejectError(null)
          }}
          error={rejectError}
          required
          rows={3}
        />
      </Dialog>
    </div>
  )
}

export default AdminApprovalsPage
