import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../shell/PageHeader'
import {
  Banner, BottomSheet, Button, Card, ChapterRow, Dialog, EmptyState, Input,
  MathText, Meter, PatternEditor, QuestionRow, SearchField, Select, Skeleton, Stepper,
  Switch, Textarea, useToast,
} from '../../design-system'
import type { StepperStep } from '../../design-system'
import { PaperService, PlatformService, QuestionBankProvider, SchoolService } from '../../services/mock-store'
import { totalMarks } from '../../services/marks'
import type { BankQuestion, PaperQuestion, PaperSection } from '../../mock/data'
import { Bidi } from '../../utils/bidi'
import { formatDate } from '../../utils/date'
import type { AppLanguage } from '../../i18n'
import {
  autoFillQuestions, emptyDraft, isBlueprintValid, isQuestionsValid, isScopeValid,
  isSetupValid, reviewChecklist, reviewPassed, stepSummary, STUDIO_PRESETS, swapAlternatives,
  toPaperQuestion,
} from '../../services/studio'
import type { StudioDraft } from '../../services/studio'
import {
  chapterLabel, classLabel, demoModeOf, demoTeacher, demoTeacherSchool, paperFileTitle,
  paperHasMath, printWithTitle, shouldOpenPrintDialog, StudioPreview, subjectLabel, useSchoolDemo,
} from './shared'
import '../../styles/teacher.css'

const STEP_IDS = ['setup', 'scope', 'blueprint', 'questions', 'review', 'finish'] as const

const SECTION_TYPE_KEY: Record<'mcq' | 'short' | 'long', string> = {
  mcq: 'copy.paper.optionMcq',
  short: 'copy.paper.optionShort',
  long: 'copy.paper.optionLong',
}

function draftFromPaper(paperId: string, teacherId: string): StudioDraft | null {
  const paper = PaperService.get(paperId)
  if (!paper || paper.teacherId !== teacherId) return null
  if (paper.status !== 'draft' && paper.status !== 'changes-requested') return null
  return {
    classId: paper.classId,
    subjectId: paper.subjectId,
    medium: paper.medium,
    examType: paper.examType,
    term: paper.term,
    examDate: paper.examDate,
    durationMinutes: paper.durationMinutes ?? 150,
    chapterIds: [...paper.chapterIds],
    sections: JSON.parse(JSON.stringify(paper.sections)),
    targetMarks: paper.targetMarks,
    questions: paper.questions ? JSON.parse(JSON.stringify(paper.questions)) : [],
    instructions: paper.instructions ? [...paper.instructions] : [],
    rollNumberBlock: paper.rollNumberBlock ?? true,
    answerKey: paper.answerKey ?? true,
  }
}

/** Paper Studio — Phase 5 (blueprint §6): the signature three-zone
    workspace. Left rail: steps with done/current/blocked status and a
    one-line summary per finished step. Centre: one task per step.
    Right: live A4 preview with the marks meter pinned at its top.
    Autosave after every change, with a visible "Saved · time" stamp. */
