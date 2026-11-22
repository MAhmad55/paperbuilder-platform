import { useEffect, useRef, type InputHTMLAttributes, type ReactNode } from 'react'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'children' | 'label'> {
  label?: ReactNode
  indeterminate?: boolean
  error?: string
}

export function Checkbox({ label, indeterminate, error, className, onChange, id, ...rest }: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate
  }, [indeterminate])

  return (
    <label className="pb-checkbox-row">
      <input
        ref={ref}
        type="checkbox"
        className={['pb-checkbox', className].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        onChange={e => {
          // reset indeterminate after manual toggle
          if (ref.current) ref.current.indeterminate = false
          onChange?.(e)
        }}
        {...rest}
      />
      {label && <span>{label}</span>}
    </label>
  )
}

export default Checkbox
