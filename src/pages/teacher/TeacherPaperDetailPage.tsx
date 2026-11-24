import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../shell/PageHeader'
import {
  Banner, Button, Card, EmptyState, MathText, Skeleton, Tabs, Timeline, useToast,
} from '../../design-system'
import type { TimelineItem } from '../../design-system'
import { PaperService, SchoolService } from '../../services/mock-store'
import { currentMarks } from '../../services/mock-store'
import { Bidi } from '../../utils/bidi'
import { formatDate, formatDateTime } from '../../utils/date'
import type { AppLanguage } from '../../i18n'
import {
  chapterLabel, classLabel, demoModeOf, demoTeacher, demoTeacherSchool,
  paperFileTitle, paperHasMath, paperStatusChip, printWithTitle, SavedPaperPreview, shouldOpenPrintDialog, subjectLabel, useSchoolDemo,
} from './shared'
import '../../styles/teacher.css'

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

/** Paper detail — Phase 5 (blueprint 4.4.4): read-only paper, answer-key
    tab, history/timeline tab with the approver's comments. */
export function TeacherPaperDetailPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const [params] = useSearchParams()
  const { toast } = useToast()
  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage
  const demoMode = demoModeOf(params.get('demo'))
  const { loading, loadFailed, retry } = useSchoolDemo(demoMode)

  const [tab, setTab] = useState('paper')
  const [version, setVersion] = useState(0)
  const [previewMode, setPreviewMode] = useState<'en' | 'ur'>(lang)

  const teacher = demoTeacher()
  const school = demoTeacherSchool()

  const paper = useMemo(
    () => {
      const found = id ? PaperService.get(id) : undefined
      if (!found || found.teacherId !== teacher.id) return undefined
      return found
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, teacher.id, version],
  )

  const policyOptional = school
    ? (SchoolService.getSettings(school.id)?.approvalPolicy ?? 'required') === 'optional'
    : false

  const examTypeKey = (paperExamType: string) =>
    paperExamType === 'board-pattern' ? 'boardPattern'
      : paperExamType === 'chapter-test' ? 'chapterTest' : paperExamType

  const timelineItems: TimelineItem[] = (paper?.history ?? []).map((event) => ({
    id: event.id,
    title: t(`school.approvals.historyAction.${HISTORY_KEY[event.action] ?? event.action}`),
    meta: `${formatDateTime(event.createdAt, lang)} · ${event.actorName}${event.comment ? ` — ${event.comment}` : ''}`,
  }))

  const comments = (paper?.history ?? []).filter((h) => h.comment)

  const print = () => {
    if (!paper) return
    const result = PaperService.transition(paper.id, 'printed', teacher)
    if (!result.ok) {
      toast({ variant: 'error', message: result.error })
      return
    }
    if (shouldOpenPrintDialog()) printWithTitle(paperFileTitle({
      className: classLabel(paper.classId),
      subjectName: subjectLabel(paper.subjectId, 'en'),
      examType: t(`examType.${examTypeKey(paper.examType)}`),
      schoolName: school?.name ?? '',
    }), paperHasMath(paper.questions ?? []))
    setVersion((v) => v + 1)
    toast({ variant: 'success', message: t('teacher.studio.toasts.printed') })
  }

  const submit = () => {
    if (!paper) return
    const target = policyOptional ? 'approved' : 'submitted'
    const result = PaperService.transition(paper.id, target, teacher)
    if (!result.ok) {
      toast({ variant: 'error', message: result.error })
      return
    }
    setVersion((v) => v + 1)
    toast({ variant: 'success', message: t(policyOptional ? 'teacher.studio.toasts.approved' : 'teacher.studio.toasts.submitted') })
  }

  const duplicate = () => {
    if (!paper) return
    const result = PaperService.duplicate(paper.id, teacher)
    if (!result.ok) {
      toast({ variant: 'error', message: result.error })
      return
    }
    toast({ variant: 'success', message: t('teacher.studio.toasts.duplicated') })
    navigate(`/teacher/papers/${result.value.id}`)
  }

  const archive = () => {
    if (!paper) return
    const result = PaperService.transition(paper.id, 'archived', teacher)
    if (!result.ok) {
      toast({ variant: 'error', message: result.error })
      return
    }
    setVersion((v) => v + 1)
  }

  return (
    <div className="teacher">
      <PageHeader
        title={paper ? paper.title : t('teacher.detail.notFoundTitle')}
        lead={paper ? `${classLabel(paper.classId)} · ${subjectLabel(paper.subjectId, lang)}` : undefined}
      />

      {loading ? (
        <div className="teacher__skeleton" aria-label={t('common.loading')} role="status">
          <Skeleton variant="rect" height={48} />
          <Skeleton variant="rect" height={220} />
        </div>
      ) : loadFailed ? (
        <div>
          <Banner variant="error" title={t('teacher.detail.error.title')}>
            {t('teacher.detail.error.body')}
          </Banner>
          <div className="teacher__retry">
            <Button variant="primary" onClick={retry}>
              {t('common.retry')}
            </Button>
          </div>
        </div>
      ) : !paper ? (
        <Card>
          <EmptyState title={t('teacher.detail.notFoundTitle')} body={t('teacher.detail.notFoundBody')}>
            <Button variant="primary" onClick={() => navigate('/teacher/papers')}>
              {t('teacher.detail.back')}
            </Button>
          </EmptyState>
        </Card>
      ) : (
        <div>
          <Card>
            <div className="teacher-card__head">
              <span>{paperStatusChip(paper.status)}</span>
              <span className="teacher-list__meta"><Bidi>{currentMarks(paper)} / {paper.targetMarks}</Bidi></span>
            </div>
            <dl className="teacher-facts">
              <div>
                <dt>{t('school.approvals.details.class')}</dt>
                <dd>{classLabel(paper.classId)}</dd>
              </div>
              <div>
                <dt>{t('school.approvals.details.subject')}</dt>
                <dd>{subjectLabel(paper.subjectId, lang)}</dd>
              </div>
              <div>
                <dt>{t('school.approvals.details.examType')}</dt>
                <dd>{t(`examType.${examTypeKey(paper.examType)}`)}</dd>
              </div>
              <div>
                <dt>{t('school.approvals.details.term')}</dt>
                <dd>{t(`term.${paper.term}`)}</dd>
              </div>
              <div>
                <dt>{t('school.approvals.details.examDate')}</dt>
                <dd>{formatDate(paper.examDate, lang)}</dd>
              </div>
              <div>
                <dt>{t('school.approvals.details.medium')}</dt>
                <dd>{t(`medium.${paper.medium}`)}</dd>
              </div>
              <div>
                <dt>{t('school.approvals.details.chapters')}</dt>
                <dd>{paper.chapterIds.map((cid) => chapterLabel(cid, lang)).join(lang === 'ur' ? '، ' : ', ')}</dd>
              </div>
            </dl>
            <div className="teacher__retry teacher-actions">
              {paper.status === 'approved' && (
                <Button variant="primary" onClick={print}>
                  {t('teacher.detail.print')}
                </Button>
              )}
              {(paper.status === 'draft' || paper.status === 'changes-requested') && (
                <>
                  <Button variant="primary" onClick={() => navigate(`/teacher/studio?paper=${paper.id}`)}>
                    {t('teacher.detail.editDraft')}
                  </Button>
                  <Button variant="secondary" onClick={submit}>
                    {t('teacher.detail.submit')}
                  </Button>
                </>
              )}
              <Button variant="secondary" onClick={duplicate}>
                {t('teacher.detail.duplicate')}
              </Button>
              {(paper.status === 'approved' || paper.status === 'printed') && (
                <Button variant="ghost" onClick={archive}>
                  {t('teacher.detail.archive')}
                </Button>
              )}
              <Button variant="ghost" onClick={() => navigate('/teacher/papers')}>
                {t('teacher.detail.back')}
              </Button>
            </div>
          </Card>

          <div className="teacher__section">
            <Tabs
              tabs={[
                { value: 'paper', label: t('teacher.detail.tabs.paper') },
                { value: 'answerKey', label: t('teacher.detail.tabs.answerKey') },
                { value: 'history', label: t('teacher.detail.tabs.history') },
              ]}
              value={tab}
              onChange={setTab}
              ariaLabel={t('teacher.detail.tabs.paper')}
            />
          </div>

          {tab === 'paper' && (
            <div>
              <div className="teacher-filters">
                <div className="teacher-chips" role="group" aria-label={t('teacher.studio.review.previewLanguage')}>
                  {(['en', 'ur'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      className="teacher-chip"
                      aria-pressed={previewMode === m}
                      onClick={() => setPreviewMode(m)}
                    >
                      {m === 'en' ? t('medium.english') : t('medium.urdu')}
                    </button>
                  ))}
                </div>
              </div>
              <SavedPaperPreview
                paper={paper}
                schoolName={school?.name ?? ''}
                mode={previewMode}
                rollNumberLabel={t('teacher.detail.rollNumber')}
              />
            </div>
          )}

          {tab === 'answerKey' && (
            <Card title={t('teacher.detail.answerKeyTitle')}>
              {(paper.questions ?? []).length === 0 ? (
                <p className="teacher-note">{t('teacher.detail.answerKeyEmpty')}</p>
              ) : (
                <ol className="teacher-list">
                  {(paper.questions ?? []).map((q, i) => (
                    <li key={q.id} className="teacher-list__item">
                      <span>
                        <Bidi>{i + 1}. <MathText text={lang === 'ur' ? q.textUr : q.textEn} /></Bidi>
                      </span>
                      <span className="teacher-list__meta">
                        <Bidi><MathText text={lang === 'ur' ? q.answerUr : q.answerEn} /></Bidi>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          )}

          {tab === 'history' && (
            <div className="teacher-grid">
              <Card title={t('teacher.detail.historyTitle')}>
                <Timeline items={timelineItems} ariaLabel={t('teacher.detail.historyTitle')} />
              </Card>
              <Card title={t('teacher.detail.commentsTitle')}>
                {comments.length === 0 ? (
                  <p className="teacher-note">{t('teacher.detail.noComments')}</p>
                ) : (
                  <ul className="teacher-list">
                    {comments.map((c) => (
                      <li key={c.id} className="teacher-list__item">
                        <span><Bidi>{c.actorName}</Bidi></span>
                        <span><Bidi>{c.comment}</Bidi></span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TeacherPaperDetailPage
