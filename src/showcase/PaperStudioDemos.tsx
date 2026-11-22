import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PatternEditor, QuestionRow, ChapterRow, PaperSheet } from '../design-system'
import { SamplePaperContent } from './SamplePaper'
import type { PatternSection } from '../design-system'
import { Demo } from './Demo'
import { PRESETS } from '../design-system'
import { formatDate } from '../utils/date'

export function PaperStudioDemos() {
  const { t } = useTranslation()
  const [sections, setSections] = useState<PatternSection[]>(PRESETS[0].sections.map(s => ({ ...s })))
  const [chapters, setChapters] = useState([
    { id: 'math-algebra', checked: true },
    { id: 'math-geometry', checked: true },
    { id: 'math-numbers', checked: false },
    { id: 'math-statistics', checked: false },
  ])

  const toggleChapter = (id: string) =>
    setChapters(chs => chs.map(c => (c.id === id ? { ...c, checked: !c.checked } : c)))

  const chapterNames: Record<string, string> = {
    'math-algebra': t('copy.paper.chapterAlgebra'),
    'math-geometry': t('copy.paper.chapterGeometry'),
    'math-numbers': t('copy.paper.chapterNumbers'),
    'math-statistics': t('copy.paper.chapterStatistics'),
  }

  const chapterCounts: Record<string, { mcq: number; short: number; long: number }> = {
    'math-algebra': { mcq: 28, short: 14, long: 8 },
    'math-geometry': { mcq: 18, short: 10, long: 5 },
    'math-numbers': { mcq: 24, short: 12, long: 6 },
    'math-statistics': { mcq: 15, short: 8, long: 4 },
  }

  return (
    <>
      <Demo
        id="pattern-editor"
        title={t('copy.paper.titlePattern')}
        note={t('copy.paper.patternNote')}
        states={['default']}
        wide
        render={() => (
          <PatternEditor sections={sections} targetMarks={75} onChange={setSections} />
        )}
      />
      <Demo
        id="chapter-row"
        title={t('copy.paper.titleChapter')}
        states={['default']}
        wide
        render={() => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
            {chapters.map((c, i) => (
              <ChapterRow
                key={c.id}
                checked={c.checked}
                name={chapterNames[c.id]}
                mcqCount={chapterCounts[c.id].mcq}
                shortCount={chapterCounts[c.id].short}
                longCount={chapterCounts[c.id].long}
                coverage={[92, 74, 0, 0][i] ?? 0}
                onToggle={() => toggleChapter(c.id)}
              />
            ))}
          </div>
        )}
      />
      <Demo
        id="question-row"
        title={t('copy.paper.titleQuestion')}
        states={['default']}
        wide
        render={() => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
            <QuestionRow
              type="mcq"
              chapter={chapterNames['math-algebra']}
              marks={1}
              text="Solve the equation 2x + 5 = 13 for x."
              locked
              onToggleLock={() => {}}
              onSwap={() => {}}
              onRemove={() => {}}
            />
            <QuestionRow
              type="short"
              chapter={chapterNames['math-geometry']}
              marks={5}
              text="Prove that the sum of angles in a triangle is 180°."
              onToggleLock={() => {}}
              onSwap={() => {}}
              onRemove={() => {}}
            />
            <QuestionRow
              type="long"
              chapter={chapterNames['math-statistics']}
              marks={10}
              text="Compute the mean, median and mode of the following data…"
              onToggleLock={() => {}}
              onSwap={() => {}}
              onRemove={() => {}}
            />
          </div>
        )}
      />
      <PaperSheetDemo />
    </>
  )
}

function PaperSheetDemo() {
  const { t } = useTranslation()
  return (
    <Demo
      id="paper-sheet"
      title={t('copy.paper.titlePaperSheet')}
      note={t('copy.paper.paperSheetNote')}
      states={['default']}
      wide
      render={() => (
        <div className="ds-paper-grid" style={{ width: '100%' }}>
          <PaperSheet
            mode="en"
            schoolName="Beacon Model School"
            schoolInitials="BM"
            title="Mathematics — Midterm"
            subtitle="Class 9 · First Term"
            meta={[
              { label: 'Class', value: '9' },
              { label: 'Subject', value: 'Mathematics' },
              { label: 'Date', value: formatDate('2026-12-05', 'en') },
              { label: 'Medium', value: 'English' },
            ]}
            marks={75}
            instructions={['Answer all questions. Marks are shown in brackets.']}
            footer={
              <>
                <span>Beacon Model School · Class 9 Mathematics</span>
                <span className="pb-paper__footer-page">Page 1 of 2</span>
              </>
            }
          >
            <SamplePaperContent mode="en" />
          </PaperSheet>

          <PaperSheet
            mode="ur"
            schoolName="نسخہ اسکول"
            schoolInitials="ن"
            title="ریاضی — میڈ ترم"
            subtitle="کلاس 9 · پہلی ترم"
            meta={[
              { label: 'کلاس', value: '9' },
              { label: 'مضمون', value: 'ریاضی' },
              { label: 'تاریخ', value: formatDate('2026-12-05', 'ur') },
              { label: 'زبان', value: 'اردو' },
            ]}
            marks={75}
            instructions={['تمام سوالات کے جوابات دیں۔ مارک برایکٹس میں لکھے ہیں۔']}
            footer={
              <>
                <span>نسخہ اسکول · کلاس 9 ریاضی</span>
                <span className="pb-paper__footer-page">صفحہ 1 از 2</span>
              </>
            }
          >
            <SamplePaperContent mode="ur" />
          </PaperSheet>
        </div>
      )}
    />
  )
}

export default PaperStudioDemos
