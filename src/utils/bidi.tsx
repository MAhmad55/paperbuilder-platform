import type { ReactNode } from 'react'

/**
 * Shared bidi guard: wraps any numeric/Latin run so it keeps its own order
 * inside Urdu (RTL) sentences. Apply this to school/person names, dates,
 * numeric unit strings, etc.
 *
 * DIR is always "auto" — safe for both LTR and RTL documents.
 */
export function Bidi({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <bdi dir="auto" className={['bdi', className].filter(Boolean).join(' ')}>
      {children}
    </bdi>
  )
}

export default Bidi
