// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, tx } from './test-utils'
import { PatternEditor, type PatternSection, type PatternPreset } from './PatternEditor'

// Sections chosen so every total is a distinctive number:
// MCQ 3 x 7 = 21, Short 5 x 2 = 10, together 31 of a 75 target.
const sections: PatternSection[] = [
  { id: 'sec-mcq', type: 'mcq', marksPerQuestion: 3, questionCount: 7 },
  { id: 'sec-short', type: 'short', marksPerQuestion: 5, questionCount: 2 },
]

const customPresets: PatternPreset[] = [
  {
    id: 'mini',
    name: 'Mini 31',
    sections: sections.map((s) => ({ ...s })),
  },
  {
    id: 'big',
    name: 'Big 80',
    sections: [
      { id: 'sec-mcq', type: 'mcq', marksPerQuestion: 1, questionCount: 20 },
      { id: 'sec-short', type: 'short', marksPerQuestion: 5, questionCount: 12 },
    ],
  },
]

function renderEditor(props: Partial<Parameters<typeof PatternEditor>[0]> = {}) {
  const onChange = vi.fn()
  const utils = render(
    <PatternEditor
      sections={sections}
      targetMarks={75}
      onChange={onChange}
      presets={customPresets}
      {...props}
    />,
  )
  return { ...utils, onChange }
}

describe('PatternEditor presets', () => {
  it('renders one button per preset', () => {
    renderEditor()
    expect(screen.getByRole('button', { name: 'Mini 31' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Big 80' })).toBeTruthy()
  })

  it('applies the clicked preset by reporting its sections through onChange', () => {
    const { onChange } = renderEditor()
    fireEvent.click(screen.getByRole('button', { name: 'Big 80' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(customPresets[1].sections)
  })

  it('marks the preset matching the current sections as pressed, and the others as not pressed', () => {
    renderEditor()
    expect(screen.getByRole('button', { name: 'Mini 31' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Big 80' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('marks no preset as pressed when the sections match no preset', () => {
    renderEditor({
      sections: [{ id: 'sec-mcq', type: 'mcq', marksPerQuestion: 2, questionCount: 3 }],
    })
    expect(screen.getByRole('button', { name: 'Mini 31' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: 'Big 80' }).getAttribute('aria-pressed')).toBe('false')
  })
})

describe('PatternEditor marks totals', () => {
  it('shows the current total against the target in the meter', () => {
    renderEditor()
    const meter = screen.getByRole('progressbar', { name: tx('copy.paper.meterLabel') })
    expect(meter.getAttribute('aria-valuetext')).toBe('31 / 75')
    expect(meter.getAttribute('aria-valuemax')).toBe('75')
  })

  it('shows each section total next to its inputs', () => {
    renderEditor()
    expect(screen.getByText('21')).toBeTruthy()
    expect(screen.getByText('10')).toBeTruthy()
  })

  it('shows the under-target meter state while the total is below 80% of target', () => {
    renderEditor()
    expect(screen.getByText(tx('meter.under'))).toBeTruthy()
  })

  it('shows the over-target meter state when the sections exceed the target', () => {
    renderEditor({ sections: customPresets[1].sections })
    const meter = screen.getByRole('progressbar', { name: tx('copy.paper.meterLabel') })
    expect(meter.getAttribute('aria-valuetext')).toBe('80 / 75')
    expect(screen.getByText(tx('meter.over'))).toBeTruthy()
  })
})

describe('PatternEditor section editing', () => {
  it('reports the new type when the section-type select changes', () => {
    const { onChange } = renderEditor()
    const selects = screen.getAllByLabelText(tx('copy.paper.sectionType'))
    fireEvent.change(selects[0], { target: { value: 'long' } })
    expect(onChange).toHaveBeenCalledWith([
      { ...sections[0], type: 'long' },
      sections[1],
    ])
  })

  it('reports the new marks value when the marks input changes', () => {
    const { onChange } = renderEditor()
    const marksInputs = screen.getAllByLabelText(tx('copy.paper.marksPerQ'))
    fireEvent.change(marksInputs[0], { target: { value: '4' } })
    expect(onChange).toHaveBeenCalledWith([
      { ...sections[0], marksPerQuestion: 4 },
      sections[1],
    ])
  })

  it('clamps marks per question to a minimum of 1 instead of accepting 0', () => {
    const { onChange } = renderEditor()
    const marksInputs = screen.getAllByLabelText(tx('copy.paper.marksPerQ'))
    fireEvent.change(marksInputs[0], { target: { value: '0' } })
    expect(onChange).toHaveBeenCalledWith([
      { ...sections[0], marksPerQuestion: 1 },
      sections[1],
    ])
  })

  it('reports the new question count when the count input changes', () => {
    const { onChange } = renderEditor()
    const countInputs = screen.getAllByLabelText(tx('copy.paper.questionsLabel'))
    fireEvent.change(countInputs[1], { target: { value: '6' } })
    expect(onChange).toHaveBeenCalledWith([
      sections[0],
      { ...sections[1], questionCount: 6 },
    ])
  })

  it('clamps a negative question count to 0 instead of accepting it', () => {
    const { onChange } = renderEditor()
    const countInputs = screen.getAllByLabelText(tx('copy.paper.questionsLabel'))
    fireEvent.change(countInputs[1], { target: { value: '-3' } })
    expect(onChange).toHaveBeenCalledWith([
      sections[0],
      { ...sections[1], questionCount: 0 },
    ])
  })

  it('removes a section when its remove button is clicked', () => {
    const { onChange } = renderEditor()
    const removeButtons = screen.getAllByLabelText(tx('copy.paper.removeSectionAria'))
    expect(removeButtons).toHaveLength(2)
    fireEvent.click(removeButtons[0])
    expect(onChange).toHaveBeenCalledWith([sections[1]])
  })

  it('adds a new short section when the add button is clicked', () => {
    const { onChange } = renderEditor()
    fireEvent.click(screen.getByRole('button', { name: tx('common.addSection') }))
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0][0] as PatternSection[]
    expect(next).toHaveLength(3)
    expect(next[2]).toMatchObject({ type: 'short', marksPerQuestion: 4, questionCount: 2 })
  })
})

describe('PatternEditor empty state', () => {
  it('shows the empty message and no section rows when there are no sections', () => {
    renderEditor({ sections: [] })
    expect(screen.getByText(tx('copy.paper.patternEmpty'))).toBeTruthy()
    expect(screen.queryByLabelText(tx('copy.paper.sectionType'))).toBeNull()
    const meter = screen.getByRole('progressbar', { name: tx('copy.paper.meterLabel') })
    expect(meter.getAttribute('aria-valuetext')).toBe('0 / 75')
  })
})

describe('PatternEditor marks-mismatch error', () => {
  it('announces an error with role="alert" when the total is below the target', () => {
    renderEditor()
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain(tx('copy.paper.marksMismatch', { current: 31, target: 75 }))
  })

  it('announces an error when the total is over the target', () => {
    renderEditor({ sections: customPresets[1].sections })
    expect(screen.getByRole('alert').textContent).toContain(
      tx('copy.paper.marksMismatch', { current: 80, target: 75 }),
    )
  })

  it('shows no error when the total matches the target exactly', () => {
    renderEditor({
      sections: [
        { id: 'sec-mcq', type: 'mcq', marksPerQuestion: 1, questionCount: 15 },
        { id: 'sec-short', type: 'short', marksPerQuestion: 5, questionCount: 6 },
        { id: 'sec-long', type: 'long', marksPerQuestion: 10, questionCount: 3 },
      ],
    })
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
