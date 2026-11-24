export type QuestionKind = 'mcq' | 'short' | 'long' | 'numerical' | 'translation';
export type PaperMedium = 'en' | 'ur' | 'bilingual';

export interface BankQuestion {
  id: string;
  subjectId: string;
  grade: '9' | '10';
  chapterNo: number;
  topic: string;
  kind: QuestionKind;
  marks: number;
  enText?: string;
  urText?: string;
  options?: { en: string; ur: string }[];
  correctOptionIndex?: number;
  solutionSteps?: { en?: string[]; ur?: string[] };
  isAlp?: boolean;
}

export interface PaperSectionSpec {
  id: string;
  partLabelEn: string;
  partLabelUr: string;
  questionNoLabel: string;
  kind: QuestionKind;
  totalQuestions: number;
  attemptQuestions: number;
  marksPerQuestion: number;
  chapterFilter?: number[];
}

export interface BoardPatternPreset {
  id: string;
  titleEn: string;
  titleUr: string;
  grade: '9' | '10';
  subjectId: string;
  isAlpPreset: boolean;
  durationMinutes: number;
  sections: PaperSectionSpec[];
}

export interface AssembledSection extends PaperSectionSpec {
  questions: BankQuestion[];
  sectionTotalMarks: number;
}

export interface AssembledBoardPaper {
  presetId: string;
  schoolNameEn: string;
  schoolNameUr: string;
  examTitleEn: string;
  examTitleUr: string;
  grade: '9' | '10';
  subjectId: string;
  medium: PaperMedium;
  durationMinutes: number;
  totalMarks: number;
  sections: AssembledSection[];
}

export function calculateSectionMarks(spec: PaperSectionSpec): number {
  return spec.attemptQuestions * spec.marksPerQuestion;
}

export function calculatePaperTotalMarks(sections: readonly PaperSectionSpec[]): number {
  return sections.reduce((sum, sec) => sum + calculateSectionMarks(sec), 0);
}

export const BOARD_PATTERN_PRESETS: readonly BoardPatternPreset[] = [
  {
    id: 'ptb-math-10-full',
    titleEn: '10th Mathematics — Full Board Pattern (75 Marks)',
    titleUr: 'دہم ریاضی — مکمل بورڈ پیٹرن (75 نمبر)',
    grade: '10',
    subjectId: 'mathematics',
    isAlpPreset: false,
    durationMinutes: 150,
    sections: [
      { id: 'sec-q1-mcq', partLabelEn: 'Part-I (Objective)', partLabelUr: 'حصہ معروضی', questionNoLabel: 'Q.1', kind: 'mcq', totalQuestions: 15, attemptQuestions: 15, marksPerQuestion: 1 },
      { id: 'sec-q2-short', partLabelEn: 'Part-II (Short Questions)', partLabelUr: 'حصہ انشائیہ (مختصر سوالات)', questionNoLabel: 'Q.2', kind: 'short', totalQuestions: 9, attemptQuestions: 6, marksPerQuestion: 2, chapterFilter: [1, 2, 3, 4] },
      { id: 'sec-q3-short', partLabelEn: 'Part-II (Short Questions)', partLabelUr: 'حصہ انشائیہ (مختصر سوالات)', questionNoLabel: 'Q.3', kind: 'short', totalQuestions: 9, attemptQuestions: 6, marksPerQuestion: 2, chapterFilter: [5, 6, 7] },
      { id: 'sec-q4-short', partLabelEn: 'Part-II (Short Questions)', partLabelUr: 'حصہ انشائیہ (مختصر سوالات)', questionNoLabel: 'Q.4', kind: 'short', totalQuestions: 9, attemptQuestions: 6, marksPerQuestion: 2, chapterFilter: [8, 9, 10, 11, 12, 13] },
      { id: 'sec-long', partLabelEn: 'Part-III (Long Questions — Attempt any 3, Q.9 Compulsory)', partLabelUr: 'حصہ دوم (تفصیلی سوالات — کوئی سے 3 حل کریں، سوال نمبر 9 لازمی ہے)', questionNoLabel: 'Q.5 - Q.9', kind: 'long', totalQuestions: 5, attemptQuestions: 3, marksPerQuestion: 8 },
    ],
  },
  {
    id: 'ptb-physics-10-alp',
    titleEn: '10th Physics — ALP Smart Syllabus Pattern (60 Marks)',
    titleUr: 'دہم طبیعیات — اے ایل پی سمارٹ سلیبس پیٹرن (60 نمبر)',
    grade: '10',
    subjectId: 'physics',
    isAlpPreset: true,
    durationMinutes: 120,
    sections: [
      { id: 'phy-q1-mcq', partLabelEn: 'Objective Type', partLabelUr: 'حصہ معروضی', questionNoLabel: 'Q.1', kind: 'mcq', totalQuestions: 12, attemptQuestions: 12, marksPerQuestion: 1 },
      { id: 'phy-q2-short', partLabelEn: 'Short Questions (Attempt any 5)', partLabelUr: 'مختصر سوالات (کوئی سے 5 حل کریں)', questionNoLabel: 'Q.2', kind: 'short', totalQuestions: 8, attemptQuestions: 5, marksPerQuestion: 2, chapterFilter: [10, 11, 12] },
      { id: 'phy-q3-short', partLabelEn: 'Short Questions (Attempt any 5)', partLabelUr: 'مختصر سوالات (کوئی سے 5 حل کریں)', questionNoLabel: 'Q.3', kind: 'short', totalQuestions: 8, attemptQuestions: 5, marksPerQuestion: 2, chapterFilter: [13, 14, 15] },
      { id: 'phy-q4-short', partLabelEn: 'Short Questions (Attempt any 5)', partLabelUr: 'مختصر سوالات (کوئی سے 5 حل کریں)', questionNoLabel: 'Q.4', kind: 'short', totalQuestions: 8, attemptQuestions: 5, marksPerQuestion: 2, chapterFilter: [16, 17, 18] },
      { id: 'phy-long', partLabelEn: 'Long Questions & Numericals (Attempt any 2)', partLabelUr: 'تفصیلی سوالات و عددی مسائل (کوئی سے 2 حل کریں)', questionNoLabel: 'Q.5 - Q.7', kind: 'long', totalQuestions: 3, attemptQuestions: 2, marksPerQuestion: 9 },
    ],
  },
];
