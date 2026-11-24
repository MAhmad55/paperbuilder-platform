// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { waitFor } from '@testing-library/react'
import { render } from './test-utils'

const KATEX_SCRIPT = 'script[src="/vendor/katex/katex.min.js"]'
const KATEX_LINK = 'link[href="/vendor/katex/katex.min.css"]'

function katexScriptCount() {
  return document.querySelectorAll(KATEX_SCRIPT).length
}

function katexLinkCount() {
  return document.querySelectorAll(KATEX_LINK).length
}

/** Fresh MathText (and a fresh memoised ensureKatex) per test. */
async function loadMathText() {
  vi.resetModules()
  const mod = await import('./MathText')
  return mod.MathText
}

function stubKatexOk() {
  window.katex = {
    renderToString: (tex: string) =>
      `<span class="katex"><span class="katex-mathml">${tex}</span></span>`,
  }
}

function fireScriptLoad() {
  const script = document.querySelector(KATEX_SCRIPT) as HTMLScriptElement | null
  expect(script).not.toBeNull()
  script!.dispatchEvent(new Event('load'))
}

beforeEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
  window.katex = undefined
})

afterEach(() => {
  vi.resetModules()
  window.katex = undefined
})

describe('MathText', () => {
  it('renders plain text unchanged and never loads KaTeX', async () => {
    const MathText = await loadMathText()
    const { container } = render(<MathText text="Define Algebra in your own words." />)
    expect(container.textContent).toBe('Define Algebra in your own words.')
    expect(katexScriptCount()).toBe(0)
    expect(katexLinkCount()).toBe(0)
  })

  it('renders raw TeX first, then KaTeX HTML after ensureKatex resolves', async () => {
    const MathText = await loadMathText()
    const { container } = render(<MathText text="Solve $x^2 + 1 = 0$ for $x$." />)
    expect(container.querySelector('.katex')).toBeNull()
    expect(container.textContent).toContain('x^2 + 1 = 0')
    expect(katexScriptCount()).toBe(1)
    expect(katexLinkCount()).toBe(1)
    stubKatexOk()
    fireScriptLoad()
    await waitFor(() => {
      expect(container.querySelectorAll('.katex')).toHaveLength(2)
    })
    for (const el of container.querySelectorAll('.math-inline-span')) {
      expect(el.getAttribute('dir')).toBe('ltr')
    }
  })

  it('loads KaTeX only once across many renders', async () => {
    const MathText = await loadMathText()
    render(<MathText text="First $a^2$." />)
    render(<MathText text="Second $b^2$." />)
    render(<MathText text="Third $c^2$." />)
    expect(katexScriptCount()).toBe(1)
    expect(katexLinkCount()).toBe(1)
  })

  it('falls back to raw TeX as text when KaTeX throws', async () => {
    const MathText = await loadMathText()
    const { container } = render(<MathText text="Solve $x <b>2</b>$ now." />)
    window.katex = {
      renderToString: () => {
        throw new Error('boom')
      },
    }
    fireScriptLoad()
    await waitFor(() => {
      expect(container.querySelector('.math-inline-span')?.textContent).toBe('x <b>2</b>')
    })
    expect(container.querySelector('.katex')).toBeNull()
    expect(container.querySelector('b')).toBeNull()
  })

  it('never injects HTML from plain text', async () => {
    const MathText = await loadMathText()
    const { container } = render(
      <MathText text={'<img src="x" onerror="alert(1)"> is not an image.'} />,
    )
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('<img src="x" onerror="alert(1)">')
    expect(katexScriptCount()).toBe(0)
  })

  it('renders display math as a dir=ltr block', async () => {
    const MathText = await loadMathText()
    const { container } = render(<MathText text="The circle: $$x^2 + y^2 = r^2$$" />)
    const block = container.querySelector('.math-display-block')
    expect(block).not.toBeNull()
    expect(block!.getAttribute('dir')).toBe('ltr')
    expect(block!.textContent).toBe('x^2 + y^2 = r^2')
  })
})
