/**
 * Paper lifecycle rules — pure, unit-testable.
 *
 * Blueprint §5.2: Draft -> Submitted -> In review -> Approved -> Printed -> Archived,
 * with Changes requested returning to Draft. When the school's approval policy is
 * "optional", the teacher may go Draft -> Approved directly (self-approve own paper).
 */

export type PaperStatusLike =
  | 'draft' | 'submitted' | 'in-review' | 'approved' | 'changes-requested' | 'printed' | 'archived'

export type ActorRole = 'super-admin' | 'school-admin' | 'teacher'

export interface TransitionContext {
  /** School approval policy: 'required' or 'optional' */
  optionalPolicy: boolean
}

export const PAPER_TRANSITIONS: Record<PaperStatusLike, PaperStatusLike[]> = {
  draft: ['submitted', 'approved'],
  submitted: ['in-review'],
  'in-review': ['approved', 'changes-requested'],
  approved: ['printed', 'archived'],
  'changes-requested': ['draft'],
  printed: ['archived'],
  archived: [],
}

/** Is the status edge present for the given policy? */
export function canTransition(from: PaperStatusLike, to: PaperStatusLike, optionalPolicy: boolean): boolean {
  const allowed = PAPER_TRANSITIONS[from]
  if (!allowed.includes(to)) return false
  // Required approval: a direct draft->approved jump is not allowed.
  if (to === 'approved' && from === 'draft' && !optionalPolicy) return false
  return true
}

/** Who may perform a transition. */
export function canPerformTransition(actorRole: ActorRole, from: PaperStatusLike, to: PaperStatusLike, optionalPolicy: boolean): boolean {
  if (!canTransition(from, to, optionalPolicy)) return false
  if (to === 'approved' && from === 'draft' && optionalPolicy) {
    // Optional policy: teacher may self-approve a draft. Admins always may.
    return actorRole === 'teacher' || actorRole === 'school-admin' || actorRole === 'super-admin'
  }
  if (to === 'approved') {
    // Any other approval path (e.g. from in-review) is approver-only.
    return actorRole === 'school-admin' || actorRole === 'super-admin'
  }
  return true
}

/** Validate a transition — full rule set from blueprint §5.2. */
export function validateTransition(
  from: PaperStatusLike,
  to: PaperStatusLike,
  actorRole: ActorRole,
  ctx: TransitionContext,
  comment?: string,
): { ok: true } | { ok: false; error: string } {
  if (from === to) return { ok: false, error: 'Paper is already in this state' }
  if (!canTransition(from, to, ctx.optionalPolicy)) {
    return { ok: false, error: `Cannot move from ${from} to ${to}` }
  }
  if (!canPerformTransition(actorRole, from, to, ctx.optionalPolicy)) {
    return { ok: false, error: 'Only an approver may approve a paper' }
  }
  if (to === 'changes-requested' && !comment?.trim()) {
    return { ok: false, error: 'A comment is required to request changes' }
  }
  return { ok: true }
}
