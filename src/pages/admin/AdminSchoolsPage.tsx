import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../shell/PageHeader'
import { Banner, Button, SearchField, Select, Skeleton, StatusChip, Table, type TableColumn } from '../../design-system'
import { PLANS, SchoolService } from '../../services/mock-store'
import type { School, SchoolStatus } from '../../mock/data'
import { Bidi } from '../../utils/bidi'
import { formatDate } from '../../utils/date'
import type { AppLanguage } from '../../i18n'
import '../../styles/admin-schools.css'

const STATUS_OPTIONS: SchoolStatus[] = ['pending', 'active', 'suspended', 'rejected']

type DemoMode = 'loading' | 'empty' | 'error' | null

function demoModeOf(value: string | null): DemoMode {
  return value === 'loading' || value === 'empty' || value === 'error' ? value : null
}

function isStatusFilter(value: string | null): value is SchoolStatus {
  return value !== null && (STATUS_OPTIONS as string[]).includes(value)
}

/** "Last active" from a days-ago count; "—" when the school was never active. */
function lastActiveLabel(school: School, lang: AppLanguage): string {
  if (school.lastActiveDaysAgo === null) return '—'
  const d = new Date()
  d.setDate(d.getDate() - school.lastActiveDaysAgo)
  return formatDate(d.toISOString(), lang)
}