export function PaperStudioPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { toast } = useToast()
  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage
  const demoMode = demoModeOf(params.get('demo'))
  const { loading, loadFailed, retry } = useSchoolDemo(demoMode)

  const teacher = demoTeacher()
  const school = demoTeacherSchool()
  const policyOptional = school
    ? (SchoolService.getSettings(school.id)?.approvalPolicy ?? 'required') === 'optional'
    : false

  const [draft, setDraft] = useState<StudioDraft>(() => emptyDraft())
  const [step, setStep] = useState(1)
  const [ready, setReady] = useState(false)
  const [paperId, setPaperId] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [blueprintError, setBlueprintError] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewMode, setPreviewMode] = useState<'en' | 'ur'>(lang)
  const [finished, setFinished] = useState<'submitted' | 'approved' | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualChapter, setManualChapter] = useState('')
  const [manualType, setManualType] = useState<'mcq' | 'short' | 'long'>('mcq')
  const [manualSearch, setManualSearch] = useState('')
  const [swapTarget, setSwapTarget] = useState<PaperQuestion | null>(null)
  const [headerTemplate, setHeaderTemplate] = useState<string | null>(null)
  const [instructionsText, setInstructionsText] = useState('')
  const autosaveTimer = useRef<number | null>(null)
  const loadedRef = useRef(false)

  /* Load an existing draft (?paper=), a personal pattern (?pattern=) or a
     school template (?template=) — once, before autosave starts. */
  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    const paperParam = params.get('paper')
    const patternParam = params.get('pattern')
    const templateParam = params.get('template')
    if (paperParam) {
      const loaded = draftFromPaper(paperParam, teacher.id)
      if (loaded) {
        setDraft(loaded)
        setPaperId(paperParam)
        setSavedAt(new Date().toISOString())
        if (loaded.chapterIds.length > 0) setStep(2)
      } else {
        navigate('/teacher/papers', { replace: true })
        return
      }
    } else if (patternParam) {
      const pattern = PlatformService.listPersonalPatterns(teacher.id).find((p) => p.id === patternParam)
      if (pattern) {
        setDraft((d) => ({ ...d, sections: JSON.parse(JSON.stringify(pattern.sections)), targetMarks: pattern.targetMarks }))
      }
    } else if (templateParam) {
      const tpl = school ? PlatformService.listTemplates(school.id).find((x) => x.id === templateParam) : undefined
      if (tpl) setHeaderTemplate(tpl.name)
    }
    setReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveDraftNow = (d: StudioDraft): string | null => {
    if (!isSetupValid(d)) return paperId
    const input = {
      schoolId: school?.id ?? '',
      teacherId: teacher.id,
      classId: d.classId,
      subjectId: d.subjectId,
      medium: d.medium,
      examType: d.examType,
      term: d.term,
      examDate: d.examDate,
      chapterIds: d.chapterIds,
      targetMarks: d.targetMarks,
      sections: d.sections,
      questions: d.questions,
      instructions: d.instructions,
      durationMinutes: d.durationMinutes,
      rollNumberBlock: d.rollNumberBlock,
      answerKey: d.answerKey,
    }
    if (paperId) {
      const result = PaperService.update(paperId, input, teacher)
      if (result.ok) setSavedAt(new Date().toISOString())
      return paperId
    }
    const result = PaperService.create(input, teacher)
    if (result.ok) {
      setPaperId(result.value.id)
      setSavedAt(new Date().toISOString())
      return result.value.id
    }
    return null
  }

  /* Autosave after every change (debounced): the paper in My papers is
     always the paper on screen. */
  useEffect(() => {
    if (!ready || finished) return
    if (!isSetupValid(draft)) return
    setSaving(true)
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current)
    autosaveTimer.current = window.setTimeout(() => {
      saveDraftNow(draft)
      setSaving(false)
    }, 600)
    return () => {
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, ready, finished])

  const validity = [
    isSetupValid(draft),
    isScopeValid(draft),
    isBlueprintValid(draft),
    isQuestionsValid(draft),
    reviewPassed(draft),
    reviewPassed(draft),
  ]

  const steps: StepperStep[] = STEP_IDS.map((id, i) => ({
    id,
    title: t(`teacher.studio.steps.${id}`),
    summary: stepSummary(draft, i + 1, draft.classId ? classLabel(draft.classId) : '', draft.subjectId ? subjectLabel(draft.subjectId, lang) : ''),
    state: i + 1 < step ? (validity[i] ? 'done' : 'blocked') : i + 1 === step ? 'current' : validity[i] ? 'done' : 'blocked',
  }))

  const goToStep = (n: number) => {
    if (n < 1 || n > 6) return
    setStep(n)
    window.setTimeout(() => document.getElementById('teacher-studio-step-heading')?.focus(), 50)
  }

  const continueStep = () => {
    if (step === 1 && !validity[0]) {
      setSetupError(t('teacher.studio.setup.error'))
      window.setTimeout(() => document.getElementById('studio-class')?.focus(), 50)
      return
    }
    if (step === 3 && !validity[2]) {
      setBlueprintError(t('teacher.studio.blueprint.error'))
      return
    }
    if (step === 6) return
    goToStep(step + 1)
  }

  const chapters = useMemo(
    () => (draft.subjectId ? QuestionBankProvider.getChapters(draft.subjectId) : []),
    [draft.subjectId],
  )
  const [scopeSearch, setScopeSearch] = useState('')
  const scopedChapters = useMemo(() => {
    const q = scopeSearch.trim().toLowerCase()
    if (!q) return chapters
    return chapters.filter((c) => [c.nameEn, c.nameUr].join(' ').toLowerCase().includes(q))
  }, [chapters, scopeSearch])

  const currentMarks = totalMarks(draft.sections)
  const checklist = reviewChecklist(draft)

  const applyPreset = (presetId: string) => {
    const preset = STUDIO_PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    const sections = preset.sections.map((s) => ({ ...s }))
    setDraft((d) => ({ ...d, sections, targetMarks: totalMarks(sections) }))
    setBlueprintError(null)
  }

  const onPatternChange = (sections: PaperSection[]) => {
    setDraft((d) => {
      const merged = sections.map((s) => {
        const prev = d.sections.find((x) => x.id === s.id)
        return { ...s, attemptCount: prev?.attemptCount ?? s.questionCount }
      })
      return { ...d, sections: merged, targetMarks: totalMarks(merged) }
    })
    setBlueprintError(null)
  }

  const autoFillAll = () => {
    setDraft((d) => ({ ...d, questions: autoFillQuestions(d, QuestionBankProvider.listBankQuestions({ subjectId: d.subjectId })) }))
  }

  const autoFillSection = (type: 'mcq' | 'short' | 'long') => {
    setDraft((d) => {
      const lockedOfType = d.questions.filter((q) => q.type === type && q.locked)
      const filled = autoFillQuestions(
        { ...d, questions: lockedOfType, sections: d.sections.filter((s) => s.type === type) },
        QuestionBankProvider.listBankQuestions({ subjectId: d.subjectId }),
      )
      const filledOfType = filled.filter((q) => q.type === type)
      return {
        ...d,
        questions: [...d.questions.filter((q) => q.type !== type), ...filledOfType],
      }
    })
  }

  const toggleLock = (id: string) => {
    setDraft((d) => ({ ...d, questions: d.questions.map((q) => (q.id === id ? { ...q, locked: !q.locked } : q)) }))
  }

  const removeQuestion = (id: string) => {
    setDraft((d) => ({ ...d, questions: d.questions.filter((q) => q.id !== id) }))
  }

  const swapQuestion = (replacement: BankQuestion) => {
    if (!swapTarget) return
    const section = draft.sections.find((s) => s.type === swapTarget.type)
    setDraft((d) => ({
      ...d,
      questions: d.questions.map((q) => (q.id === swapTarget.id ? { ...toPaperQuestion(replacement, section?.marksPerQuestion ?? q.marks), locked: q.locked } : q)),
    }))
    setSwapTarget(null)
  }

  const addManual = (bank: BankQuestion) => {
    const section = draft.sections.find((s) => s.type === bank.type)
    if (!section) return
    setDraft((d) => {
      if (d.questions.some((q) => q.bankId === bank.id)) return d
      const have = d.questions.filter((q) => q.type === bank.type).length
      if (have >= section.questionCount) return d
      return { ...d, questions: [...d.questions, toPaperQuestion(bank, section.marksPerQuestion)] }
    })
  }

  const manualPool = useMemo(() => {
    if (!manualOpen || !manualChapter) return []
    const q = manualSearch.trim().toLowerCase()
    return QuestionBankProvider.listBankQuestions({ chapterId: manualChapter, type: manualType })
      .filter((b) => !q || [b.textEn, b.textUr].join(' ').toLowerCase().includes(q))
      .slice(0, 10)
  }, [manualOpen, manualChapter, manualType, manualSearch])

  const swapPool = useMemo(() => {
    if (!swapTarget) return []
    const used = draft.questions.map((q) => q.bankId ?? q.id)
    return swapAlternatives(swapTarget, QuestionBankProvider.listBankQuestions({ subjectId: draft.subjectId }), used)
  }, [swapTarget, draft.questions, draft.subjectId])

  const submitPaper = () => {
    const id = saveDraftNow(draft)
    if (!id) return
    if (policyOptional) {
      const result = PaperService.transition(id, 'approved', teacher)
      if (!result.ok) {
        toast({ variant: 'error', message: result.error })
        return
      }
      setFinished('approved')
      toast({ variant: 'success', message: t('teacher.studio.toasts.approved') })
    } else {
      const result = PaperService.transition(id, 'submitted', teacher)
      if (!result.ok) {
        toast({ variant: 'error', message: result.error })
        return
      }
      setFinished('submitted')
      toast({ variant: 'success', message: t('teacher.studio.toasts.submitted') })
    }
  }

  const printPaper = () => {
    if (!paperId) return
    const paper = PaperService.get(paperId)
    if (!paper || paper.status !== 'approved') {
      toast({ variant: 'error', message: t('teacher.studio.finish.printFirst') })
      return
    }
    const result = PaperService.transition(paperId, 'printed', teacher)
    if (!result.ok) {
      toast({ variant: 'error', message: result.error })
      return
    }
    if (shouldOpenPrintDialog()) printWithTitle(paperFileTitle({
      className: classLabel(paper.classId),
      subjectName: subjectLabel(paper.subjectId, 'en'),
      examType: t(`examType.${paper.examType === 'board-pattern' ? 'boardPattern' : paper.examType === 'chapter-test' ? 'chapterTest' : paper.examType}`),
      schoolName: school?.name ?? '',
    }), paperHasMath(paper.questions ?? []))
    toast({ variant: 'success', message: t('teacher.studio.toasts.printed') })
  }

  const saveDraftClick = () => {
    saveDraftNow(draft)
    toast({ variant: 'success', message: t('teacher.studio.toasts.saved') })
  }

  const previewData = {
    title: draft.subjectId && draft.classId
      ? `${subjectLabel(draft.subjectId, 'en')} — ${t(`term.${draft.term}`)} (${classLabel(draft.classId)})`
      : '',
    classId: draft.classId,
    subjectId: draft.subjectId,
    medium: draft.medium,
    examDate: draft.examDate,
    durationMinutes: draft.durationMinutes,
    targetMarks: draft.targetMarks,
    sections: draft.sections,
    questions: draft.questions,
    instructions: draft.instructions,
    rollNumberBlock: draft.rollNumberBlock,
  }

  const savedLabel = saving
    ? t('teacher.studio.saving')
    : savedAt
      ? `${t('teacher.studio.saved')} · ${formatDate(savedAt, lang)} ${new Date(savedAt).toTimeString().slice(0, 5)}`
      : ''

  return (
    <div className="teacher">
      <PageHeader title={t('teacher.studio.title')} lead={t('teacher.studio.lead')} />

      {loading ? (
        <div className="teacher__skeleton" aria-label={t('common.loading')} role="status">
          <Skeleton variant="rect" height={48} />
          <Skeleton variant="rect" height={220} />
        </div>
      ) : loadFailed ? (
        <div>
          <Banner variant="error" title={t('teacher.dashboard.error.title')}>
            {t('teacher.dashboard.error.body')}
          </Banner>
          <div className="teacher__retry">
            <Button variant="primary" onClick={retry}>
              {t('common.retry')}
            </Button>
          </div>
        </div>
      ) : finished ? (
        <Card>
          <div className="teacher-studio__done">
            <h2>{t(finished === 'approved' ? 'teacher.studio.finish.approvedTitle' : 'teacher.studio.finish.submittedTitle')}</h2>
            <p className="teacher-note">{t(finished === 'approved' ? 'teacher.studio.finish.approvedBody' : 'teacher.studio.finish.submittedBody')}</p>
            <div className="teacher-actions">
              {paperId && (
                <Button variant="primary" onClick={() => navigate(`/teacher/papers/${paperId}`)}>
                  {t('teacher.studio.viewPaper')}
                </Button>
              )}
              <Button variant="secondary" onClick={() => navigate('/teacher/papers')}>
                {t('teacher.papers.title')}
              </Button>
              <Button variant="ghost" onClick={() => window.location.assign('/teacher/studio')}>
                {t('teacher.dashboard.startNew')}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="teacher-studio">
          <aside className="teacher-studio__rail" aria-label={t('teacher.studio.title')}>
            <Stepper
              steps={steps}
              onStepClick={(id) => {
                const idx = STEP_IDS.indexOf(id as (typeof STEP_IDS)[number])
                if (idx >= 0 && (idx + 1 <= step || validity[idx])) goToStep(idx + 1)
              }}
              ariaLabel={t('teacher.studio.title')}
            />
          </aside>

          <div className="teacher-studio__work">
            <div className="teacher-studio__step-head">
              <h2 id="teacher-studio-step-heading" tabIndex={-1}>
                {t(`teacher.studio.steps.${STEP_IDS[step - 1]}`)}
              </h2>
              <span><Bidi>{t('teacher.studio.stepOf', { current: step })}</Bidi></span>
            </div>

            {step === 1 && (
              <Card title={t('teacher.studio.setup.title')}>
                <div className="teacher-studio__fields">
                  <Select
                    id="studio-class"
                    label={t('teacher.studio.setup.classLabel')}
                    value={draft.classId}
                    onChange={(e) => {
                      setDraft((d) => ({ ...d, classId: e.target.value }))
                      setSetupError(null)
                    }}
                    required
                    options={[
                      { value: '', label: t('teacher.studio.setup.classPlaceholder') },
                      ...teacher.classes.map((c) => ({ value: c, label: classLabel(c) })),
                    ]}
                  />
                  <Select
                    id="studio-subject"
                    label={t('teacher.studio.setup.subjectLabel')}
                    value={draft.subjectId}
                    onChange={(e) => {
                      const subjectId = e.target.value
                      setDraft((d) => ({ ...d, subjectId, chapterIds: [], questions: [] }))
                      setSetupError(null)
                    }}
                    required
                    options={[
                      { value: '', label: t('teacher.studio.setup.subjectPlaceholder') },
                      ...teacher.subjects.map((s) => ({ value: s, label: subjectLabel(s, lang) })),
                    ]}
                  />
                  <Select
                    label={t('teacher.studio.setup.mediumLabel')}
                    value={draft.medium}
                    onChange={(e) => setDraft((d) => ({ ...d, medium: e.target.value as StudioDraft['medium'] }))}
                    options={(['english', 'urdu', 'both'] as const).map((m) => ({ value: m, label: t(`medium.${m}`) }))}
                  />
                  <Select
                    label={t('teacher.studio.setup.examTypeLabel')}
                    value={draft.examType}
                    onChange={(e) => setDraft((d) => ({ ...d, examType: e.target.value as StudioDraft['examType'] }))}
                    options={(['monthly', 'midterm', 'board-pattern', 'chapter-test'] as const).map((m) => ({
                      value: m,
                      label: t(`examType.${m === 'board-pattern' ? 'boardPattern' : m === 'chapter-test' ? 'chapterTest' : m}`),
                    }))}
                  />
                  <Select
                    label={t('teacher.studio.setup.termLabel')}
                    value={draft.term}
                    onChange={(e) => setDraft((d) => ({ ...d, term: e.target.value as StudioDraft['term'] }))}
                    options={(['first', 'second', 'third'] as const).map((m) => ({ value: m, label: t(`term.${m}`) }))}
                  />
                  <Input
                    id="studio-exam-date"
                    label={t('teacher.studio.setup.examDateLabel')}
                    type="date"
                    value={draft.examDate}
                    onChange={(e) => {
                      setDraft((d) => ({ ...d, examDate: e.target.value }))
                      setSetupError(null)
                    }}
                    required
                  />
                  <Select
                    label={t('teacher.studio.setup.durationLabel')}
                    value={String(draft.durationMinutes)}
                    onChange={(e) => setDraft((d) => ({ ...d, durationMinutes: Number(e.target.value) }))}
                    options={[60, 90, 120, 150, 180].map((m) => ({ value: String(m), label: `${m} ${t('teacher.studio.setup.durationUnit')}` }))}
                  />
                </div>
                {setupError && <p role="alert" className="teacher-note">{setupError}</p>}
              </Card>
            )}

            {step === 2 && (
              <Card title={t('teacher.studio.scope.title')}>
                <div className="teacher-flow">
                  <SearchField
                    value={scopeSearch}
                    onChange={setScopeSearch}
                    placeholder={t('teacher.studio.scope.searchPlaceholder')}
                    ariaLabel={t('teacher.studio.scope.searchPlaceholder')}
                  />
                  <div className="teacher-actions">
                    <Button
                      variant="secondary"
                      onClick={() => setDraft((d) => ({ ...d, chapterIds: chapters.map((c) => c.id) }))}
                    >
                      {t('teacher.studio.scope.selectAll')}
                    </Button>
                    <Button variant="ghost" onClick={() => setDraft((d) => ({ ...d, chapterIds: [] }))}>
                      {t('teacher.studio.scope.deselectAll')}
                    </Button>
                    <span className="teacher-list__meta">
                      <Bidi>{t('teacher.studio.scope.chaptersCount', { count: draft.chapterIds.length })}</Bidi>
                    </span>
                  </div>
                  <div className="teacher-studio__chapters">
                    {scopedChapters.map((c) => (
                      <ChapterRow
                        key={c.id}
                        checked={draft.chapterIds.includes(c.id)}
                        name={chapterLabel(c.id, lang)}
                        mcqCount={c.counts.mcq}
                        shortCount={c.counts.short}
                        longCount={c.counts.long}
                        coverage={draft.chapterIds.includes(c.id) ? 100 : 0}
                        onToggle={() => setDraft((d) => ({
                          ...d,
                          chapterIds: d.chapterIds.includes(c.id)
                            ? d.chapterIds.filter((x) => x !== c.id)
                            : [...d.chapterIds, c.id],
                        }))}
                      />
                    ))}
                    {scopedChapters.length === 0 && (
                      <EmptyState title={t('teacher.questions.emptyTitle')} body={t('teacher.studio.scope.searchPlaceholder')} />
                    )}
                  </div>
                </div>
              </Card>
            )}

            {step === 3 && (
              <Card title={t('teacher.studio.blueprint.title')}>
                <div className="teacher-flow">
                  <div>
                    <p className="teacher-note">{t('teacher.studio.blueprint.presetLabel')}</p>
                    <div className="teacher-chips" role="group" aria-label={t('teacher.studio.blueprint.presetLabel')}>
                      {STUDIO_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="teacher-chip"
                          aria-pressed={draft.targetMarks === totalMarks(p.sections) && draft.sections.length === p.sections.length}
                          onClick={() => applyPreset(p.id)}
                        >
                          {t(`copy.paper.${p.id === 'board-75' ? 'presetBoard75' : p.id === 'half-book' ? 'presetHalfBook' : 'presetChapterTest'}`)}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="teacher-chip"
                        aria-pressed={draft.targetMarks > 0 && !STUDIO_PRESETS.some((p) => totalMarks(p.sections) === draft.targetMarks)}
                        onClick={() => {
                          setDraft((d) => d.sections.length > 0 ? d : {
                            ...d,
                            sections: [{ id: 'sec-mcq', type: 'mcq', marksPerQuestion: 1, questionCount: 10, attemptCount: 10 }],
                            targetMarks: 10,
                          })
                        }}
                      >
                        {t('teacher.studio.blueprint.customLabel')}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="teacher-note">{t('teacher.studio.blueprint.sectionsTitle')}</p>
                    {/*
                      PatternEditor presets hidden here (Phase 7): the Studio
                      chips above are the single preset control. Showing both
                      put "Board 75" on screen twice, and the two copies
                      disagreed — PatternEditor presets carry no attemptCount,
                      so its Board 75 silently dropped the 2-of-3 longs rule.
                      PatternEditor here only edits marks per question.
                    */}
                    <PatternEditor sections={draft.sections} targetMarks={draft.targetMarks} onChange={onPatternChange} presets={[]} />
                  </div>
                  {draft.sections.length > 0 && (
                    <div>
                      <p className="teacher-note">{t('teacher.studio.blueprint.attemptHint')}</p>
                      {draft.sections.map((s) => (
                        <div key={s.id} className="teacher-studio__section-head">
                          <span>{t(SECTION_TYPE_KEY[s.type])}</span>
                          <Select
                            label={t('teacher.studio.blueprint.attemptLabel')}
                            aria-label={`${t('teacher.studio.blueprint.attemptLabel')} — ${t(SECTION_TYPE_KEY[s.type])}`}
                            value={String(s.attemptCount ?? s.questionCount)}
                            onChange={(e) => setDraft((d) => ({
                              ...d,
                              sections: d.sections.map((x) => (x.id === s.id ? { ...x, attemptCount: Number(e.target.value) } : x)),
                            }))}
                            options={Array.from({ length: s.questionCount }, (_, i) => i + 1).map((n) => ({
                              value: String(n),
                              label: n === s.questionCount ? t('teacher.papers.filters.all') : `${n}`,
                            }))}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {blueprintError && <p role="alert" className="teacher-note">{blueprintError}</p>}
                </div>
              </Card>
            )}

            {step === 4 && (
              <div className="teacher-flow">
                <Card title={t('teacher.studio.questions.title')}>
                  <div className="teacher-actions">
                    <Button variant="primary" onClick={autoFillAll}>
                      {t('teacher.studio.questions.autoFillAll')}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setManualChapter(draft.chapterIds[0] ?? '')
                        setManualSearch('')
                        setManualOpen(true)
                      }}
                    >
                      {t('teacher.studio.questions.manualAdd')}
                    </Button>
                    <span className="teacher-list__meta">
                      <Bidi>{t('teacher.studio.questions.count', { count: draft.questions.length })}</Bidi>
                    </span>
                  </div>
                </Card>
                {draft.questions.length === 0 && (
                  <Card>
                    <EmptyState title={t('teacher.studio.questions.emptyTitle')} body={t('teacher.studio.questions.emptyBody')} />
                  </Card>
                )}
                {draft.sections.map((section) => {
                  const qs = draft.questions.filter((q) => q.type === section.type)
                  return (
                    <Card key={section.id}>
                      <div className="teacher-studio__section-head">
                        <h3>{t(SECTION_TYPE_KEY[section.type])} — <Bidi>{qs.length} / {section.questionCount}</Bidi></h3>
                        <Button variant="secondary" onClick={() => autoFillSection(section.type)}>
                          {t('teacher.studio.questions.autoFillSection')}
                        </Button>
                      </div>
                      <div className="teacher-studio__question-list">
                        {qs.map((q) => (
                          <QuestionRow
                            key={q.id}
                            type={q.type}
                            chapter={chapterLabel(q.chapterId, lang)}
                            marks={q.marks}
                            text={lang === 'ur' ? q.textUr : q.textEn}
                            locked={q.locked}
                            onToggleLock={() => toggleLock(q.id)}
                            onSwap={() => setSwapTarget(q)}
                            onRemove={() => removeQuestion(q.id)}
                          />
                        ))}
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}

            {step === 5 && (
              <div className="teacher-flow">
                <Card title={t('teacher.studio.review.checklistTitle')}>
                  <p className="teacher-note">
                    {reviewPassed(draft) ? t('teacher.studio.review.allGood') : t('teacher.studio.review.notReady')}
                  </p>
                  <ul className="teacher-checklist">
                    {checklist.map((item) => (
                      <li key={item.key} className={`teacher-checklist__row teacher-checklist__row--${item.state === 'met' ? 'met' : 'not-met'}`}>
                        <span>{t(`teacher.studio.review.checklist.${item.key}`)}</span>
                        <span>{t(`school.approvals.checklist.${item.state === 'met' ? 'met' : 'notMet'}`)}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
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
                <StudioPreview
                  data={previewData}
                  schoolName={school?.name ?? ''}
                  previewMode={previewMode}
                  rollNumberLabel={t('teacher.detail.rollNumber')}
                />
              </div>
            )}

            {step === 6 && (
              <Card title={t('teacher.studio.finish.title')}>
                <div className="teacher-flow">
                  <dl className="teacher-facts">
                    <div>
                      <dt>{t('teacher.studio.finish.headerTitle')}</dt>
                      <dd><Bidi>{school?.name ?? ''}{headerTemplate ? ` — ${headerTemplate}` : ''}</Bidi></dd>
                    </div>
                    <div>
                      <dt>{t('common.marks')}</dt>
                      <dd><Bidi>{currentMarks} / {draft.targetMarks}</Bidi></dd>
                    </div>
                    <div>
                      <dt>{t('teacher.studio.finish.answerKeyTitle')}</dt>
                      <dd>{draft.answerKey ? t('school.approvals.checklist.met') : t('school.approvals.checklist.notMet')}</dd>
                    </div>
                  </dl>
                  <Textarea
                    label={t('teacher.studio.finish.instructionsLabel')}
                    value={instructionsText}
                    onChange={(e) => {
                      setInstructionsText(e.target.value)
                      setDraft((d) => ({ ...d, instructions: e.target.value.split('\n').filter(Boolean) }))
                    }}
                    placeholder={t('teacher.studio.finish.instructionsPlaceholder')}
                    rows={3}
                  />
                  <Switch
                    label={t('teacher.studio.finish.rollNumberLabel')}
                    checked={draft.rollNumberBlock}
                    onChange={(v) => setDraft((d) => ({ ...d, rollNumberBlock: v }))}
                  />
                  <Switch
                    label={t('teacher.studio.finish.answerKeyLabel')}
                    checked={draft.answerKey}
                    onChange={(v) => setDraft((d) => ({ ...d, answerKey: v }))}
                  />
                  <div className="teacher-actions">
                    <Button
                      variant="primary"
                      onClick={submitPaper}
                      disabled={!reviewPassed(draft)}
                    >
                      {policyOptional ? t('teacher.studio.finish.submitDirect') : t('teacher.studio.finish.submit')}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        saveDraftClick()
                        if (shouldOpenPrintDialog()) printWithTitle(paperFileTitle({
                          className: classLabel(draft.classId),
                          subjectName: subjectLabel(draft.subjectId, 'en'),
                          examType: t(`examType.${draft.examType === 'board-pattern' ? 'boardPattern' : draft.examType === 'chapter-test' ? 'chapterTest' : draft.examType}`),
                          schoolName: school?.name ?? '',
                        }), paperHasMath(draft.questions))
                      }}
                    >
                      {t('teacher.studio.finish.download')}
                    </Button>
                    <Button variant="secondary" onClick={printPaper}>
                      {t('teacher.studio.finish.print')}
                    </Button>
                    <Button variant="ghost" onClick={saveDraftClick}>
                      {t('teacher.studio.finish.saveDraft')}
                    </Button>
                  </div>
                  <p className="teacher-note">{t('teacher.studio.finish.printFirst')}</p>
                  <p className="teacher-note">{t('teacher.studio.finish.downloadHint')}</p>
                </div>
              </Card>
            )}

            <div className="teacher-studio__actions">
              {step > 1 && (
                <Button variant="secondary" onClick={() => goToStep(step - 1)}>
                  {t('teacher.studio.back')}
                </Button>
              )}
              {step < 6 && (
                <Button variant="primary" onClick={continueStep}>
                  {t('teacher.studio.continue')}
                </Button>
              )}
              <Button variant="ghost" onClick={saveDraftClick}>
                {t('teacher.studio.saveDraft')}
              </Button>
              <Button
                variant="secondary"
                className="teacher-studio__preview-btn"
                onClick={() => setPreviewOpen(true)}
              >
                {t('teacher.studio.previewButton')}
              </Button>
              {savedLabel && (
                <span className="teacher-studio__saved" role="status">
                  <Bidi>{savedLabel}</Bidi>
                </span>
              )}
            </div>
          </div>

          <aside className="teacher-studio__preview" aria-label={t('teacher.studio.preview')}>
            <div className="teacher-studio__preview-head">
              <h2>{t('teacher.studio.preview')}</h2>
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
            <Meter target={draft.targetMarks} current={currentMarks} label={t('common.marks')} />
            <StudioPreview
              data={previewData}
              schoolName={school?.name ?? ''}
              previewMode={previewMode}
              rollNumberLabel={t('teacher.detail.rollNumber')}
            />
          </aside>
        </div>
      )}

      <BottomSheet
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={t('teacher.studio.preview')}
        ariaLabel={t('teacher.studio.preview')}
      >
        <div className="teacher-flow">
          <Meter target={draft.targetMarks} current={currentMarks} label={t('common.marks')} />
          <StudioPreview
            data={previewData}
            schoolName={school?.name ?? ''}
            previewMode={previewMode}
            rollNumberLabel={t('teacher.detail.rollNumber')}
          />
        </div>
      </BottomSheet>

      <Dialog
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        title={t('teacher.studio.questions.manualTitle')}
        size="lg"
        footer={(
          <Button variant="ghost" onClick={() => setManualOpen(false)}>
            {t('common.close')}
          </Button>
        )}
      >
        <div className="teacher-flow">
          <div className="teacher-studio__fields">
            <Select
              label={t('school.approvals.details.chapters')}
              value={manualChapter}
              onChange={(e) => setManualChapter(e.target.value)}
              options={draft.chapterIds.map((c) => ({ value: c, label: chapterLabel(c, lang) }))}
            />
            <Select
              label={t('common.type')}
              value={manualType}
              onChange={(e) => setManualType(e.target.value as 'mcq' | 'short' | 'long')}
              options={(['mcq', 'short', 'long'] as const).map((m) => ({ value: m, label: t(SECTION_TYPE_KEY[m]) }))}
            />
          </div>
          <SearchField
            value={manualSearch}
            onChange={setManualSearch}
            placeholder={t('teacher.studio.questions.manualSearch')}
            ariaLabel={t('teacher.studio.questions.manualSearch')}
          />
          <div className="teacher-studio__swap-list">
            {manualPool.length === 0 && <p className="teacher-note">{t('teacher.studio.questions.manualEmpty')}</p>}
            {manualPool.map((b) => (
              <div key={b.id} className="teacher-studio__swap-item">
                <span><Bidi><MathText text={lang === 'ur' ? b.textUr : b.textEn} /></Bidi></span>
                <div className="teacher-actions">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      addManual(b)
                      toast({ variant: 'success', message: t('teacher.studio.questions.savedQuestion') })
                    }}
                  >
                    {t('common.add')}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const r = PlatformService.addSavedQuestion(teacher.id, b.id)
                      if (r.ok) toast({ variant: 'success', message: t('teacher.studio.questions.savedQuestion') })
                    }}
                  >
                    {t('teacher.studio.questions.saveQuestion')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Dialog>

      <Dialog
        open={swapTarget !== null}
        onClose={() => setSwapTarget(null)}
        title={t('teacher.studio.questions.swapTitle')}
        size="lg"
        footer={(
          <Button variant="ghost" onClick={() => setSwapTarget(null)}>
            {t('common.close')}
          </Button>
        )}
      >
        <div className="teacher-studio__swap-list">
          {swapPool.length === 0 && <p className="teacher-note">{t('teacher.studio.questions.swapEmpty')}</p>}
          {swapPool.map((b) => (
            <div key={b.id} className="teacher-studio__swap-item">
              <span><Bidi><MathText text={lang === 'ur' ? b.textUr : b.textEn} /></Bidi></span>
              <Button variant="secondary" onClick={() => swapQuestion(b)}>
                {t('common.add')}
              </Button>
            </div>
          ))}
        </div>
      </Dialog>
    </div>
  )
}

export default PaperStudioPage
