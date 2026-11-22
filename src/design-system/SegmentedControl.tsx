import { useRef } from 'react'

export interface SegmentedControlOption { value: string; label: string }

export interface SegmentedControlProps {
  options: SegmentedControlOption[]
  value: string
  onChange: (value: string) => void
  ariaLabel?: string
  disabled?: boolean
}

export function SegmentedControl({ options, value, onChange, ariaLabel, disabled }: SegmentedControlProps) {
  const groupRef = useRef<HTMLDivElement>(null)

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (disabled) return
    const count = options.length
    const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl'
    let next = index
    const forward = e.key === (rtl ? 'ArrowLeft' : 'ArrowRight')
    const backward = e.key === (rtl ? 'ArrowRight' : 'ArrowLeft')
    if (forward || e.key === 'ArrowDown') next = (index + 1) % count
    else if (backward || e.key === 'ArrowUp') next = (index - 1 + count) % count
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = count - 1
    else return
    e.preventDefault()
    onChange(options[next].value)
    const buttons = Array.from(groupRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])
    buttons[next]?.focus()
  }

  return (
    <div className="pb-segmented" role="radiogroup" aria-label={ariaLabel} ref={groupRef}>
      {options.map((o, i) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className="pb-segmented__option"
            disabled={disabled}
            onClick={() => onChange(o.value)}
            onKeyDown={e => onKeyDown(e, i)}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export default SegmentedControl
