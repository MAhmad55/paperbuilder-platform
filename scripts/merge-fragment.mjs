// Merge one i18n fragment into en.json / ur.json (deep merge by key).
// Usage: node scripts/merge-fragment.mjs <scope>
//   reads src/i18n/fragments/<scope>.en.json and <scope>.ur.json
//   and deep-merges each into src/i18n/<lang>.json.
// Fragments are the source of truth; re-running is safe (idempotent).
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const scope = process.argv[2]
if (!scope) {
  console.error('Usage: node scripts/merge-fragment.mjs <scope>')
  process.exit(1)
}

function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== 'object') target[key] = {}
      deepMerge(target[key], value)
    } else {
      target[key] = value
    }
  }
  return target
}

for (const lang of ['en', 'ur']) {
  const fragPath = path.resolve(`src/i18n/fragments/${scope}.${lang}.json`)
  if (!existsSync(fragPath)) {
    console.error(`missing fragment: ${fragPath}`)
    process.exit(1)
  }
  const targetPath = path.resolve(`src/i18n/${lang}.json`)
  const target = JSON.parse(readFileSync(targetPath, 'utf8'))
  const frag = JSON.parse(readFileSync(fragPath, 'utf8'))
  deepMerge(target, frag)
  writeFileSync(targetPath, JSON.stringify(target, null, 2) + '\n', 'utf8')
  console.log(`merged ${scope}.${lang}.json into ${lang}.json`)
}
