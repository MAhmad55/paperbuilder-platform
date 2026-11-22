import Bidi from '../utils/bidi'

export interface TimelineItem {
  id: string
  title: string
  meta?: string
  description?: string
  tone?: 'default' | 'muted'
  now?: boolean
}

export interface TimelineProps {
  items: TimelineItem[]
  ariaLabel?: string
}

export function Timeline({ items, ariaLabel }: TimelineProps) {
  return (
    <ol className="pb-timeline" aria-label={ariaLabel}>
      {items.map(item => (
        <li key={item.id} className={['pb-timeline__item', item.tone === 'muted' && 'pb-timeline__item--muted'].filter(Boolean).join(' ')}>
          <span className="pb-timeline__dot" aria-hidden="true" />
          <div className="pb-timeline__content">
            <div className="pb-timeline__title">{item.title}</div>
            {item.meta && <div className="pb-timeline__meta"><Bidi>{item.meta}</Bidi></div>}
            {item.description && <div className="pb-timeline__meta" style={{ color: 'var(--muted)' }}>{item.description}</div>}
          </div>
        </li>
      ))}
    </ol>
  )
}

export default Timeline
