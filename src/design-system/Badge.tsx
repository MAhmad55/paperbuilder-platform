import type { HTMLAttributes, ReactNode } from 'react'

export type BadgeTone = 'neutral' | 'ink' | 'pen' | 'mark'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  children: ReactNode
}

export function Badge({ tone = 'neutral', children, className, ...rest }: BadgeProps) {
  return (
    <span className={['pb-badge', `pb-badge--${tone}`, className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </span>
  )
}

export default Badge
