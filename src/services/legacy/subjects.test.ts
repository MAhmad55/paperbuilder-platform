import { describe, expect, it } from 'vitest';
import { BOARD_SUBJECTS, getSubjectAsset } from './subjects';

describe('Subject Assets Registry', () => {
  it('registers all 10 board subjects with local asset paths', () => {
    expect(BOARD_SUBJECTS).toHaveLength(10);
    for (const subj of BOARD_SUBJECTS) {
      expect(subj.image).toMatch(/^\/assets\/subjects\/[a-z-]+\.jpg$/);
    }
    expect(getSubjectAsset('tarjuma-quran')?.ur).toBe('ترجمۃ القرآن المجید');
  });
});
