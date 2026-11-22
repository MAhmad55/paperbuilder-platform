import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'destructive-outline'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'md' | 'lg'
  loading?: boolean
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leadingIcon,
    trailingIcon,
    disabled,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const cls = [
    'pb-btn',
    `pb-btn--${variant}`,
    size === 'lg' && 'pb-btn--lg',
    loading && 'pb-btn--loading',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      ref={ref}
      type={type}
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading ? true : undefined}
      {...rest}
    >
      {loading ? (
        <span className="pb-spinner" aria-hidden="true" />
      ) : (
        leadingIcon && <span className="pb-btn__icon" aria-hidden="true">{leadingIcon}</span>
      )}
      {children != null && <span>{children}</span>}
      {!loading && trailingIcon && (
        <span className="pb-btn__icon" aria-hidden="true">{trailingIcon}</span>
      )}
    </button>
  )
})

export default Button
