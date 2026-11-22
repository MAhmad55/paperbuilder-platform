import { forwardRef, useId, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

export interface SelectOption { value: string; label: string }

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string
  error?: string | null
  helper?: string
  required?: boolean
  options: SelectOption[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, helper, required, options, id, className, ...rest },
  ref,
) {
  const autoId = useId()
  const selectId = id ?? autoId
  const errorId = error ? `${selectId}-error` : undefined
  const helperId = helper && !error ? `${selectId}-helper` : undefined

  return (
    <div className="pb-field">
      {label && (
        <label htmlFor={selectId} className="pb-label">
          {label}
          {required && <span aria-hidden="true" style={{ color: 'var(--pen-600)' }}> *</span>}
        </label>
      )}
      <div className="pb-select-wrap">
        <select
          ref={ref}
          id={selectId}
          className={['pb-select', error && 'pb-select--error', className].filter(Boolean).join(' ')}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          aria-describedby={errorId ?? helperId}
          {...rest}
        >
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="pb-select-wrap__chevron flip-rtl" aria-hidden="true">
          <ChevronDown size={18} />
        </span>
      </div>
      {error ? (
        <p className="pb-error-text" id={errorId} role="alert">{error}</p>
      ) : helper ? (
        <p className="pb-helper" id={helperId}>{helper}</p>
      ) : null}
    </div>
  )
})

export default Select
