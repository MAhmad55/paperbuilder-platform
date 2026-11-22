import { describe, it, expect } from 'vitest'
import {
  PAPER_TRANSITIONS,
  canTransition,
  canPerformTransition,
  validateTransition,
} from './paper-transitions'

const REQUIRED = { optionalPolicy: false }
const OPTIONAL = { optionalPolicy: true }

describe('canTransition edge table', () => {
  it('allows every documented edge', () => {
    const allowed: [string, string][] = [
      ['draft', 'submitted'],
      ['submitted', 'in-review'],
      ['in-review', 'approved'],
      ['in-review', 'changes-requested'],
      ['approved', 'printed'],
      ['approved', 'archived'],
      ['changes-requested', 'draft'],
      ['printed', 'archived'],
    ]
    for (const [from, to] of allowed) {
      expect(canTransition(from as never, to as never, false), `${from} -> ${to}`).toBe(true)
    }
  })

  it('blocks an approval loop or jump the graph does not allow', () => {
    const blocked: [string, string][] = [
      ['draft', 'printed'],
      ['draft', 'archived'],
      ['submitted', 'approved'],
      ['submitted', 'printed'],
      ['in-review', 'submitted'],
      ['archived', 'draft'],
      ['printed', 'approved'],
      ['printed', 'submitted'],
      ['changes-requested', 'printed'],
    ]
    for (const [from, to] of blocked) {
      expect(canTransition(from as never, to as never, false), `${from} -> ${to}`).toBe(false)
    }
  })

  it('blocks the required-approval direct draft->approved jump', () => {
    expect(canTransition('draft', 'approved', false)).toBe(false)
    expect(canTransition('draft', 'approved', true)).toBe(true)
  })

  it('keeps archived as a terminal state', () => {
    expect(PAPER_TRANSITIONS.archived).toEqual([])
    expect(canTransition('archived', 'draft', true)).toBe(false)
  })
})

describe('canPerformTransition (who may approve)', () => {
  it('only school-admin and super-admin may approve from in-review', () => {
    expect(canPerformTransition('school-admin', 'in-review', 'approved', false)).toBe(true)
    expect(canPerformTransition('super-admin', 'in-review', 'approved', false)).toBe(true)
    expect(canPerformTransition('teacher', 'in-review', 'approved', false)).toBe(false)
  })

  it('optional policy allows a teacher to self-approve a draft', () => {
    expect(canPerformTransition('teacher', 'draft', 'approved', true)).toBe(true)
    expect(canPerformTransition('teacher', 'draft', 'approved', false)).toBe(false)
  })

  it('teachers may submit to review but not from an already-approved state', () => {
    expect(canPerformTransition('teacher', 'draft', 'submitted', false)).toBe(true)
    expect(canPerformTransition('teacher', 'approved', 'printed', false)).toBe(true)
  })
})

describe('validateTransition', () => {
  it('accepts a valid required-approval transition', () => {
    const r = validateTransition('in-review', 'approved', 'school-admin', REQUIRED)
    expect(r).toEqual({ ok: true })
  })

  it('rejects same-state transitions', () => {
    const r = validateTransition('draft', 'draft', 'teacher', REQUIRED)
    expect(r.ok).toBe(false)
  })

  it('rejects an invalid edge with an unambiguous error', () => {
    const r = validateTransition('submitted', 'approved', 'school-admin', REQUIRED)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/submitted/)
  })

  it('requires a comment when requesting changes', () => {
    const noComment = validateTransition('in-review', 'changes-requested', 'school-admin', REQUIRED)
    expect(noComment.ok).toBe(false)
    const blankComment = validateTransition('in-review', 'changes-requested', 'school-admin', REQUIRED, '   ')
    expect(blankComment.ok).toBe(false)
    const withComment = validateTransition(
      'in-review', 'changes-requested', 'school-admin', REQUIRED, 'Please add the chapter coverage',
    )
    expect(withComment).toEqual({ ok: true })
  })

  it('rejects an approval by a teacher in a required policy', () => {
    const r = validateTransition('in-review', 'approved', 'teacher', REQUIRED)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/approver/i)
  })

  it('accepts teacher self-approval in an optional policy', () => {
    const r = validateTransition('draft', 'approved', 'teacher', OPTIONAL)
    expect(r).toEqual({ ok: true })
  })

  it('rejects direct draft->approved in a required policy even for admins', () => {
    const r = validateTransition('draft', 'approved', 'school-admin', REQUIRED)
    expect(r.ok).toBe(false)
  })
})

describe('audit-completeness in the edge table', () => {
  it('has no duplicate edges', () => {
    const seen = new Set<string>()
    for (const [from, tos] of Object.entries(PAPER_TRANSITIONS)) {
      for (const to of tos) {
        const key = `${from}->${to}`
        expect(seen.has(key), `duplicate edge ${key}`).toBe(false)
        seen.add(key)
      }
    }
  })

  it('every edge in the graph is unique and both endpoints are valid statuses', () => {
    const statuses = new Set(Object.keys(PAPER_TRANSITIONS))
    for (const tos of Object.values(PAPER_TRANSITIONS)) {
      for (const to of tos) expect(statuses.has(to), `unknown target ${to}`).toBe(true)
    }
  })
})
