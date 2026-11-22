import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'

type CardOwnProps = { title?: ReactNode; subtitle?: ReactNode }
type CardBaseProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'>

export interface CardProps extends CardBaseProps, CardOwnProps {
  padding?: 'sm' | 'default' | 'lg'
  hoverable?: boolean
  as?: 'div' | 'article'
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { padding = 'default', hoverable, as = 'div', title, subtitle, children, className, ...rest },
  ref,
) {
  const Tag = as as 'div'
  const cls = [
    'pb-card',
    padding !== 'default' && `pb-card--pad-${padding}`,
    hoverable && 'pb-card--hoverable',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Tag ref={ref as any} className={cls} {...rest}>
      {(title || subtitle) && (
        <div className="pb-card__header">
          <div>
            {title && <div className="pb-card__title">{title}</div>}
            {subtitle && <div className="pb-card__body" style={{ marginTop: 4, fontSize: 12 }}>{subtitle}</div>}
          </div>
        </div>
      )}
      {children}
    </Tag>
  )
})

export default Card
