import type { CSSProperties } from 'react'

export interface SkeletonProps {
  variant?: 'line' | 'circle' | 'rect'
  width?: string | number
  height?: number
  count?: number
  className?: string
  style?: CSSProperties
}

export function Skeleton({ variant = 'line', width, height, count = 1, className, style }: SkeletonProps) {
  if (variant === 'circle') {
    const size = height ?? 40
    return (
      <span
        className={['pb-skeleton', 'pb-skeleton--circle', className].filter(Boolean).join(' ')}
        style={{ width: size, height: size, display: 'inline-block', ...style }}
        aria-hidden="true"
      />
    )
  }
  if (count <= 1) {
    return (
      <span
        className={['pb-skeleton', `pb-skeleton--${variant}`, className].filter(Boolean).join(' ')}
        style={{ width, height, display: 'block', ...style }}
        aria-hidden="true"
      />
    )
  }
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 8 }} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={['pb-skeleton', `pb-skeleton--${variant}`, className].filter(Boolean).join(' ')}
          style={{
            width: style?.width ?? (i === count - 1 ? '65%' : (width ?? '100%')),
            height: height ?? 14,
            display: 'block',
          }}
        />
      ))}
    </span>
  )
}

export default Skeleton
