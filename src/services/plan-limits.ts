import type { Plan, PlanId } from '../mock/data'

/** A limit value: a positive whole number, or 'unlimited'. */
export type LimitValue = number | 'unlimited'

export interface PlanLimitPatch {
  maxTeachers?: LimitValue
  maxPapersPerMonth?: LimitValue
  maxTemplates?: LimitValue
}

/** Lower bounds for numeric limits (a plan must allow at least this much). */
export const PLAN_LIMIT_MINIMA: Record<keyof PlanLimitPatch, number> = {
  maxTeachers: 1,
  maxPapersPerMonth: 1,
  maxTemplates: 0,
}

/**
 * Validate a plan-limit edit. Rules (blueprint 4.2 B5):
 *   - a numeric limit must be a whole number at or above its minimum
 *   - 'unlimited' is always valid
 *   - at least one limit must change
 * Returns a list of error keys (i18n suffixes under admin.plans.errors.*);
 * an empty list means the patch is valid.
 */
export function validatePlanLimits(plan: Plan, patch: PlanLimitPatch): string[] {
  const errors: string[] = []
  const keys = Object.keys(PLAN_LIMIT_MINIMA) as (keyof PlanLimitPatch)[]
  let changed = false
  for (const key of keys) {
    const value = patch[key]
    if (value === undefined) continue
    if (value !== plan[key]) changed = true
    if (value === 'unlimited') continue
    if (typeof value !== 'number' || !Number.isInteger(value) || value < PLAN_LIMIT_MINIMA[key]) {
      errors.push(key)
    }
  }
  if (!changed) errors.push('noChange')
  return errors
}

/** Apply a validated patch to a plan (pure — does not mutate the input). */
export function applyPlanLimits(plan: Plan, patch: PlanLimitPatch): Plan {
  return { ...plan, ...patch }
}

export type { PlanId }
