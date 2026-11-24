// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from './test-utils'
import { Stepper, type StepperStep } from './Stepper'

const steps: StepperStep[] = [
  { id: 'setup', title: 'Setup', state: 'done' },
  { id: 'scope', title: 'Scope', summary: 'Class 9, Mathematics', state: 'current' },
  { id: 'blueprint', title: 'Blueprint', state: 'blocked' },
  { id: 'questions', title: 'Questions', state: 'pending' },
]

describe('Stepper states', () => {
  it('renders every step title inside an ordered list', () => {
    render(<Stepper steps={steps} ariaLabel="Paper setup" />)
    const list = screen.getByRole('list', { name: 'Paper setup' })
    expect(list.tagName).toBe('OL')
    for (const step of steps) {
      expect(screen.getByText(step.title)).toBeTruthy()
    }
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
  })

  it('marks exactly the current step with aria-current="step"', () => {
    const { container } = render(<Stepper steps={steps} />)
    const current = container.querySelectorAll('li[aria-current="step"]')
    expect(current).toHaveLength(1)
    expect(current[0].textContent).toContain('Scope')
  })

  it('shows the step summary when one is provided', () => {
    render(<Stepper steps={steps} />)
    expect(screen.getByText('Class 9, Mathematics')).toBeTruthy()
  })

  it('shows a check marker on the done step and a lock marker on the blocked step', () => {
    const { container } = render(<Stepper steps={steps} />)
    const items = container.querySelectorAll('.pb-stepper__item')
    expect(items[0].querySelector('svg')).not.toBeNull()
    expect(items[2].querySelector('svg')).not.toBeNull()
  })

  it('shows the step number, not an icon, on current and pending steps', () => {
    const { container } = render(<Stepper steps={steps} />)
    const items = container.querySelectorAll('.pb-stepper__item')
    expect(items[1].querySelector('svg')).toBeNull()
    expect(items[1].textContent).toContain('2')
    expect(items[3].querySelector('svg')).toBeNull()
    expect(items[3].textContent).toContain('4')
  })
})

describe('Stepper click-to-navigate', () => {
  it('calls onStepClick with the step id when a done step is clicked', () => {
    const onStepClick = vi.fn()
    render(<Stepper steps={steps} onStepClick={onStepClick} />)
    fireEvent.click(screen.getByRole('button', { name: /Setup/ }))
    expect(onStepClick).toHaveBeenCalledTimes(1)
    expect(onStepClick).toHaveBeenCalledWith('setup')
  })

  it('does not make the current, blocked or pending steps clickable', () => {
    const onStepClick = vi.fn()
    render(<Stepper steps={steps} onStepClick={onStepClick} />)
    expect(screen.queryByRole('button', { name: /Scope/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Blueprint/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Questions/ })).toBeNull()
    expect(onStepClick).not.toHaveBeenCalled()
  })

  it('renders no buttons at all when no onStepClick is given', () => {
    render(<Stepper steps={steps} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('Stepper Urdu RTL rendering', () => {
  it('renders Urdu titles and keeps aria-current under a dir="rtl" ancestor', () => {
    const urduSteps: StepperStep[] = [
      { id: 'setup', title: 'ترتیب', state: 'done' },
      { id: 'scope', title: 'دائرہ کار', summary: 'جماعت 9، ریاضی', state: 'current' },
      { id: 'questions', title: 'سوالات', state: 'pending' },
    ]
    const { container } = render(
      <div dir="rtl" lang="ur">
        <Stepper steps={urduSteps} ariaLabel="پیپر ترتیب" />
      </div>,
    )
    expect(screen.getByText('ترتیب')).toBeTruthy()
    expect(screen.getByText('دائرہ کار')).toBeTruthy()
    expect(screen.getByText('سوالات')).toBeTruthy()
    const current = container.querySelectorAll('li[aria-current="step"]')
    expect(current).toHaveLength(1)
    expect(current[0].textContent).toContain('دائرہ کار')
  })

  it('wraps the summary in a bdi element so it keeps its own direction', () => {
    const { container } = render(<Stepper steps={steps} />)
    const summary = screen.getByText('Class 9, Mathematics')
    expect(summary.closest('bdi')?.getAttribute('dir')).toBe('auto')
    expect(container.querySelectorAll('bdi[dir="auto"]').length).toBeGreaterThan(0)
  })
})
