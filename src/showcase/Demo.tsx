import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

export type StateKey = 'default' | 'hover' | 'focus' | 'active' | 'disabled' | 'loading' | 'error'

export interface DemoProps {
  id: string
  title: string
  note?: string
  states?: StateKey[]
  wide?: boolean
  render: (state: StateKey) => ReactNode
}

/**
 * One component-in-the-wild block in the showcase: a labelled row per state,
 * forcing visual states via data-force attributes where appropriate.
 */
export function Demo({ id, title, note, states = ['default'], wide, render }: DemoProps) {
  const { t } = useTranslation()
  return (
    <section className={['ds-demo', wide && 'ds-demo--wide'].filter(Boolean).join(' ')} id={`demo-${id}`}>
      <h3 className="ds-demo-title">{title}</h3>
      {note && <p className="ds-demo-note">{note}</p>}
      <div className="ds-states">
        {states.map(state => (
          <div className="ds-state" key={state}>
            <span className="ds-state-label">{t(`showcase.states.${state}`)}</span>
            <div className="ds-state-body">{render(state)}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default Demo
