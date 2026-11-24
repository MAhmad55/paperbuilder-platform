import { describe, expect, it } from 'vitest';
import { BOARD_PATTERN_PRESETS, calculatePaperTotalMarks } from './board-paper';
import { presetTotal } from '../studio';

/**
 * Legacy vs Studio presets (merge integration pass).
 *
 * No preset id exists in both engines, so the match is by pattern, not
 * by id: ptb-math-10-full is the legacy 75-mark board pattern and
 * board-75 is the Studio one. Their nominal totals must stay equal;
 * the test fails if either side's sections change the total.
 * ptb-physics-10-alp (60 marks) has no Studio counterpart.
 */
const MATCHED: [legacyId: string, studioId: string][] = [
  ['ptb-math-10-full', 'board-75'],
];

describe('Legacy vs Studio presets', () => {
  it('matched presets total the same marks', () => {
    for (const [legacyId, studioId] of MATCHED) {
      const legacy = BOARD_PATTERN_PRESETS.find((p) => p.id === legacyId);
      expect(legacy).toBeDefined();
      expect(calculatePaperTotalMarks(legacy!.sections)).toBe(presetTotal(studioId));
    }
  });

  it('every legacy preset is either matched or listed as unmatched', () => {
    const matchedIds = new Set(MATCHED.map(([legacyId]) => legacyId));
    const unmatched = BOARD_PATTERN_PRESETS.filter((p) => !matchedIds.has(p.id)).map((p) => p.id);
    expect(unmatched).toEqual(['ptb-physics-10-alp']);
  });
});
