import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface ComboboxOption {
  value: string
  label: string
  hint?: string
}

export interface ComboboxProps {
  options: ComboboxOption[]
  value: string | null
  onChange: (value: string | null) => void
  label?: string
  error?: string | null
  placeholder?: string
  disabled?: boolean
  maxResults?: number
  emptyLabel?: string
  allowClear?: boolean
}

export function Combobox({
  options,
  value,
  onChange,
  label,
  error,
  placeholder: placeholderProp,
  disabled,
  maxResults = 8,
  emptyLabel: emptyLabelProp,
  allowClear = true,
}: ComboboxProps) {
  const { t } = useTranslation()
  const baseId = useId()
  const inputId = `${baseId}-combobox`
  const listboxId = `${baseId}-listbox`
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const resolvedEmptyLabel = emptyLabelProp ?? t('common.noResults')
  const placeholder = placeholderProp ?? t('common.typeToSearch')
  const selected = useMemo(() => options.find(o => o.value === value) ?? null, [options, value])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? options.filter(o => o.label.toLowerCase().includes(q) || (o.hint?.toLowerCase().includes(q) ?? false))
      : options
    return list.slice(0, maxResults)
  }, [options, query, maxResults])

  useEffect(() => {
    setQuery(selected?.label ?? '')
  }, [selected])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onDocKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onDocKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onDocKey)
    }
  }, [open])

  const select = (optionValue: string | null) => {
    onChange(optionValue)
    setOpen(false)
    setHighlighted(-1)
    setQuery(options.find(o => o.value === optionValue)?.label ?? '')
    inputRef.current?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!open) setOpen(true)
        else setHighlighted(h => (h + 1) % Math.max(1, filtered.length))
        break
      case 'ArrowUp':
        e.preventDefault()
        setOpen(true)
        setHighlighted(h => (h <= 0 ? filtered.length - 1 : h - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (open && highlighted >= 0 && filtered[highlighted]) {
          select(filtered[highlighted].value)
        }
        break
      case 'Escape':
        setOpen(false)
        setHighlighted(-1)
        break
      case 'Tab':
        setOpen(false)
        setHighlighted(-1)
        break
    }
  }

  useEffect(() => {
    if (open && highlighted >= 0) {
      const el = listRef.current?.querySelector<HTMLLIElement>(`[data-index="${highlighted}"]`)
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlighted, open])

  return (
    <div className="pb-field">
      {label && (
        <label htmlFor={inputId} className="pb-label">{label}</label>
      )}
      <div className="pb-combobox" ref={containerRef}>
        <div className="pb-combobox__input-wrap">
          <span className="pb-combobox__icon" aria-hidden="true"><Search size={17} /></span>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            className="pb-input"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-activedescendant={highlighted >= 0 ? `${listboxId}-opt-${highlighted}` : undefined}
            aria-invalid={error ? true : undefined}
            aria-label={label ?? placeholder}
            autoComplete="off"
            disabled={disabled}
            placeholder={placeholder}
            value={query}
            onFocus={() => { setOpen(true); setHighlighted(-1) }}
            onChange={e => {
              setQuery(e.target.value)
              setOpen(true)
              setHighlighted(-1)
              if (selected && e.target.value !== selected.label) {
                onChange(null)
              }
            }}
            onKeyDown={onKeyDown}
          />
          {allowClear && value && !disabled && (
            <button
              type="button"
              className="pb-combobox__clear"
              aria-label={t('common.clearSelection')}
              onClick={() => select(null)}
            >
              <X size={15} />
            </button>
          )}
        </div>
        {open && !disabled && (
          <ul className="pb-combobox__listbox" role="listbox" id={listboxId} ref={listRef} aria-label={label ?? placeholder}>
            {filtered.length === 0 ? (
              <li className="pb-combobox__empty" role="status">{resolvedEmptyLabel}</li>
            ) : (
              filtered.map((o, i) => (
                <li
                  key={o.value}
                  id={`${listboxId}-opt-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={value === o.value}
                  className="pb-combobox__option"
                  data-highlighted={highlighted === i ? 'true' : undefined}
                  onMouseDown={e => { e.preventDefault(); select(o.value) }}
                  onMouseEnter={() => setHighlighted(i)}
                >
                  <span>{o.label}</span>
                  {o.hint && <span className="pb-muted" style={{ fontSize: 11 }}>{o.hint}</span>}
                  <Check size={16} className="pb-combobox__check" aria-hidden="true" />
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      {error && <p className="pb-error-text" role="alert">{error}</p>}
    </div>
  )
}

export default Combobox
