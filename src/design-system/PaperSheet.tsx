import type { ReactNode } from 'react'
import { MathText } from './MathText'

export interface PaperMetaItem { label: string; value: string }

export interface PaperSheetProps {
  mode: 'en' | 'ur'
  schoolName: string
  schoolInitials?: string
  title: string
  subtitle?: string
  meta: PaperMetaItem[]
  marks: number
  instructions?: string[]
  footer?: ReactNode
  children?: ReactNode
  className?: string
}

/**
 * PaperSheet — renders a true A4 sheet (210 x 297 mm ratio).
 * Used by the studio preview, the full-page preview and the print stylesheet.
 */
export function PaperSheet({
  mode,
  schoolName,
  schoolInitials,
  title,
  subtitle,
  meta,
  marks,
  instructions,
  footer,
  children,
  className,
}: PaperSheetProps) {
  return (
    <div className={`pb-paper-scaler${className ? ` ${className}` : ''}`}>
      <article
        data-sample-artifact="paper"
        className={['pb-paper', mode === 'ur' && 'pb-paper--ur'].filter(Boolean).join(' ')}
        aria-label={`${title} — paper`}
        lang={mode === 'ur' ? 'ur' : 'en'}
        dir={mode === 'ur' ? 'rtl' : 'ltr'}
      >
        <header className="pb-paper__header">
          <div className="pb-paper__school">
            <span className="pb-paper__logo" aria-hidden="true">
              {schoolInitials ?? schoolName.split(/\s+/).map(w => w[0]).slice(0, 2).join('')}
            </span>
            <div>
              <div className="pb-paper__school-name">{schoolName}</div>
              <div className="pb-paper__school-note">{mode === 'ur' ? 'امتحان کاغذ' : 'Examination paper'}</div>
            </div>
          </div>
          <div className="pb-paper__marks-block">
            <div className="pb-paper__marks-label">{mode === 'ur' ? 'کل مارک' : 'Total marks'}</div>
            <div className="pb-paper__marks-value">{marks}</div>
          </div>
        </header>

        <h1 className="pb-paper__title">{title}</h1>
        {subtitle && <div className="pb-paper__subtitle">{subtitle}</div>}

        {meta.length > 0 && (
          <dl className="pb-paper__meta">
            {meta.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <dt style={{ fontSize: '1.35cqw', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{m.label}</dt>
                <dd style={{ margin: 0 }}><b>{m.value}</b></dd>
              </div>
            ))}
          </dl>
        )}

        {instructions && instructions.length > 0 && (
          <div className="pb-paper__instructions">
            {instructions.map((line, i) => <p key={i} style={{ margin: i ? '2px 0 0' : 0 }}><MathText text={line} /></p>)}
          </div>
        )}

        <div className="pb-paper__body">{children}</div>

        <footer className="pb-paper__footer">
          {footer ?? (
            <>
              <span>{schoolName}</span>
              <span className="pb-paper__footer-page">1 / 1</span>
            </>
          )}
        </footer>
      </article>
    </div>
  )
}

export default PaperSheet
