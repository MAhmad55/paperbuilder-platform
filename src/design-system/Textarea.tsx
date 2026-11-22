import { forwardRef, useId, type TextareaHTMLAttributes, type ReactNode } from 'react'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string | null
  helper?: string
  required?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, helper, required, id, className, ...rest },
  ref,
) {
  const autoId = useId()
  const textareaId = id ?? autoId
  const errorId = error ? `${textareaId}-error` : undefined
  const helperId = helper && !error ? `${textareaId}-helper` : undefined

  return (
    <div className="pb-field">
      {label && (
        <label htmlFor={textareaId} className="pb-label">
          {label}
          {required && <span aria-hidden="true" style={{ color: 'var(--pen-600)' }}> *</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        className={['pb-textarea', error && 'pb-textarea--error', className].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={errorId ?? helperId}
        {...rest}
      />
      {error ? (
        <p className="pb-error-text" id={errorId} role="alert">{error}</p>
      ) : helper ? (
        <p className="pb-helper" id={helperId}>{helper}</p>
      ) : null}
    </div>
  )
})

export default Textarea
