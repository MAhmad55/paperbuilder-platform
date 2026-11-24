import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'

import type { RowData } from '@tanstack/table-core'
declare module '@tanstack/table-core' {
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: 'start' | 'center' | 'end'
  }
}
import { ArrowDown, ArrowUp, ArrowUpDown, SearchX } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface TableColumn<T> {
  id: string
  header: string
  cell: (row: T) => ReactNode
  sortable?: boolean
  align?: 'start' | 'center' | 'end'
}

export interface TableProps<T extends { id: string }> {
  columns: TableColumn<T>[]
  data: T[]
  selectable?: boolean
  ariaLabel?: string
  emptyTitle?: string
  emptyBody?: string
  emptyAction?: { label: string; onClick: () => void }
}

/** True below the same 768px breakpoint where the CSS swaps the desktop
    table for the mobile card list. Rendering only one representation keeps
    screen-reader users from meeting every row (and every row checkbox)
    twice — `display: none` hides the other copy visually, but rendering
    a single copy is the guarantee, not the stylesheet. */
export function useIsMobileTable(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return window.matchMedia('(max-width: 768px)').matches
  })
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(max-width: 768px)')
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    }
    mq.addListener(onChange)
    return () => mq.removeListener(onChange)
  }, [])
  return isMobile
}

export function Table<T extends { id: string }>({
  columns,
  data,
  selectable = false,
  ariaLabel,
  emptyTitle,
  emptyBody,
  emptyAction,
}: TableProps<T>) {
  const { t } = useTranslation()
  const isMobile = useIsMobileTable()
  const resolvedEmptyTitle = emptyTitle ?? t('common.tableEmptyTitle')
  const resolvedEmptyBody = emptyBody ?? t('common.tableEmptyBody')
  const [sorting, setSorting] = useState<SortingState>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const tableColumns = useMemo<ColumnDef<T>[]>(() => columns.map(col => ({
    id: col.id,
    header: col.header,
    accessorFn: (row: T) => String(col.cell(row)),
    enableSorting: col.sortable !== false,
    cell: (info) => <span style={{ ...(col.align === 'center' ? { display: 'inline-block', width: '100%', textAlign: 'center' } : col.align === 'end' ? { display: 'inline-block', width: '100%', textAlign: 'end' } : undefined) }}>{col.cell(info.row.original)}</span>,
    meta: { align: col.align ?? 'start' },
  })), [columns])

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const allIds = data.map(r => r.id)
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.includes(id))

  const toggleAll = () => setSelectedIds(allSelected ? [] : [...allIds])
  const toggleOne = (id: string) =>
    setSelectedIds(ids => (ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]))

  const headerIcon = (colId: string) => {
    const column = table.getColumn(colId)
    if (!column?.getCanSort()) return null
    const sorted = column.getIsSorted()
    if (sorted === 'asc') return <ArrowUp size={14} aria-hidden="true" />
    if (sorted === 'desc') return <ArrowDown size={14} aria-hidden="true" />
    return <ArrowUpDown size={14} aria-hidden="true" />
  }

  if (data.length === 0) {
    return (
      <div className="pb-empty" role="status">
        <div className="pb-empty__icon" aria-hidden="true"><SearchX size={26} /></div>
        <div className="pb-empty__title">{resolvedEmptyTitle}</div>
        <div className="pb-empty__body">{resolvedEmptyBody}</div>
        {emptyAction && (
          <div className="pb-empty__actions">
            <button type="button" className="pb-btn pb-btn--primary" onClick={emptyAction.onClick}>
              {emptyAction.label}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {selectable && selectedIds.length > 0 && (
        <div className="pb-table__selection-bar" role="status">
          <span>{t('common.tableSelected', { count: selectedIds.length })}</span>
          <button type="button" className="pb-btn pb-btn--ghost pb-btn--sm" onClick={() => setSelectedIds([])}>
            {t('common.clear')}
          </button>
        </div>
      )}

      {/* Desktop table — rendered only above the mobile breakpoint, so
          the rows (and their checkboxes) exist exactly once in the DOM. */}
      {!isMobile && (
      <div className="pb-table-wrap">
        <table className="pb-table" aria-label={ariaLabel}>
          <thead>
            <tr>
              {selectable && (
                <th scope="col" className="pb-table__select-col">
                  <input
                    type="checkbox"
                    className="pb-checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label={t('common.selectAllRows')}
                  />
                </th>
              )}
              {table.getHeaderGroups().map(hg =>
                hg.headers.map(header => {
                  const sorted = header.column.getIsSorted()
                  return (
                  <th
                    key={header.id}
                    scope="col"
                    aria-sort={
                      header.column.getCanSort()
                        ? sorted === 'asc'
                          ? 'ascending'
                          : sorted === 'desc'
                            ? 'descending'
                            : 'none'
                        : undefined
                    }
                    style={{ textAlign: header.column.columnDef.meta?.align === 'center' ? 'center' : header.column.columnDef.meta?.align === 'end' ? 'end' : undefined }}
                  >
                    {header.column.getCanSort() ? (
                      <button
                        type="button"
                        className="pb-table__sort"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                        {headerIcon(header.column.id)}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                  )
                })
              )}
            </tr>
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => {
              const selected = selectedIds.includes(row.original.id)
              return (
                <tr key={row.id} className={selected ? 'is-selected' : undefined}>
                  {selectable && (
                    <td className="pb-table__select-col">
                      <input
                        type="checkbox"
                        className="pb-checkbox"
                        checked={selected}
                        onChange={() => toggleOne(row.original.id)}
                        aria-label={t('common.selectRow', { id: row.original.id })}
                      />
                    </td>
                  )}
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* Mobile card list — rendered only below the breakpoint, so the
          rows (and their checkboxes) exist exactly once in the DOM. */}
      {isMobile && (
      <ul className="pb-table__cards">
        {table.getRowModel().rows.map(row => {
          const selected = selectedIds.includes(row.original.id)
          return (
            <li key={row.id} className="pb-table-card" data-selected={selected ? 'true' : undefined}>
              <div className="pb-table-card__head">
                {selectable && (
                  <input
                    type="checkbox"
                    className="pb-checkbox"
                    checked={selected}
                    onChange={() => toggleOne(row.original.id)}
                    aria-label={t('common.selectRow', { id: row.original.id })}
                  />
                )}
                <strong>{columns[0] ? columns[0].cell(row.original) : row.original.id}</strong>
              </div>
              <dl className="pb-table-card__fields">
                {columns.slice(1).map(col => (
                  <div key={col.id} className="pb-table-card__field">
                    <dt>{col.header}</dt>
                    <dd>{col.cell(row.original)}</dd>
                  </div>
                ))}
              </dl>
            </li>
          )
        })}
      </ul>
      )}
    </div>
  )
}

export default Table
