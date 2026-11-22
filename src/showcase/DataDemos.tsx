import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SearchField, FilterBar, Pagination, Table, Avatar, StatusChip } from '../design-system'
import { Demo } from './Demo'
import Bidi from '../utils/bidi'
import { formatDate } from '../utils/date'
import type { AppLanguage } from '../i18n'

interface Student {
  id: string
  name: string
  city: string
  plan: string
  teachers: number
  status: 'active' | 'pending' | 'suspended' | 'rejected'
  lastActive: string
}

// School names are sample data — kept in English.
const SAMPLE: Student[] = [
  { id: 'sch-beacon', name: 'Beacon Model School', city: 'Lahore', plan: 'Growth', teachers: 6, status: 'active', lastActive: '2026-11-21' },
  { id: 'sch-meadowlands', name: 'Meadowlands School', city: 'Karachi', plan: 'Starter', teachers: 5, status: 'active', lastActive: '2026-11-20' },
  { id: 'sch-sapphire', name: 'Sapphire Trust School', city: 'Peshawar', plan: 'Enterprise', teachers: 6, status: 'active', lastActive: '2026-11-19' },
  { id: 'sch-sunrise', name: 'Sunrise College', city: 'Multan', plan: 'Starter', teachers: 4, status: 'active', lastActive: '2026-11-18' },
  { id: 'sch-darulilm', name: 'Dar-ul-Ilm School', city: 'Gujranwala', plan: 'Growth', teachers: 5, status: 'pending', lastActive: '2026-11-17' },
  { id: 'sch-aurora', name: 'Aurora College', city: 'Hyderabad', plan: 'Enterprise', teachers: 6, status: 'suspended', lastActive: '2026-11-15' },
]

export function DataDemos() {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const columns = [
    { id: 'name', header: t('common.name'), sortable: true, cell: (r: Student) => <span style={{ fontWeight: 600 }}>{r.name}</span> },
    { id: 'city', header: t('common.city'), sortable: true, cell: (r: Student) => r.city },
    { id: 'plan', header: t('common.plan'), sortable: true, cell: (r: Student) => r.plan },
    { id: 'teachers', header: t('common.teachers'), sortable: true, align: 'end' as const, cell: (r: Student) => <Bidi>{r.teachers}</Bidi> },
    { id: 'status', header: t('common.status'), sortable: false, cell: (r: Student) => <StatusChip status={r.status as any} /> },
    { id: 'lastActive', header: t('common.lastActive'), sortable: true, cell: (r: Student) => <Bidi className="pb-mono">{formatDate(r.lastActive, lang)}</Bidi> },
  ]

  return (
    <>
      <Demo
        id="search"
        title={t('copy.data.titleSearch')}
        note={t('copy.data.searchNote')}
        states={['default', 'loading']}
        render={state => (
          <SearchField
            value={search}
            onChange={setSearch}
            loading={state === 'loading'}
            placeholder={t('copy.data.searchPlaceholder')}
            ariaLabel={t('copy.data.searchAria')}
          />
        )}
      />
      <Demo
        id="filter-bar"
        title={t('copy.data.titleFilter')}
        states={['default']}
        render={() => (
          <FilterBar
            search={{ value: search, onChange: setSearch, placeholder: t('copy.data.searchPlaceholder') }}
            filters={
              <>
                <label className="pb-checkbox-row" style={{ minHeight: 0 }}>
                  <input type="checkbox" className="pb-checkbox" aria-label={t('copy.data.filterApprovedOnly')} />
                  <span>{t('copy.data.filterApprovedOnly')}</span>
                </label>
                <button type="button" className="pb-btn pb-btn--secondary pb-btn--sm">{t('copy.data.filterPlanAll')}</button>
              </>
            }
            onClearAll={() => setSearch('')}
          />
        )}
      />
      <Demo
        id="avatar"
        title={t('copy.data.titleAvatar')}
        states={['default']}
        render={() => (
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Avatar name="Asma Malik" size="sm" />
            <Avatar name="Asma Malik" size="md" status="active" />
            <Avatar name="Asma Malik" size="lg" status="invited" />
            <Avatar name="Fatima Hasan" size="lg" status="inactive" />
          </div>
        )}
      />
      <Demo
        id="pagination"
        title={t('copy.data.titlePagination')}
        states={['default']}
        render={() => (
          <Pagination page={page} totalPages={7} onPageChange={setPage} ariaLabel={t('copy.data.paginationAria')} />
        )}
      />
      <Demo
        id="table"
        title={t('copy.data.titleTable')}
        note={t('copy.data.tableNote')}
        states={['default']}
        wide
        render={() => (
          <Table<Student> columns={columns} data={SAMPLE} selectable ariaLabel={t('copy.data.tableAria')} emptyTitle={t('copy.data.tableEmptyTitle')} />
        )}
      />
    </>
  )
}

export default DataDemos
