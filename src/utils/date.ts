import type { AppLanguage } from '../i18n'

const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const
const MONTH_UR = ['جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون', 'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'] as const

/**
 * Format an ISO date/datetime string as "15 Dec 2026" (day, month name, year) —
 * never a numeric 12/15/2026 style string. Time component is kept when present.
 */
export function formatDate(value: string, lang: AppLanguage): string {
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  const months = lang === 'ur' ? MONTH_UR : MONTH_EN
  const month = months[d.getMonth()]
  return `${d.getDate()} ${month} ${d.getFullYear()}`
}

/** Format an ISO datetime as "15 Dec 2026 · 14:20". */
export function formatDateTime(value: string, lang: AppLanguage): string {
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  const hasTime = value.includes('T') || value.includes(':')
  if (!hasTime) return formatDate(value, lang)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${formatDate(value, lang)} · ${hh}:${mm}`
}

export interface DateParts {
  day: string
  month: string
  year: string
}

/** Split an ISO value into raw date parts (for <select>s), tolerating invalid input. */
export function parseDateParts(value: string): DateParts {
  const d = new Date(value)
  if (isNaN(d.getTime())) return { day: '', month: '', year: '' }
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: String(d.getMonth() + 1).padStart(2, '0'),
    year: String(d.getFullYear()),
  }
}

export function buildIsoDate(day: string, month: string, year: string): string {
  if (!day || !month || !year) return ''
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}
