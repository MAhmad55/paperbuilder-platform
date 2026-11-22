import { useId, type ReactNode } from 'react'

export interface TooltipProps extends React.HTMLAttributes<HTMLSpanElement> {
  text: string
  children: ReactNode
  placement?: 'top' | 'bottom'
}

export function Tooltip({ text, children, placement = 'top', ...rest }: TooltipProps) {
  const id = useId()
  return (
    <span className="pb-tooltip" tabIndex={0} aria-describedby={id} data-placement={placement} style={{ cursor: 'help' }} {...rest}>
      {children}
      <span role="tooltip" id={id} className="pb-tooltip__bubble">{text}</span>
    </span>
  )
}

export default Tooltip
