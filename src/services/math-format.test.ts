import { describe, expect, it } from 'vitest';
import { formatDerivationSteps, formatMathText } from './math-format';

describe('Math Format, Bidi-Lock & Derivation Steps', () => {
  it('wraps inline math in dir="ltr" isolated spans inside Urdu RTL sentences', () => {
    const input = 'اگر $x^2 - 5x + 6 = 0$ ہو تو $x$ کی قیمت معلوم کریں۔';
    const result = formatMathText(input);
    expect(result.hasMath).toBe(true);
    expect(result.html).toContain('<span class="math-inline-span" dir="ltr">');
  });

  it('preserves every vertical intermediate derivation step', () => {
    const ptbSteps = [
      'Given: $2x^2 - 7x + 3 = 0$',
      'Factorizing: $2x^2 - 6x - x + 3 = 0$',
      'Solution Set: $\\{\\frac{1}{2}, 3\\}$',
    ];
    const formatted = formatDerivationSteps(ptbSteps);
    expect(formatted).toHaveLength(3);
    expect(formatted.every((item) => item.hasMath)).toBe(true);
  });
});
