import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays, ChevronDown } from 'lucide-react'
import { formatDate, parseDateParts, buildIsoDate } from '../utils/date'
import Bidi from '../utils/bidi'
import type { AppLanguage } from '../i18n'

export interface DatePickerProps {
  label?: string
  error?: string | null
  helper?: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  disabled?: boolean
  id?: string
}

const MONTH_NAMES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const
const MONTH_NAMES_UR = ['جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون', 'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'] as const

/**
 * Date picker rendered as a formatted text control ("15 Dec 2026") with a
 * small day/month/year popover — never the browser-native numeric date.
 */
export function DatePicker({ label, error, helper, required, value, onChange, disabled, id }: DatePickerProps) {
  const { t, i18n } = useTranslation()
  const autoId = useId()
  const inputId = id ?? autoId
  const errorId = error ? `${inputId}-error` : undefined
  const helperId = helper && !error ? `${inputId}-helper` : undefined
  const wrapRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(parseDateParts(value))
  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage
  const monthNames = lang === 'ur' ? MONTH_NAMES_UR : MONTH_NAMES_EN

  const close = () => {
    setDraft(parseDateParts(value))
    setOpen(false)
  }

  const toggle = () => {
    if (disabled) return
    setDraft(parseDateParts(value))
    setOpen(o => !o)
  }

  const apply = () => {
    const iso = buildIsoDate(draft.day, draft.month, draft.year)
    if (iso) onChange(iso)
    close()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { e.preventDefault(); close() }
    if (e.key === 'Enter') { e.preventDefault(); apply() }
  }

  return (
    <div className="pb-field">
      {label && (
        <label htmlFor={inputId} className="pb-label">
          {label}
          {required && <span aria-hidden="true" style={{ color: 'var(--pen-600)' }}> *</span>}
        </label>
      )}
      <div className="pb-date-wrap" ref={wrapRef}>
        <button
          id={inputId}
          type="button"
          className={['pb-date', error && 'pb-date--error'].filter(Boolean).join(' ')}
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId ?? helperId}
          onClick={toggle}
        >
          <CalendarDays size={16} className="flip-rtl" aria-hidden="true" />
          <span><Bidi>{value ? formatDate(value, lang) : '—'}</Bidi></span>
          <ChevronDown size={16} aria-hidden="true" className="flip-rtl" />
        </button>
        {open && (
          <div className="pb-date__popover" role="dialog" aria-label={t('copy.forms.dateLabel')} onKeyDown={onKeyDown}>
            <select
              aria-label={t('copy.forms.dayLabel')}
              value={draft.day}
              onChange={e => setDraft(d => ({ ...d, day: e.target.value }))}
            >
              {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map(d => (
                <option key={d} value={d}>{Number(d)}</option>
              ))}
            </select>
            <select
              aria-label={t('copy.forms.monthLabel')}
              value={draft.month}
              onChange={e => setDraft(d => ({ ...d, month: e.target.value }))}
            >
              {monthNames.map((name, i) => (
                <option key={i + 1} value={String(i + 1).padStart(2, '0')}>{name}</option>
              ))}
            </select>
            <select
              aria-label={t('copy.forms.yearLabel')}
              value={draft.year}
              onChange={e => setDraft(d => ({ ...d, year: e.target.value }))}
            >
              {[2026, 2027, 2028].map(y => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
            <button type="button" className="pb-btn pb-btn--primary pb-btn--sm" onClick={apply}>{t('copy.forms.dateApply')}</button>
          </div>
        )}
      </div>
      {error ? (
        <p className="pb-error-text" id={errorId} role="alert">{error}</p>
      ) : helper ? (
        <p className="pb-helper" id={helperId}>{helper}</p>
      ) : null}
    </div>
  )
}

export default DatePicker
