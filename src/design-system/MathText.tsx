// @design-system MathText — renders question, option, answer and
// solution text that may contain inline TeX ($...$ / $$...$$).
//
// Plain text is always rendered as React text nodes, never injected as
// HTML. A math run first renders as its raw TeX in a dir="ltr" span (no
// layout jump), and only upgrades to KaTeX HTML after ensureKatex()
// resolves — and only when the text actually contains math, so pages
// without math never fetch KaTeX.
import { Fragment, useEffect, useMemo, useState } from 'react'
import { splitMathText } from '../services/math-format'
import { ensureKatex, renderTexToHtml } from '../utils/katex-offline'

export interface MathTextProps {
  text: string
  className?: string
}

export function MathText({ text, className }: MathTextProps) {
  const segments = useMemo(() => splitMathText(text), [text])
  const hasMath = segments.some((s) => s.kind === 'math')
  const [katexReady, setKatexReady] = useState(false)
  useEffect(() => {
    if (!hasMath) return
    let live = true
    ensureKatex().then(() => {
      if (live) setKatexReady(true)
    })
    return () => {
      live = false
    }
  }, [hasMath])
  const katexLoaded = typeof window !== 'undefined' && Boolean(window.katex)
  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.kind === 'text' ? (
          <Fragment key={i}>{seg.text}</Fragment>
        ) : katexReady && katexLoaded ? (
          <MathHtml key={i} tex={seg.text} display={Boolean(seg.display)} />
        ) : (
          <span
            key={i}
            dir="ltr"
            className={seg.display ? 'math-display-block' : 'math-inline-span'}
          >
            {seg.text}
          </span>
        ),
      )}
    </span>
  )
}

/** KaTeX output, with a never-trust guard: if the render fell back to the
    raw TeX (KaTeX missing or throwing), the TeX stays a text node and is
    never injected as HTML. */
function MathHtml({ tex, display }: { tex: string; display: boolean }) {
  const html = renderTexToHtml(tex, display)
  if (html === tex) {
    return (
      <span dir="ltr" className={display ? 'math-display-block' : 'math-inline-span'}>
        {tex}
      </span>
    )
  }
  return (
    <span
      dir="ltr"
      className={display ? 'math-display-block' : 'math-inline-span'}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export default MathText
