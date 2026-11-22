import { describe, expect, it } from 'vitest'
import ur from '../i18n/ur.json'
// Sample-paper source as raw text (no node:fs — the app has no node types)
import samplePaperSrc from '../showcase/SamplePaper.tsx?raw'

/**
 * Urdu script guard (fix A5) — every Urdu string and every Urdu
 * sample-paper string may contain only Arabic script, allowlisted Latin,
 * digits and punctuation. Hangul, CJK and any other script is rejected.
 *
 * Implemented as a blocklist of foreign script ranges: Latin, Arabic,
 * digits, punctuation and common math symbols pass; anything from another
 * writing system fails.
 */
const FOREIGN_SCRIPTS =
  // Hangul (syllables, jamo, compatibility jamo)
  /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/u
const FOREIGN_SCRIPTS_CJK =
  // CJK ideographs, Hiragana, Katakana
  /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/u
const FOREIGN_SCRIPTS_OTHER =
  // Cyrillic, Hebrew, Devanagari, Bengali, Thai, Lao, Georgian, Armenian,
  // Ethiopic, Tibetan, Mongolian, Cherokee, Canadian Aboriginal
  /[\u0400-\u04FF\u0590-\u05FF\u0900-\u097F\u0980-\u09FF\u0E00-\u0E7F\u0E80-\u0EFF\u10A0-\u10FF\u0530-\u058F\u1200-\u137F\u0F00-\u0FFF\u1800-\u18AF\u13A0-\u13FF\u1400-\u167F]/u

const FOREIGN = new RegExp(
  `${FOREIGN_SCRIPTS.source}|${FOREIGN_SCRIPTS_CJK.source}|${FOREIGN_SCRIPTS_OTHER.source}`,
  'u',
)

function flatten(obj: unknown, prefix = ''): Array<[string, string]> {
  const out: Array<[string, string]> = []
  if (obj !== null && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      out.push(...flatten(value, prefix ? `${prefix}.${key}` : key))
    }
  } else if (typeof obj === 'string') {
    out.push([prefix, obj])
  }
  return out
}

describe('Urdu script guard', () => {
  it('ur.json values contain no foreign script', () => {
    const bad: string[] = []
    for (const [key, value] of flatten(ur)) {
      const m = value.match(FOREIGN)
      if (m) bad.push(`${key}: foreign char ${JSON.stringify(m[0])} in ${JSON.stringify(value.slice(0, 80))}`)
    }
    expect(bad).toEqual([])
  })

  it('Urdu sample-paper source contains no foreign script', () => {
    const m = samplePaperSrc.match(FOREIGN)
    expect(m).toBeNull()
  })

  it('the Section B question 3 graph word is Urdu, not Korean', () => {
    expect(samplePaperSrc).toContain('کے گراف کو')
    expect(samplePaperSrc).not.toContain('그래프')
  })
})
