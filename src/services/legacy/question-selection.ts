import type {
  AssembledBoardPaper,
  AssembledSection,
  BankQuestion,
  BoardPatternPreset,
  PaperMedium,
} from './board-paper';
import { calculatePaperTotalMarks, calculateSectionMarks } from './board-paper';

export interface SelectionOptions {
  bank: readonly BankQuestion[];
  preset: BoardPatternPreset;
  selectedChapters: readonly number[];
  alpOnly: boolean;
  pinnedQuestionIds?: readonly string[];
  excludedQuestionIds?: readonly string[];
  schoolNameEn: string;
  schoolNameUr: string;
  examTitleEn: string;
  examTitleUr: string;
  medium: PaperMedium;
}

export interface ValidationIssue {
  sectionId: string;
  message: string;
}

export function assembleBoardPaper(opts: SelectionOptions): {
  paper: AssembledBoardPaper;
  issues: ValidationIssue[];
} {
  const usedIds = new Set<string>(opts.excludedQuestionIds ?? []);
  const pinnedSet = new Set<string>(opts.pinnedQuestionIds ?? []);
  const issues: ValidationIssue[] = [];

  const assembledSections: AssembledSection[] = opts.preset.sections.map((sec) => {
    const allowedChapters = sec.chapterFilter?.length
      ? sec.chapterFilter.filter((ch) => opts.selectedChapters.includes(ch))
      : [...opts.selectedChapters];

    const candidates = opts.bank.filter((q) => {
      if (q.subjectId !== opts.preset.subjectId) return false;
      if (q.grade !== opts.preset.grade) return false;
      if (q.kind !== sec.kind) return false;
      if (opts.alpOnly && !q.isAlp) return false;
      if (allowedChapters.length > 0 && !allowedChapters.includes(q.chapterNo)) return false;
      return true;
    });

    const pinned = candidates.filter((q) => pinnedSet.has(q.id) && !usedIds.has(q.id));
    const others = candidates.filter((q) => !pinnedSet.has(q.id) && !usedIds.has(q.id));

    const picked = [...pinned, ...others].slice(0, sec.totalQuestions);
    picked.forEach((q) => usedIds.add(q.id));

    if (picked.length < sec.totalQuestions) {
      issues.push({
        sectionId: sec.id,
        message: `Section ${sec.questionNoLabel}: required ${sec.totalQuestions} questions, found ${picked.length}.`,
      });
    }

    return {
      ...sec,
      questions: picked,
      sectionTotalMarks: calculateSectionMarks(sec),
    };
  });

  const paper: AssembledBoardPaper = {
    presetId: opts.preset.id,
    schoolNameEn: opts.schoolNameEn,
    schoolNameUr: opts.schoolNameUr,
    examTitleEn: opts.examTitleEn,
    examTitleUr: opts.examTitleUr,
    grade: opts.preset.grade,
    subjectId: opts.preset.subjectId,
    medium: opts.medium,
    durationMinutes: opts.preset.durationMinutes,
    totalMarks: calculatePaperTotalMarks(opts.preset.sections),
    sections: assembledSections,
  };

  return { paper, issues };
}
