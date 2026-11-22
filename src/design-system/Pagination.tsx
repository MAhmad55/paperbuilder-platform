import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Bidi from '../utils/bidi'

export interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  previousLabel?: string
  nextLabel?: string
  ariaLabel?: string
}

function range(start: number, end: number) {
  const out: number[] = []
  for (let i = start; i <= end; i++) out.push(i)
  return out
}

export function Pagination({ page, totalPages, onPageChange, previousLabel, nextLabel, ariaLabel }: PaginationProps) {
  const { t } = useTranslation()
  const resolvedPrevious = previousLabel ?? t('common.previous')
  const resolvedNext = nextLabel ?? t('common.next')
  const resolvedAria = ariaLabel ?? t('common.paginationAria')
  if (totalPages <= 1) return null
  const pages: (number | 'gap')[] = []
  const add = (n: number) => pages.push(n)
  const gap = () => { if (pages[pages.length - 1] !== 'gap') pages.push('gap') }

  if (totalPages <= 7) {
    range(1, totalPages).forEach(add)
  } else {
    add(1)
    if (page > 3) gap()
    range(Math.max(2, page - 1), Math.min(totalPages - 1, page + 1)).forEach(add)
    if (page < totalPages - 2) gap()
    add(totalPages)
  }

  return (
    <nav className="pb-pagination" aria-label={resolvedAria}>
      <button
        type="button"
        className="pb-pagination__btn pb-pagination__btn--prev"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label={resolvedPrevious}
      >
        <ChevronLeft className="flip-rtl" size={16} aria-hidden="true" />
      </button>
      <span className="pb-pagination__compact" aria-hidden="true">
        <Bidi>{`${page} / ${totalPages}`}</Bidi>
      </span>
      {pages.map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} className="pb-pagination__ellipsis" aria-hidden="true">…</span>
        ) : (
          <button
            key={p}
            type="button"
            className="pb-pagination__btn"
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        className="pb-pagination__btn pb-pagination__btn--next"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label={resolvedNext}
      >
        <ChevronRight className="flip-rtl" size={16} aria-hidden="true" />
      </button>
    </nav>
  )
}

export default Pagination
