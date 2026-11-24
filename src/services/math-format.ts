import { renderTexToHtml } from '../utils/katex-offline';

export interface FormattedMathBlock {
  html: string;
  hasMath: boolean;
}

/** One piece of a mixed string: plain text, or a TeX run ($...$ / $$...$$). */
export interface MathSegment {
  kind: 'text' | 'math';
  text: string;
  display?: boolean;
}

const MATH_RUN_RE = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

/**
 * Split a string into plain-text and math segments. An unmatched or
 * empty $ stays literal text — never a math segment — so plain text is
 * always rendered as React text nodes, never injected as HTML.
 */
export function splitMathText(raw: string): MathSegment[] {
  if (!raw) return [];
  const segments: MathSegment[] = [];
  let last = 0;
  MATH_RUN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MATH_RUN_RE.exec(raw)) !== null) {
    if (m.index > last) segments.push({ kind: 'text', text: raw.slice(last, m.index) });
    const tex = (m[1] ?? m[2]).trim();
    if (tex === '') {
      segments.push({ kind: 'text', text: m[0] });
    } else if (m[1] !== undefined) {
      segments.push({ kind: 'math', text: tex, display: true });
    } else {
      segments.push({ kind: 'math', text: tex });
    }
    last = m.index + m[0].length;
  }
  if (last < raw.length) segments.push({ kind: 'text', text: raw.slice(last) });
  if (segments.length === 0) segments.push({ kind: 'text', text: raw });
  return segments;
}

/** True when the text contains at least one $...$ or $$...$$ TeX run. */
export function containsMath(raw: string): boolean {
  return splitMathText(raw).some((s) => s.kind === 'math');
}

export function formatMathText(raw: string): FormattedMathBlock {
  if (!raw) return { html: '', hasMath: false };
  let hasMath = false;

  let processed = raw.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex: string) => {
    hasMath = true;
    const rendered = renderTexToHtml(tex.trim(), true);
    return `<div class="math-display-block" dir="ltr">${rendered}</div>`;
  });

  processed = processed.replace(/\$([^$\n]+?)\$/g, (_, tex: string) => {
    hasMath = true;
    const rendered = renderTexToHtml(tex.trim(), false);
    return `<span class="math-inline-span" dir="ltr">${rendered}</span>`;
  });

  return { html: processed, hasMath };
}

export function formatDerivationSteps(steps: readonly string[]): FormattedMathBlock[] {
  return steps.map((step) => formatMathText(step));
}
