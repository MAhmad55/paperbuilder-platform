#!/usr/bin/env node
/**
 * i18n parity check.
 *
 * Fails the build if:
 *   - a translation key exists in one language but not the other
 *   - a value is an empty string in either language
 *   - a ur.json value has no Arabic-script character and is not in the
 *     reviewed allowlist (scripts/i18n-allowlist.json)
 *
 * Run by `npm run build` (and `npm run dev`).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const readJson = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'))
const en = readJson('src/i18n/en.json')
const ur = readJson('src/i18n/ur.json')
const allowlistFile = readJson('scripts/i18n-allowlist.json')

function flatten(obj, prefix = '') {
  const out = new Map()
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      for (const [k, v] of flatten(value, path)) out.set(k, v)
    } else {
      out.set(path, value)
    }
  }
  return out
}

const enFlat = flatten(en)
const urFlat = flatten(ur)
const errors = []

for (const key of enFlat.keys()) {
  if (!urFlat.has(key)) errors.push(`missing key in ur.json: ${key}`)
}
for (const key of urFlat.keys()) {
  if (!enFlat.has(key)) errors.push(`missing key in en.json: ${key}`)
}
for (const [key, value] of enFlat) {
  if (typeof value !== 'string' || value.trim() === '') errors.push(`empty value in en.json: ${key}`)
}
for (const [key, value] of urFlat) {
  if (typeof value !== 'string' || value.trim() === '') errors.push(`empty value in ur.json: ${key}`)
}

/** Arabic-script coverage — a ur.json value must carry Urdu/Arabic glyphs unless reviewed. */
const ARABIC = /[؀-ۿۃ-ۿࢠ-ࣿﭐ-﷿ﹰ-ﹿ]/
const allowlist = new Map((allowlistFile.allowlist ?? []).map(a => [a.key, a]))

for (const entry of allowlistFile.allowlist ?? []) {
  if (!entry.key || !entry.reason || String(entry.reason).trim() === '') {
    errors.push(`allowlist entry missing key or reason: ${JSON.stringify(entry)}`)
  }
  if (!urFlat.has(entry.key)) errors.push(`allowlist entry with unknown key (not in ur.json): ${entry.key}`)
}

for (const [key, value] of urFlat) {
  if (typeof value !== 'string' || value.trim() === '') continue
  if (ARABIC.test(value)) continue
  const allowed = allowlist.get(key)
  if (!allowed) {
    errors.push(`ur.json value has no Arabic script and is not in the allowlist: ${key} = "${value}"`)
    continue
  }
  // value unchanged from latin-only source? en.json must also carry the same text
  // (verified via parity of keys; value need not be equal)
}

if (errors.length) {
  console.error(`\n✗ i18n parity check failed (${errors.length} problem(s)):`)
  for (const e of errors) console.error(`  - ${e}`)
  console.error('')
  process.exit(1)
}

console.log(`✓ i18n parity OK — ${enFlat.size} keys in en.json, ${urFlat.size} in ur.json (${ARABIC.test ? 'Arabic-script' : ''} check passed)`)
