import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  body?: string
  children?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, body, children, className }: EmptyStateProps) {
  return (
    <div className={['pb-empty', className].filter(Boolean).join(' ')} role="status">
      <div className="pb-empty__icon" aria-hidden="true">{icon ?? <Inbox size={26} />}</div>
      <div className="pb-empty__title">{title}</div>
      {body && <div className="pb-empty__body">{body}</div>}
      {children && <div className="pb-empty__actions">{children}</div>}
    </div>
  )
}

export default EmptyState
