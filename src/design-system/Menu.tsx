import { useEffect, useRef, useState, type ReactNode } from 'react'

export interface MenuItem {
  id: string
  label: ReactNode
  icon?: ReactNode
  danger?: boolean
  disabled?: boolean
  onSelect?: () => void
}

export type MenuEntry = MenuItem | { id: string; divider: true }

export interface MenuProps {
  trigger: (props: { open: boolean }) => ReactNode
  items: MenuEntry[]
  align?: 'start' | 'end'
  ariaLabel?: string
}

function isDivider(entry: MenuEntry): entry is { id: string; divider: true } {
  return 'divider' in entry
}

export function Menu({ trigger, items, align = 'end', ariaLabel }: MenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const actionable = items.filter(i => !isDivider(i)) as MenuItem[]
  const enabled = actionable.filter(i => !i.disabled)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  useEffect(() => {
    if (open && enabled.length) {
      requestAnimationFrame(() => {
        const list = listRef.current
        const buttons = list?.querySelectorAll<HTMLButtonElement>('.pb-menu__item:not([disabled])') ?? []
        buttons[0]?.focus()
      })
    }
  }, [open, enabled.length])

  const focusItem = (index: number) => {
    const list = listRef.current
    const buttons = list?.querySelectorAll<HTMLButtonElement>('.pb-menu__item:not([disabled])') ?? []
    buttons[index]?.focus()
  }

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
    }
  }

  const onListKeyDown = (e: React.KeyboardEvent) => {
    const list = listRef.current
    const buttons = Array.from(list?.querySelectorAll<HTMLButtonElement>('.pb-menu__item:not([disabled])') ?? [])
    const current = buttons.findIndex(b => b === document.activeElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      focusItem((current + 1) % buttons.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      focusItem(current <= 0 ? buttons.length - 1 : current - 1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      focusItem(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      focusItem(buttons.length - 1)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    } else if (e.key === 'Tab') {
      setOpen(false)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      // default button behavior already triggers click; nothing needed
    }
  }

  const selectItem = (item: MenuItem) => {
    setOpen(false)
    item.onSelect?.()
    triggerRef.current?.focus()
  }

  let enabledIndex = -1
  return (
    <div className={['pb-menu', align === 'start' && 'pb-menu__align-start'].filter(Boolean).join(' ')} ref={rootRef}>
      <div
        ref={triggerRef}
        className="pb-menu__trigger"
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => { setOpen(o => !o) }}
        onKeyDown={onTriggerKeyDown}
      >
        {trigger({ open })}
      </div>
      {open && (
        <ul ref={listRef} className="pb-menu__list" role="menu" aria-label={ariaLabel} onKeyDown={onListKeyDown}>
          {items.map(entry => {
            if (isDivider(entry)) {
              return <li key={entry.id} role="separator" className="pb-menu__divider" />
            }
            const item = entry as MenuItem
            if (item.disabled) {
              enabledIndex = -1
              return (
                <li key={item.id} role="none">
                  <button type="button" role="menuitem" className="pb-menu__item" disabled aria-disabled="true" style={{ opacity: 0.5 }}>
                    {item.icon && <span aria-hidden="true">{item.icon}</span>}
                    <span>{item.label}</span>
                  </button>
                </li>
              )
            }
            enabledIndex += 1
            const indexInEnabled = enabled.findIndex(i => i.id === item.id)
            return (
              <li key={item.id} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className={['pb-menu__item', item.danger && 'pb-menu__item--danger'].filter(Boolean).join(' ')}
                  tabIndex={0}
                  onFocus={() => {
                    // keep list aligned with focus
                  }}
                  onMouseEnter={() => {
                    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('.pb-menu__item:not([disabled])') ?? []
                    buttons[indexInEnabled]?.focus()
                  }}
                  onClick={() => selectItem(item)}
                >
                  {item.icon && <span aria-hidden="true">{item.icon}</span>}
                  <span>{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default Menu
