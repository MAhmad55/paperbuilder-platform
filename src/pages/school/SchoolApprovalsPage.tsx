import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../shell/PageHeader'
import {
  Banner, Button, Card, EmptyState, SearchField, Skeleton, Textarea, Timeline, useToast,
} from '../../design-system'
import type { TimelineItem } from '../../design-system'
import { PaperService } from '../../services/mock-store'
import { currentMarks } from '../../services/mock-store'
import type { Paper, PaperStatus } from '../../mock/data'
import { Bidi } from '../../utils/bidi'
import { formatDate, formatDateTime } from '../../utils/date'
import type { AppLanguage } from '../../i18n'
import {
  chapterLabel, classLabel, demoActor, demoModeOf, demoSchool, PaperPreview, paperStatusChip,
  subjectLabel, teacherName, useSchoolDemo,
} from './shared'
import '../../styles/school.css'

type StatusFilter = 'all' | 'submitted' | 'in-review'

const HISTORY_KEY: Record<string, string> = {
  created: 'created',
  submitted: 'submitted',
  'in-review': 'inReview',
  approved: 'approved',
  'changes-requested': 'changesRequested',
  printed: 'printed',
  archived: 'archived',
  edited: 'edited',
}

/** School Admin approvals — Phase 4. Queue of submitted papers with a
    side-by-side live A4 preview. Approve acts at once (no dialog);
    Request changes expands inline and the comment is required. */
