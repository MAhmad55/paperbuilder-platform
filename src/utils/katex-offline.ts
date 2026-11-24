declare global {
  interface Window {
    katex?: {
      renderToString: (
        tex: string,
        options?: {
          throwOnError?: boolean;
          displayMode?: boolean;
          output?: 'html' | 'mathml' | 'htmlAndMathml';
        }
      ) => string;
    };
  }
}

export function renderTexToHtml(tex: string, displayMode = false): string {
  if (typeof window !== 'undefined' && window.katex) {
    try {
      return window.katex.renderToString(tex, {
        throwOnError: false,
        displayMode,
        output: 'html',
      });
    } catch {
      return tex;
    }
  }
  return tex;
}

const KATEX_CSS_HREF = '/vendor/katex/katex.min.css';
const KATEX_JS_SRC = '/vendor/katex/katex.min.js';

/** Memoised load — KaTeX is fetched at most once per page lifetime. */
let katexPromise: Promise<void> | null = null;

/**
 * Load KaTeX lazily, on first use only. Injects the stylesheet and the
 * script; resolves when the script has loaded. Reject-safe: on any
 * failure it still resolves, and renderTexToHtml falls back to raw TeX,
 * so a missing or broken KaTeX can never break a page.
 */
export function ensureKatex(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.katex) return Promise.resolve();
  if (katexPromise) return katexPromise;
  katexPromise = new Promise<void>((resolve) => {
    const finish = () => resolve();
    if (!document.querySelector(`link[href="${KATEX_CSS_HREF}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = KATEX_CSS_HREF;
      document.head.appendChild(link);
    }
    const existing = document.querySelector(
      `script[src="${KATEX_JS_SRC}"]`,
    ) as HTMLScriptElement | null;
    if (existing) {
      if (window.katex) {
        finish();
        return;
      }
      existing.addEventListener('load', finish, { once: true });
      existing.addEventListener('error', finish, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = KATEX_JS_SRC;
    script.async = true;
    script.onload = finish;
    script.onerror = finish;
    document.head.appendChild(script);
  });
  return katexPromise;
}
