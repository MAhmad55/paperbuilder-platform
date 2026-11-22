import type { InputHTMLAttributes, ReactNode } from 'react'

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'children' | 'label'> {
  label?: ReactNode
}

export function Radio({ label, className, ...rest }: RadioProps) {
  return (
    <label className="pb-radio-row">
      <input type="radio" className={['pb-radio', className].filter(Boolean).join(' ')} {...rest} />
      {label && <span>{label}</span>}
    </label>
  )
}

export default Radio
