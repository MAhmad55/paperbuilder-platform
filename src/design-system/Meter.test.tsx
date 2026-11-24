// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, tx } from './test-utils'
import { Meter, getMeterState } from './Meter'

describe('getMeterState (marks-total thresholds)', () => {
  it('is under below 80% of target', () => {
    expect(getMeterState(75, 0)).toBe('under')
    expect(getMeterState(75, 59)).toBe('under')
  })

  it('is near from 80% up to, but not including, the target', () => {
    expect(getMeterState(75, 60)).toBe('near')
    expect(getMeterState(75, 74)).toBe('near')
  })

  it('is met exactly at the target', () => {
    expect(getMeterState(75, 75)).toBe('met')
  })

  it('is over above the target', () => {
    expect(getMeterState(75, 76)).toBe('over')
    expect(getMeterState(75, 100)).toBe('over')
  })

  it('is under for a zero or negative target rather than dividing by zero', () => {
    expect(getMeterState(0, 10)).toBe('under')
    expect(getMeterState(-5, 10)).toBe('under')
  })
})

describe('Meter rendering', () => {
  it('exposes the current/target values on the progressbar', () => {
    render(<Meter target={75} current={60} />)
    const meter = screen.getByRole('progressbar')
    expect(meter.getAttribute('aria-valuemin')).toBe('0')
    expect(meter.getAttribute('aria-valuemax')).toBe('75')
    expect(meter.getAttribute('aria-valuenow')).toBe('60')
    expect(meter.getAttribute('aria-valuetext')).toBe('60 / 75')
    expect(screen.getByText('60 / 75')).toBeTruthy()
  })

  it('caps aria-valuenow at the target when the current total is over', () => {
    render(<Meter target={75} current={90} />)
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('75')
    expect(screen.getByText(tx('meter.over'))).toBeTruthy()
  })

  it('announces the met state when the current total equals the target', () => {
    render(<Meter target={75} current={75} />)
    expect(screen.getByText(tx('meter.met'))).toBeTruthy()
  })
})
