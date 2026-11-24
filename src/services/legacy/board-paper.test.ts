import { describe, expect, it } from 'vitest';
import type { BankQuestion } from './board-paper';
import {
  BOARD_PATTERN_PRESETS,
  calculatePaperTotalMarks,
  calculateSectionMarks,
} from './board-paper';
import { assembleBoardPaper } from './question-selection';

function buildMockMathBank(): BankQuestion[] {
  const bank: BankQuestion[] = [];
  for (let i = 1; i <= 20; i++) {
    bank.push({
      id: `mth-mcq-${i}`,
      subjectId: 'mathematics',
      grade: '10',
      chapterNo: ((i - 1) % 4) + 1,
      topic: 'Quadratic Equations',
      kind: 'mcq',
      marks: 1,
      enText: `Find the roots of $x^2 - ${i}x + 1 = 0$`,
      urText: `مساوات $x^2 - ${i}x + 1 = 0$ کے روٹس معلوم کریں`,
      options: [{ en: '$1$', ur: '$1$' }, { en: '$2$', ur: '$2$' }, { en: '$3$', ur: '$3$' }, { en: '$4$', ur: '$4$' }],
      correctOptionIndex: 0,
      isAlp: i % 2 === 0,
    });
  }
  for (let i = 1; i <= 35; i++) {
    bank.push({
      id: `mth-short-${i}`,
      subjectId: 'mathematics',
      grade: '10',
      chapterNo: ((i - 1) % 13) + 1,
      topic: 'Algebra & Geometry',
      kind: 'short',
      marks: 2,
      enText: `Solve for $x$: $2x + ${i} = 15$`,
      urText: `$x$ کی قیمت معلوم کریں: $2x + ${i} = 15$`,
      isAlp: i % 2 === 0,
    });
  }
  for (let i = 1; i <= 8; i++) {
    bank.push({
      id: `mth-long-${i}`,
      subjectId: 'mathematics',
      grade: '10',
      chapterNo: i,
      topic: 'Completing Square',
      kind: 'long',
      marks: 8,
      enText: `Solve by completing square: $x^2 + 4x - ${i} = 0$`,
      urText: `تکمیل مربع سے حل کریں: $x^2 + 4x - ${i} = 0$`,
      solutionSteps: {
        en: [`Step 1: $x^2 + 4x = ${i}$`, `Step 2: $x^2 + 4x + 4 = ${i + 4}$`],
        ur: [`مرحلہ 1: $x^2 + 4x = ${i}$`, `مرحلہ 2: $x^2 + 4x + 4 = ${i + 4}$`],
      },
      isAlp: true,
    });
  }
  return bank;
}

describe('Board Paper Presets & Selection Engine', () => {
  it('computes exact PTB 10th Mathematics total marks (75)', () => {
    const mathPreset = BOARD_PATTERN_PRESETS.find((p) => p.id === 'ptb-math-10-full')!;
    expect(calculateSectionMarks(mathPreset.sections[0])).toBe(15);
    expect(calculatePaperTotalMarks(mathPreset.sections)).toBe(75);
  });

  it('computes exact PTB 10th Physics ALP marks (60)', () => {
    const phyPreset = BOARD_PATTERN_PRESETS.find((p) => p.id === 'ptb-physics-10-alp')!;
    expect(calculatePaperTotalMarks(phyPreset.sections)).toBe(60);
  });

  it('enforces immutable-inputs rule without mutating source arrays', () => {
    const bank = buildMockMathBank();
    const bankSnapshot = JSON.stringify(bank);
    const preset = BOARD_PATTERN_PRESETS.find((p) => p.id === 'ptb-math-10-full')!;
    const { paper, issues } = assembleBoardPaper({
      bank,
      preset,
      selectedChapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      alpOnly: false,
      pinnedQuestionIds: ['mth-mcq-3'],
      excludedQuestionIds: ['mth-mcq-1'],
      schoolNameEn: 'Government Boys High School Garhi Ikhtiar Khan',
      schoolNameUr: 'گورنمنٹ بوائز ہائی سکول گڑھی اختیار خان',
      examTitleEn: 'Annual Examination 2026',
      examTitleUr: 'سالانہ امتحان 2026',
      medium: 'bilingual',
    });
    expect(issues).toHaveLength(0);
    expect(JSON.stringify(bank)).toBe(bankSnapshot);
    const mcqIds = paper.sections[0].questions.map((q) => q.id);
    expect(mcqIds).toContain('mth-mcq-3');
    expect(mcqIds).not.toContain('mth-mcq-1');
  });
});