export function SchoolApprovalsPage() {
  const { t, i18n } = useTranslation()
  const [params] = useSearchParams()
  const { toast } = useToast()
  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage
  const demoMode = demoModeOf(params.get('demo'))
  const { loading, loadFailed, retry } = useSchoolDemo(demoMode)
  const forceEmpty = demoMode === 'empty'

  const [version, setVersion] = useState(0)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [flow, setFlow] = useState<'none' | 'changes'>('none')
  const [comment, setComment] = useState('')
  const [commentError, setCommentError] = useState<string | null>(null)

  const actor = demoActor()
  const school = demoSchool()
  const schoolId = school?.id ?? ''

  const queue = useMemo(
    () => (forceEmpty || !schoolId
      ? []
      : PaperService.list({ schoolId }).filter((p) => p.status === 'submitted' || p.status === 'in-review')),
    [forceEmpty, schoolId, version],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return queue.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (q) {
        const hay = [p.title, subjectLabel(p.subjectId, 'en'), subjectLabel(p.subjectId, 'ur'), teacherName(p.teacherId)]
          .join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [queue, statusFilter, search])

  const selectedParam = params.get('selected')
  const selected: Paper | undefined = useMemo(() => {
    if (selectedId) {
      const found = filtered.find((p) => p.id === selectedId)
      if (found) return found
    }
    if (selectedParam) {
      const found = filtered.find((p) => p.id === selectedParam)
      if (found) return found
    }
    return filtered[0]
  }, [filtered, selectedId, selectedParam])

  /* Close any open inline flow when the selection changes. */
  useEffect(() => {
    setFlow('none')
    setComment('')
    setCommentError(null)
  }, [selected?.id])

  const clearFilters = () => {
    setStatusFilter('all')
    setSearch('')
  }

  /** The lifecycle graph (§5.2) only allows changes-requested and approved
      from in-review, so a submitted paper is first moved to in-review —
      the approver opening it is the review starting. */
  const moveToInReview = (paper: Paper): boolean => {
    if (paper.status === 'in-review') return true
    const result = PaperService.transition(paper.id, 'in-review', actor)
    if (!result.ok) {
      toast({ variant: 'error', message: result.error })
      return false
    }
    return true
  }

  const approve = () => {
    if (!selected) return
    if (!moveToInReview(selected)) return
    const result = PaperService.transition(selected.id, 'approved', actor)
    if (!result.ok) {
      toast({ variant: 'error', message: result.error })
      return
    }
    setVersion((v) => v + 1)
    toast({ variant: 'success', message: t('school.approvals.actions.approvedToast') })
  }

  const confirmChanges = () => {
    if (!selected) return
    if (!comment.trim()) {
      setCommentError(t('school.approvals.inline.changesError'))
      window.setTimeout(() => document.getElementById('school-changes-comment')?.focus(), 50)
      return
    }
    if (!moveToInReview(selected)) return
    const result = PaperService.transition(selected.id, 'changes-requested', actor, comment.trim())
    if (!result.ok) {
      toast({ variant: 'error', message: result.error })
      return
    }
    setFlow('none')
    setComment('')
    setVersion((v) => v + 1)
    toast({ variant: 'success', message: t('school.approvals.actions.changesToast') })
  }

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = { all: queue.length, submitted: 0, 'in-review': 0 }
    for (const p of queue) counts[p.status as 'submitted' | 'in-review'] += 1
    return counts
  }, [queue])

  const chipOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: t('school.approvals.filters.all') },
    { value: 'submitted', label: t('status.submitted') },
    { value: 'in-review', label: t('status.inReview') },
  ]

  const examTypeKey = (paper: Paper) =>
    paper.examType === 'board-pattern' ? 'boardPattern'
      : paper.examType === 'chapter-test' ? 'chapterTest' : paper.examType

  const checklist = selected ? [
    {
      key: 'marksTotal',
      met: currentMarks(selected) === selected.targetMarks,
      state: currentMarks(selected) === selected.targetMarks ? 'met' : 'notMet',
    },
    {
      key: 'coverage',
      met: selected.chapterIds.length > 0,
      state: selected.chapterIds.length > 0 ? 'met' : 'notMet',
    },
    { key: 'duplicates', met: false, state: 'unknown' },
    { key: 'answerKey', met: false, state: 'unknown' },
  ] : []

  const timelineItems: TimelineItem[] = (selected?.history ?? []).map((event) => ({
    id: event.id,
    title: t(`school.approvals.historyAction.${HISTORY_KEY[event.action] ?? event.action}`),
    meta: `${formatDateTime(event.createdAt, lang)} · ${event.actorName}${event.comment ? ` — ${event.comment}` : ''}`,
  }))

  const isDecided = selected
    ? selected.status !== 'submitted' && selected.status !== 'in-review'
    : false

  return (
    <div className="school">
      <PageHeader title={t('school.approvals.title')} lead={t('school.approvals.lead')} />

      {loading ? (
        <div className="school__skeleton" aria-label={t('common.loading')} role="status">
          <Skeleton variant="rect" height={48} />
          <Skeleton variant="rect" height={120} />
          <Skeleton variant="rect" height={220} />
        </div>
      ) : loadFailed ? (
        <div>
          <Banner variant="error" title={t('school.approvals.error.title')}>
            {t('school.approvals.error.body')}
          </Banner>
          <div className="school__retry">
            <Button variant="primary" onClick={retry}>
              {t('common.retry')}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="school-filters">
            <div
              className="school-chips"
              role="group"
              aria-label={t('school.approvals.filters.statusGroupLabel')}
            >
              {chipOptions.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className="school-chip"
                  aria-pressed={statusFilter === value}
                  onClick={() => setStatusFilter(value)}
                >
                  {label}
                  {' '}
                  <Bidi>{statusCounts[value]}</Bidi>
                </button>
              ))}
            </div>
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder={t('school.approvals.filters.searchPlaceholder')}
              ariaLabel={t('school.approvals.filters.searchPlaceholder')}
            />
          </div>

          <div className="school-layout">
            <section className="school-list" aria-label={t('school.approvals.list.title')}>
              <div className="school-list__head">
                <h2>{t('school.approvals.list.title')}</h2>
                <span><Bidi>{t('school.approvals.list.count', { count: filtered.length })}</Bidi></span>
              </div>
              {filtered.length === 0 ? (
                <EmptyState
                  title={t('school.approvals.list.emptyTitle')}
                  body={t('school.approvals.list.emptyBody')}
                >
                  <Button variant="secondary" onClick={clearFilters}>
                    {t('common.clear')}
                  </Button>
                </EmptyState>
              ) : (
                <ul className="school-items">
                  {filtered.map((paper) => {
                    const isSelected = selected?.id === paper.id
                    return (
                      <li key={paper.id}>
                        <button
                          type="button"
                          className="school-item"
                          aria-current={isSelected ? 'true' : undefined}
                          onClick={() => setSelectedId(paper.id)}
                        >
                          <span className="school-item__head">
                            <Bidi>{paper.title}</Bidi>
                            {paperStatusChip(paper.status)}
                          </span>
                          <span className="school-item__meta">
                            {classLabel(paper.classId)}
                            {' · '}
                            {subjectLabel(paper.subjectId, lang)}
                            {' · '}
                            {formatDate(paper.examDate, lang)}
                          </span>
                          <span className="school-item__meta"><Bidi>{teacherName(paper.teacherId)}</Bidi></span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section className="school-panel" aria-label={selected?.title ?? t('school.approvals.title')}>
              {!selected ? (
                <Card>
                  <EmptyState
                    title={t('school.approvals.list.emptyTitle')}
                    body={t('school.approvals.list.emptyBody')}
                  >
                    <Button variant="secondary" onClick={clearFilters}>
                      {t('common.clear')}
                    </Button>
                  </EmptyState>
                </Card>
              ) : (
                <div>
                  <Card>
                    <div className="school-panel__head">
                      <h2><Bidi>{selected.title}</Bidi></h2>
                      {paperStatusChip(selected.status)}
                    </div>
                    <dl className="school-facts">
                      <div>
                        <dt>{t('school.approvals.details.class')}</dt>
                        <dd>{classLabel(selected.classId)}</dd>
                      </div>
                      <div>
                        <dt>{t('school.approvals.details.subject')}</dt>
                        <dd>{subjectLabel(selected.subjectId, lang)}</dd>
                      </div>
                      <div>
                        <dt>{t('school.approvals.details.teacher')}</dt>
                        <dd><Bidi>{teacherName(selected.teacherId)}</Bidi></dd>
                      </div>
                      <div>
                        <dt>{t('school.approvals.details.medium')}</dt>
                        <dd>{t(`medium.${selected.medium}`)}</dd>
                      </div>
                      <div>
                        <dt>{t('school.approvals.details.examType')}</dt>
                        <dd>{t(`examType.${examTypeKey(selected)}`)}</dd>
                      </div>
                      <div>
                        <dt>{t('school.approvals.details.term')}</dt>
                        <dd>{t(`term.${selected.term}`)}</dd>
                      </div>
                      <div>
                        <dt>{t('school.approvals.details.examDate')}</dt>
                        <dd>{formatDate(selected.examDate, lang)}</dd>
                      </div>
                      <div>
                        <dt>{t('school.approvals.details.marks')}</dt>
                        <dd><Bidi>{currentMarks(selected)} / {selected.targetMarks}</Bidi></dd>
                      </div>
                      <div>
                        <dt>{t('school.approvals.details.chapters')}</dt>
                        <dd>
                          {selected.chapterIds.map((id) => chapterLabel(id, lang)).join(lang === 'ur' ? '، ' : ', ')}
                        </dd>
                      </div>
                    </dl>
                  </Card>

                  <Card title={t('school.approvals.preview.title')}>
                    <PaperPreview paper={selected} schoolName={school?.name ?? ''} />
                  </Card>

                  <Card title={t('school.approvals.checklist.title')}>
                    <ul className="school-checklist">
                      {checklist.map((item) => (
                        <li key={item.key} className="school-checklist__row">
                          <span>{t(`school.approvals.checklist.${item.key}`)}</span>
                          <span>
                            {item.state === 'unknown' && item.key === 'answerKey'
                              ? t('school.approvals.checklist.answerKeyUnknown')
                              : t(`school.approvals.checklist.${item.state}`)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Card>

                  <Card>
                    {isDecided ? (
                      <p className="school-note">{t('school.approvals.actions.decidedNote')}</p>
                    ) : flow === 'none' ? (
                      <div className="school-actions">
                        <Button variant="primary" onClick={approve}>
                          {t('school.approvals.actions.approve')}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setComment('')
                            setCommentError(null)
                            setFlow('changes')
                          }}
                        >
                          {t('school.approvals.actions.requestChanges')}
                        </Button>
                      </div>
                    ) : (
                      <div className="school-flow">
                        <Textarea
                          id="school-changes-comment"
                          label={t('school.approvals.inline.changesLabel')}
                          value={comment}
                          onChange={(e) => {
                            setComment(e.target.value)
                            if (commentError) setCommentError(null)
                          }}
                          placeholder={t('school.approvals.inline.changesPlaceholder')}
                          error={commentError}
                          required
                          rows={3}
                        />
                        <div className="school-actions">
                          <Button variant="primary" onClick={confirmChanges}>
                            {t('school.approvals.inline.changesConfirm')}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setFlow('none')
                              setCommentError(null)
                            }}
                          >
                            {t('school.approvals.inline.changesCancel')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>

                  <Card title={t('school.approvals.history.title')}>
                    <Timeline items={timelineItems} ariaLabel={t('school.approvals.history.title')} />
                  </Card>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  )
}

export default SchoolApprovalsPage
