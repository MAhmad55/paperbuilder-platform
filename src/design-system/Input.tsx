import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string | null
  helper?: string
  required?: boolean
  size?: 'md' | 'lg'
  leadingIcon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, helper, required, size = 'md', leadingIcon, id, className, ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const errorId = error ? `${inputId}-error` : undefined
  const helperId = helper && !error ? `${inputId}-helper` : undefined

  return (
    <div className="pb-field">
      {label && (
        <label htmlFor={inputId} className="pb-label">
          {label}
          {required && <span aria-hidden="true" style={{ color: 'var(--pen-600)' }}> *</span>}
        </label>
      )}
      <div className="pb-input-group">
        {leadingIcon && <span className="pb-input-group__icon">{leadingIcon}</span>}
        <input
          ref={ref}
          id={inputId}
          className={['pb-input', size === 'lg' && 'pb-input--lg', error && 'pb-input--error', className]
            .filter(Boolean).join(' ')}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          aria-describedby={errorId ?? helperId}
          {...rest}
        />
      </div>
      {error ? (
        <p className="pb-error-text" id={errorId} role="alert">{error}</p>
      ) : helper ? (
        <p className="pb-helper" id={helperId}>{helper}</p>
      ) : null}
    </div>
  )
})

export default Input
