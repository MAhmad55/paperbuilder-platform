import type { KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, X, Loader2 } from 'lucide-react'

export interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  loading?: boolean
  ariaLabel?: string
  clearable?: boolean
  onClear?: () => void
  onEnter?: () => void
}

export function SearchField({
  value,
  onChange,
  placeholder,
  loading,
  ariaLabel,
  clearable = true,
  onClear,
  onEnter,
}: SearchFieldProps) {
  const { t } = useTranslation()
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onEnter?.()
  }

  return (
    <div className="pb-search" role="search">
      <span className="pb-search__icon" aria-hidden="true"><Search size={17} /></span>
      <input
        type="search"
        className="pb-search__input"
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        aria-busy={loading || undefined}
      />
      {loading ? (
        <span className="pb-search__spinner" aria-hidden="true" role="status" />
      ) : clearable && value ? (
        <button
          type="button"
          className="pb-search__clear"
          aria-label={t('common.clearSearch')}
          onClick={() => { onChange(''); onClear?.() }}
        >
          <X size={15} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}

export default SearchField
