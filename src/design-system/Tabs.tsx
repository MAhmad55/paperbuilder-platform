import { useRef, type ReactNode } from 'react'

export interface TabsItem { value: string; label: ReactNode; disabled?: boolean }

export interface TabsProps {
  tabs: TabsItem[]
  value: string
  onChange: (value: string) => void
  ariaLabel?: string
}

export function Tabs({ tabs, value, onChange, ariaLabel }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null)

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const enabled = tabs.map((t, i) => (t.disabled ? -1 : i)).filter(i => i !== -1)
    if (!enabled.length) return
    let next = index
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      const position = enabled.indexOf(index)
      next = enabled[(position + 1) % enabled.length]
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      const position = enabled.indexOf(index)
      next = enabled[(position - 1 + enabled.length) % enabled.length]
    } else if (e.key === 'Home') next = enabled[0]
    else if (e.key === 'End') next = enabled[enabled.length - 1]
    else return
    e.preventDefault()
    onChange(tabs[next].value)
    const buttons = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])
    buttons[next]?.focus()
  }

  return (
    <div className="pb-tabs" role="tablist" aria-label={ariaLabel} ref={listRef}>
      {tabs.map((t, i) => {
        const selected = t.value === value
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            id={`tab-${t.value}`}
            aria-selected={selected}
            aria-disabled={t.disabled || undefined}
            tabIndex={selected ? 0 : -1}
            className="pb-tab"
            disabled={t.disabled}
            onClick={() => !t.disabled && onChange(t.value)}
            onKeyDown={e => onKeyDown(e, i)}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

export default Tabs
