import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SearchField } from './SearchField'

export interface FilterBarProps {
  search?: {
    value: string
    onChange: (value: string) => void
    loading?: boolean
    placeholder?: string
  }
  filters?: ReactNode
  onClearAll?: () => void
  className?: string
}

export function FilterBar({ search, filters, onClearAll, className }: FilterBarProps) {
  const { t } = useTranslation()
  return (
    <div className={['pb-filterbar', className].filter(Boolean).join(' ')} role="toolbar" aria-label={t('common.filtersAria')}>
      {search && (
        <div className="pb-filterbar__search">
          <SearchField value={search.value} onChange={search.onChange} loading={search.loading} placeholder={search.placeholder} />
        </div>
      )}
      {filters && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>{filters}</div>}
      {onClearAll && (
        <button type="button" className="pb-btn pb-btn--ghost pb-btn--sm" onClick={onClearAll}>
          {t('common.clearAll')}
        </button>
      )}
    </div>
  )
}

export default FilterBar
