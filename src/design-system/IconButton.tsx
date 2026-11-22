import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label: string
  variant?: 'default' | 'bordered' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = 'default', size = 'md', disabled, className, type = 'button', ...rest },
  ref,
) {
  const cls = [
    'pb-icon-btn',
    variant !== 'default' && `pb-icon-btn--${variant}`,
    size !== 'md' && `pb-icon-btn--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      ref={ref}
      type={type}
      className={cls}
      aria-label={label}
      title={label}
      disabled={disabled}
      {...rest}
    >
      {icon}
    </button>
  )
})

export default IconButton
