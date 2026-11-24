import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { Meter, getMeterState } from './Meter'
import { totalMarks } from '../services/marks'
import Bidi from '../utils/bidi'

export type SectionType = 'mcq' | 'short' | 'long'

export interface PatternSection {
  id: string
  type: SectionType
  marksPerQuestion: number
  questionCount: number
}

export interface PatternPreset {
  id: string
  name: string
  sections: PatternSection[]
}

// Preset names remain as-is (sample data / proper nouns); the meter label,
// group labels and per-section labels are translated.
export const PRESETS: PatternPreset[] = [
  {
    id: 'board-75',
    name: 'Board 75',
    sections: [
      { id: 'sec-mcq', type: 'mcq', marksPerQuestion: 1, questionCount: 15 },
      { id: 'sec-short', type: 'short', marksPerQuestion: 5, questionCount: 6 },
      { id: 'sec-long', type: 'long', marksPerQuestion: 10, questionCount: 3 },
    ],
  },
  {
    id: 'half-book',
    name: 'Half-book 40',
    sections: [
      { id: 'sec-mcq', type: 'mcq', marksPerQuestion: 1, questionCount: 10 },
      { id: 'sec-short', type: 'short', marksPerQuestion: 5, questionCount: 4 },
      { id: 'sec-long', type: 'long', marksPerQuestion: 10, questionCount: 1 },
    ],
  },
  {
    id: 'chapter-test',
    name: 'Chapter test 30',
    sections: [
      { id: 'sec-mcq', type: 'mcq', marksPerQuestion: 1, questionCount: 10 },
      { id: 'sec-short', type: 'short', marksPerQuestion: 5, questionCount: 2 },
      { id: 'sec-long', type: 'long', marksPerQuestion: 10, questionCount: 1 },
    ],
  },
]

export interface PatternEditorProps {
  sections: PatternSection[]
  targetMarks: number
  onChange: (sections: PatternSection[]) => void
  presets?: PatternPreset[]
}

function sectionsEqual(a: PatternSection[], b: PatternSection[]) {
  if (a.length !== b.length) return false
  return a.every((s, i) => {
    const other = b[i]
    return s.type === other.type && s.marksPerQuestion === other.marksPerQuestion && s.questionCount === other.questionCount
  })
}

const PRESET_NAME_KEY: Record<string, string> = {
  'board-75': 'copy.paper.presetBoard75',
  'half-book': 'copy.paper.presetHalfBook',
  'chapter-test': 'copy.paper.presetChapterTest',
}

export function PatternEditor({ sections, targetMarks, onChange, presets = PRESETS }: PatternEditorProps) {
  const { t } = useTranslation()
  const currentMarks = useMemo(() => totalMarks(sections), [sections])
  const activePresetId = useMemo(() => {
    const found = presets.find(p => sectionsEqual(p.sections, sections))
    return found?.id ?? null
  }, [sections, presets])

  const updateSection = (id: string, patch: Partial<PatternSection>) => {
    onChange(sections.map(s => (s.id === id ? { ...s, ...patch } : s)))
  }

  const removeSection = (id: string) => {
    onChange(sections.filter(s => s.id !== id))
  }

  const addSection = () => {
    onChange([
      ...sections,
      { id: `sec-${Date.now().toString(36)}`, type: 'short', marksPerQuestion: 4, questionCount: 2 },
    ])
  }

  const applyPreset = (preset: PatternPreset) => {
    onChange(preset.sections.map(s => ({ ...s })))
  }

  const state = getMeterState(targetMarks, currentMarks)
  const marksMismatch = currentMarks !== targetMarks

  return (
    <div className="pb-pattern">
      <Meter target={targetMarks} current={currentMarks} label={t('copy.paper.meterLabel')} />

      {/* Announced validation error: the meter status text alone is
          colour + short copy, not an error a screen reader (or a
          sighted teacher scanning quickly) can act on. */}
      {marksMismatch && (
        <p className="pb-error-text" role="alert">
          {t('copy.paper.marksMismatch', { current: currentMarks, target: targetMarks })}
        </p>
      )}

      {presets.length > 0 && (
        <div className="pb-pattern__presets" role="group" aria-label={t('copy.paper.presetsAria')}>
          {presets.map(p => (
            <button
              key={p.id}
              type="button"
              className="pb-pattern__preset"
              aria-pressed={activePresetId === p.id}
              onClick={() => applyPreset(p)}
            >
              {t(PRESET_NAME_KEY[p.id] ?? p.id, { defaultValue: p.name })}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sections.length === 0 && (
          <p className="pb-empty__body" style={{ textAlign: 'center', padding: '12px 0' }}>
            {t('copy.paper.patternEmpty')}
          </p>
        )}
        {sections.map(section => (
          <div key={section.id} className="pb-pattern__section">
            <select
              className="pb-pattern__select"
              aria-label={t('copy.paper.sectionType')}
              value={section.type}
              onChange={e => updateSection(section.id, { type: e.target.value as SectionType })}
            >
              <option value="mcq">{t('copy.paper.optionMcq')}</option>
              <option value="short">{t('copy.paper.optionShort')}</option>
              <option value="long">{t('copy.paper.optionLong')}</option>
            </select>
            <div className="pb-pattern__field">
              <label htmlFor={`${section.id}-marks`}>{t('copy.paper.marksPerQ')}</label>
              <input
                id={`${section.id}-marks`}
                className="pb-pattern__input"
                type="number"
                min={1}
                max={20}
                value={section.marksPerQuestion}
                onChange={e => updateSection(section.id, { marksPerQuestion: Math.max(1, Number(e.target.value) || 1) })}
              />
            </div>
            <div className="pb-pattern__field">
              <label htmlFor={`${section.id}-count`}>{t('copy.paper.questionsLabel')}</label>
              <input
                id={`${section.id}-count`}
                className="pb-pattern__input"
                type="number"
                min={0}
                max={40}
                value={section.questionCount}
                onChange={e => updateSection(section.id, { questionCount: Math.max(0, Number(e.target.value) || 0) })}
              />
            </div>
            <span className="pb-pattern__section-total" aria-label={t('copy.paper.sectionTotalLabel', { total: section.marksPerQuestion * section.questionCount })}>
              <Bidi>{section.marksPerQuestion * section.questionCount}</Bidi>
            </span>
            <button
              type="button"
              className="pb-icon-btn pb-icon-btn--sm pb-icon-btn--danger"
              aria-label={t('copy.paper.removeSectionAria')}
              onClick={() => removeSection(section.id)}
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      <button type="button" className="pb-btn pb-btn--secondary" onClick={addSection}>
        <Plus size={16} aria-hidden="true" />
        {t('common.addSection')}
      </button>

      <div className="pb-pattern__total">
        <span>{t('copy.paper.totalMarksLabel')}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 600, color: 'var(--muted)', fontSize: 12 }}><Bidi>{t('copy.paper.targetLabel')}: {targetMarks}</Bidi></span>
          <span style={{ color: state === 'met' || state === 'under' ? 'var(--ink-900)' : 'var(--pen-600)' }}><Bidi>{currentMarks}</Bidi></span>
        </span>
      </div>
    </div>
  )
}

export default PatternEditor