/** Super Admin schools list — Phase 3 B2. Filters + sortable, selectable table. */
export function AdminSchoolsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage
  const demoMode = demoModeOf(params.get('demo'))
  const statusParam = params.get('status')

  const [statusFilter, setStatusFilter] = useState<string>(() =>
    isStatusFilter(statusParam) ? statusParam : 'all',
  )
  const [planFilter, setPlanFilter] = useState('all')
  const [cityFilter, setCityFilter] = useState('all')
  const [query, setQuery] = useState('')

  /* Dashboard links arrive as /admin/schools?status=active — pre-filter from the URL. */
  useEffect(() => {
    if (isStatusFilter(statusParam)) setStatusFilter(statusParam)
  }, [statusParam])

  /* Simulated fetch so the loading state is real (mock data is synchronous). */
  useEffect(() => {
    if (demoMode === 'loading') {
      setLoading(true)
      setLoadFailed(false)
      return
    }
    if (demoMode === 'error') {
      setLoading(false)
      setLoadFailed(true)
      return
    }
    setLoadFailed(false)
    setLoading(true)
    const handle = window.setTimeout(() => setLoading(false), 350)
    return () => window.clearTimeout(handle)
  }, [demoMode])

  const retry = () => {
    const next = new URLSearchParams(params)
    next.delete('demo')
    setParams(next, { replace: true })
  }

  const schools = SchoolService.list()
  const cities = useMemo(
    () => [...new Set(schools.map((s) => s.city))].sort((a, b) => a.localeCompare(b)),
    [schools],
  )

  const applyStatusFilter = (value: string) => {
    setStatusFilter(value)
    const next = new URLSearchParams(params)
    if (isStatusFilter(value)) next.set('status', value)
    else next.delete('status')
    setParams(next, { replace: true })
  }

  const clearFilters = () => {
    setStatusFilter('all')
    setPlanFilter('all')
    setCityFilter('all')
    setQuery('')
    const next = new URLSearchParams(params)
    next.delete('status')
    next.delete('demo')
    setParams(next, { replace: true })
  }

  const filtered = useMemo(() => {
    if (demoMode === 'empty') return []
    const q = query.trim().toLowerCase()
    return schools.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false
      if (planFilter !== 'all' && s.plan !== planFilter) return false
      if (cityFilter !== 'all' && s.city !== cityFilter) return false
      if (q && !`${s.name} ${s.city}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [demoMode, schools, statusFilter, planFilter, cityFilter, query])

  const columns: TableColumn<School>[] = [
    {
      id: 'name',
      header: t('admin.schools.columns.name'),
      cell: (school) => (
        <Link to={`/admin/schools/${school.id}`} className="admin-schools__name">
          <Bidi>{school.name}</Bidi>
        </Link>
      ),
    },
    {
      id: 'city',
      header: t('admin.schools.columns.city'),
      cell: (school) => <Bidi>{school.city}</Bidi>,
    },
    {
      id: 'status',
      header: t('admin.schools.columns.status'),
      cell: (school) => <StatusChip status={school.status} />,
    },
    {
      id: 'plan',
      header: t('admin.schools.columns.plan'),
      cell: (school) => {
        const plan = PLANS.find((p) => p.id === school.plan)
        return <Bidi>{lang === 'ur' ? (plan?.nameUr ?? school.plan) : (plan?.name ?? school.plan)}</Bidi>
      },
    },
    {
      id: 'teachers',
      header: t('admin.schools.columns.teachers'),
      align: 'end',
      cell: (school) => <Bidi>{school.teacherCount}</Bidi>,
    },
    {
      id: 'papers',
      header: t('admin.schools.columns.papers'),
      align: 'end',
      cell: (school) => <Bidi>{school.paperCount}</Bidi>,
    },
    {
      id: 'lastActive',
      header: t('admin.schools.columns.lastActive'),
      cell: (school) => <Bidi>{lastActiveLabel(school, lang)}</Bidi>,
    },
  ]

  return (
    <div className="admin-schools">
      <PageHeader
        title={t('nav.schools')}
        lead={t('admin.schools.lead')}
        action={
          <Button variant="secondary" onClick={() => navigate('/admin/approvals')}>
            {t('admin.schools.viewApprovals')}
          </Button>
        }
      />

      {loading ? (
        <div className="admin-schools__loading" aria-label={t('common.loading')} role="status">
          <div className="admin-schools__filters">
            <Skeleton variant="rect" height={44} />
            <Skeleton variant="rect" height={44} />
            <Skeleton variant="rect" height={44} />
            <Skeleton variant="rect" height={44} />
          </div>
          <Skeleton variant="rect" height={52} count={6} />
        </div>
      ) : loadFailed ? (
        <div className="admin-schools__error">
          <Banner variant="error" title={t('admin.schools.error.title')}>
            {t('admin.schools.error.body')}
          </Banner>
          <Button variant="primary" size="lg" onClick={retry}>
            {t('common.retry')}
          </Button>
        </div>
      ) : (
        <>
          <div className="admin-schools__filters">
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder={t('admin.schools.filters.search')}
              ariaLabel={t('admin.schools.filters.search')}
            />
            <Select
              label={t('admin.schools.filters.status')}
              value={statusFilter}
              onChange={(e) => applyStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: t('admin.schools.filters.all') },
                ...STATUS_OPTIONS.map((s) => ({ value: s, label: t(`status.${s}`) })),
              ]}
            />
            <Select
              label={t('admin.schools.filters.plan')}
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              options={[
                { value: 'all', label: t('admin.schools.filters.all') },
                ...PLANS.map((p) => ({ value: p.id, label: lang === 'ur' ? p.nameUr : p.name })),
              ]}
            />
            <Select
              label={t('admin.schools.filters.city')}
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              options={[
                { value: 'all', label: t('admin.schools.filters.all') },
                ...cities.map((city) => ({ value: city, label: city })),
              ]}
            />
          </div>

          <p className="admin-schools__count" role="status">
            {t('admin.schools.results', { count: filtered.length, total: schools.length })}
          </p>

          <Table
            columns={columns}
            data={filtered}
            selectable
            ariaLabel={t('nav.schools')}
            emptyTitle={t('admin.schools.empty.title')}
            emptyBody={t('admin.schools.empty.body')}
            emptyAction={{ label: t('admin.schools.empty.clearFilters'), onClick: clearFilters }}
          />
        </>
      )}
    </div>
  )
}

export default AdminSchoolsPage
