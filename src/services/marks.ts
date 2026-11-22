/**
 * Marks-total calculation — pure, unit-testable.
 *
 * A paper's total marks is the sum over its sections of (marks per question × questionCount).
 * The roll-number block does not add marks, so it never enters here.
 */

export interface SectionLike {
  marksPerQuestion: number
  questionCount: number
}

export function totalMarks(sections: SectionLike[]): number {
  return sections.reduce((sum, s) => sum + s.marksPerQuestion * s.questionCount, 0)
}

export function marksRatio(target: number, current: number): number {
  if (target <= 0) return 0
  return current / target
}
