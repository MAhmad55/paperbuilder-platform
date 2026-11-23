import { describe, expect, it } from 'vitest'
import { applyPlanLimits, validatePlanLimits } from './plan-limits'
import type { Plan } from '../mock/data'

const samplePlan: Plan = {
  id: 'starter',
  name: 'Starter',
  nameUr: 'سٹارٹر',
  maxTeachers: 25,
  maxPapersPerMonth: 30,
  maxTemplates: 3,
  customBranding: false,
  prioritySupport: false,
}

describe('validatePlanLimits', () => {
  it('fails when teachers is 0 (below the minimum of 1)', () => {
    const errors = validatePlanLimits(samplePlan, { maxTeachers: 0 })
    expect(errors).toContain('maxTeachers')
  })

  it('fails when teachers is 1.5 (not a whole number)', () => {
    const errors = validatePlanLimits(samplePlan, { maxTeachers: 1.5 })
    expect(errors).toContain('maxTeachers')
  })

  it('fails when templates is below its minimum of 0', () => {
    const errors = validatePlanLimits(samplePlan, { maxTemplates: -1 })
    expect(errors).toContain('maxTemplates')
  })

  it('accepts unlimited for any limit', () => {
    expect(validatePlanLimits(samplePlan, { maxTeachers: 'unlimited' })).toEqual([])
    expect(validatePlanLimits(samplePlan, { maxPapersPerMonth: 'unlimited' })).toEqual([])
    expect(validatePlanLimits(samplePlan, { maxTemplates: 'unlimited' })).toEqual([])
  })

  it('fails with noChange when the patch changes nothing', () => {
    expect(validatePlanLimits(samplePlan, { maxTeachers: 25 })).toEqual(['noChange'])
  })

  it('fails with noChange for an empty patch', () => {
    expect(validatePlanLimits(samplePlan, {})).toEqual(['noChange'])
  })

  it('reports each invalid field in one patch', () => {
    const errors = validatePlanLimits(samplePlan, { maxTeachers: 0, maxPapersPerMonth: 0.5 })
    expect(errors).toContain('maxTeachers')
    expect(errors).toContain('maxPapersPerMonth')
  })

  it('passes a valid patch with no errors', () => {
    const errors = validatePlanLimits(samplePlan, { maxTeachers: 40, maxPapersPerMonth: 50 })
    expect(errors).toEqual([])
  })
})

describe('applyPlanLimits', () => {
  it('merges the patch without mutating the input', () => {
    const next = applyPlanLimits(samplePlan, { maxTeachers: 40 })
    expect(next.maxTeachers).toBe(40)
    expect(next.maxPapersPerMonth).toBe(30)
    expect(next.maxTemplates).toBe(3)
    expect(next).not.toBe(samplePlan)
    expect(samplePlan.maxTeachers).toBe(25)
  })

  it('applies an unlimited value', () => {
    const next = applyPlanLimits(samplePlan, { maxTemplates: 'unlimited' })
    expect(next.maxTemplates).toBe('unlimited')
    expect(samplePlan.maxTemplates).toBe(3)
  })
})
