import type { ReactNode } from 'react'

export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: ReactNode
  description?: string
  disabled?: boolean
}

export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  return (
    <div className="pb-switch-row">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={typeof label === 'string' ? label : undefined}
        className="pb-switch"
        disabled={disabled}
        onClick={() => onChange(!checked)}
      >
        <span aria-hidden="true" style={{ position: 'absolute' }} />
      </button>
      {(label || description) && (
        <span style={{ flex: 1, minWidth: 0 }}>
          {label && <span style={{ display: 'block', fontSize: 14, color: 'var(--ink-900)' }}>{label}</span>}
          {description && <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>{description}</span>}
        </span>
      )}
    </div>
  )
}

export default Switch
