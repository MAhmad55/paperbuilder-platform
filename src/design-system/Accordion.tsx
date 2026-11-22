import { useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export interface AccordionItem {
  id: string
  question: string
  answer: string
}

export interface AccordionProps {
  items: AccordionItem[]
  ariaLabel?: string
}

/**
 * Accordion — single-open list of questions.
 *
 * Keyboard: ArrowDown / ArrowUp move focus between items, Home / End jump
 * to the first / last item, Enter / Space toggle (native button behaviour).
 * Styles live in src/styles/landing.css (pb-accordion) until the component
 * is promoted to the design-system showcase.
 */
export function Accordion({ items, ariaLabel }: AccordionProps) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null)
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([])

  const focusItem = (index: number) => {
    const count = items.length
    if (count === 0) return
    const next = (index + count) % count
    buttonRefs.current[next]?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      focusItem(index + 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      focusItem(index - 1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      buttonRefs.current[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      buttonRefs.current[items.length - 1]?.focus()
    }
  }

  return (
    <div className="pb-accordion">
      {items.map((item, i) => {
        const open = openId === item.id
        return (
          <div key={item.id} className="pb-accordion__item">
            <h3 className="pb-accordion__heading">
              <button
                ref={el => { buttonRefs.current[i] = el }}
                type="button"
                id={`accordion-button-${item.id}`}
                className="pb-accordion__button"
                aria-expanded={open}
                aria-controls={`accordion-panel-${item.id}`}
                onClick={() => setOpenId(open ? null : item.id)}
                onKeyDown={e => onKeyDown(e, i)}
              >
                <span>{item.question}</span>
                <ChevronDown size={20} aria-hidden="true" className="pb-accordion__icon" />
              </button>
            </h3>
            <div
              id={`accordion-panel-${item.id}`}
              className="pb-accordion__panel"
              role="region"
              aria-labelledby={`accordion-button-${item.id}`}
              hidden={!open}
            >
              <p>{item.answer}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default Accordion
