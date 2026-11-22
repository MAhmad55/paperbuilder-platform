import { describe, it, expect } from 'vitest'
import { totalMarks, marksRatio } from './marks'

describe('totalMarks', () => {
  it('sums marks per question across sections', () => {
    expect(totalMarks([
      { marksPerQuestion: 1, questionCount: 15 },
      { marksPerQuestion: 5, questionCount: 6 },
      { marksPerQuestion: 10, questionCount: 3 },
    ])).toBe(15 + 30 + 30)
  })

  it('returns 0 for an empty paper', () => {
    expect(totalMarks([])).toBe(0)
  })

  it('returns 0 when every section has no questions', () => {
    expect(totalMarks([{ marksPerQuestion: 5, questionCount: 0 }])).toBe(0)
  })

  it('is consistent per section regardless of section count', () => {
    const single = totalMarks([{ marksPerQuestion: 2, questionCount: 8 }])
    expect(single).toBe(16)
    const duplicated = totalMarks([
      { marksPerQuestion: 2, questionCount: 4 },
      { marksPerQuestion: 2, questionCount: 4 },
    ])
    expect(duplicated).toBe(16)
  })
})

describe('marksRatio', () => {
  it('is current/target at target met', () => {
    expect(marksRatio(75, 75)).toBe(1)
  })

  it('is below 1 when under target', () => {
    expect(marksRatio(75, 35)).toBeCloseTo(35 / 75, 5)
  })

  it('returns 0 for a zero or negative target rather than dividing by zero', () => {
    expect(marksRatio(0, 10)).toBe(0)
    expect(marksRatio(-5, 10)).toBe(0)
  })

  it('can exceed 1 over target', () => {
    expect(marksRatio(75, 90)).toBeGreaterThan(1)
  })
})
