import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../shell/PageHeader'
import { Banner, Button, Card, EmptyState, Input, SearchField, Select, Skeleton, Table, useToast } from '../../design-system'
import type { TableColumn } from '../../design-system'
import { SharedService } from '../../services/mock-store'
import type { HistoryItem, HistoryKind } from '../../services/shared'
import type { AppLanguage } from '../../i18n'
import { Bidi } from '../../utils/bidi'
import { formatDateTime } from '../../utils/date'
import { demoModeOf, useSchoolDemo, useSharedUser } from './shared'

const TYPE_FILTERS: (HistoryKind | 'all')[] = ['all', 'paper', 'approval', 'print', 'edit', 'school', 'system']

function HistoryCard({ item, roomy, onOpen }: {
  item: HistoryItem
  roomy?: boolean
  onOpen: (item: HistoryItem) => void
}) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage
  return (
    <article className={roomy ? 'shared-card shared-card--roomy' : 'shared-card'}>
      <div className="shared-card__head">
        <span className="shared-card__name">{actionLabel(t, item.action)}</span>
        <span className="shared-card__meta">{formatDateTime(item.createdAt, lang)}</span>
      </div>
      <div className="shared-card__meta"><Bidi>{item.label}</Bidi></div>
      <div className="shared-card__meta">{t(`shared.history.filters.${item.kind === 'paper' ? 'paper' : item.kind}`)}</div>
      <div>
        <Button variant="secondary" onClick={() => onOpen(item)}>
          {t('shared.history.open')}
        </Button>
      </div>
    </article>
  )
}

function actionLabel(t: (k: string) => string, action: string): string {
  return t(`shared.history.actions.${action}`)
}

/** History (blueprint 4.5.3) — personal activity from the real audit events
    and paper history, with type and date filters. Admins get the compact
    table, teachers get roomy cards; mobile is cards for everyone. */
export function HistoryPage() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage
  const demoMode = demoModeOf(params.get('demo'))
  const { loading, loadFailed, retry } = useSchoolDemo(demoMode)
  const forceEmpty = demoMode === 'empty'

  const user = useSharedUser()
  const isAdmin = user?.role !== 'teacher'

  const [typeFilter, setTypeFilter] = useState<HistoryKind | 'all'>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<'newest' | 'oldest'>('newest')

  const items = useMemo(() => {
    if (forceEmpty || !user) return []
    return SharedService.listUserHistory(user.id, {
      type: typeFilter,
      from: from || undefined,
      to: to || undefined,
    })
  }, [forceEmpty, user, typeFilter, from, to])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = q
      ? items.filter((i) => [i.label, actionLabel(t, i.action)].some((v) => v.toLowerCase().includes(q)))
      : items
    list = [...list].sort((a, b) =>
      sortKey === 'newest' ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt),
    )
    return list
  }, [items, search, sortKey, t])

  const filtersActive = typeFilter !== 'all' || from !== '' || to !== '' || search !== ''
  const clearFilters = () => {
    setTypeFilter('all')
    setFrom('')
    setTo('')
    setSearch('')
  }

  const openItem = (item: HistoryItem) => {
    if (item.targetType === 'paper' && item.targetId) {
      if (user?.role === 'teacher') navigate(`/teacher/papers/${item.targetId}`)
      else if (user?.role === 'school-admin') navigate('/school/papers')
      else navigate('/admin/schools')
    } else {
      toast({ variant: 'info', message: actionLabel(t, item.action) })
    }
  }

  if (!user) {
    return (
      <div className="shared">
        <Banner variant="error" title={t('shared.history.error.title')}>
          {t('shared.history.error.body')}
        </Banner>
      </div>
    )
  }

  const columns: TableColumn<HistoryItem>[] = [
    {
      id: 'activity',
      header: t('shared.history.listTitle'),
      cell: (i) => (
        <span>
          <strong>{actionLabel(t, i.action)}</strong>
          {' — '}
          <Bidi>{i.label}</Bidi>
        </span>
      ),
    },
    {
      id: 'type',
      header: t('shared.history.filters.typeLabel'),
      cell: (i) => t(`shared.history.filters.${i.kind === 'paper' ? 'paper' : i.kind}`),
    },
    {
      id: 'date',
      header: t('common.date'),
      cell: (i) => formatDateTime(i.createdAt, lang),
    },
    {
      id: 'actions',
      header: t('common.actions'),
      cell: (i) => (
        <Button variant="ghost" onClick={() => openItem(i)}>
          {t('shared.history.open')}
        </Button>
      ),
    },
  ]

  const breadcrumb = [
    { label: t('nav.dashboard'), to: user.role === 'super-admin' ? '/admin' : user.role === 'school-admin' ? '/school' : '/teacher' },
    { label: t('shared.history.title') },
  ]

  return (
    <div className="shared">
      <PageHeader
        breadcrumb={breadcrumb}
        title={t('shared.history.title')}
        lead={t('shared.history.lead')}
      />

      {loading ? (
        <div className="shared__skeleton" aria-label={t('common.loading')} role="status">
          <Skeleton variant="rect" height={64} />
          <Skeleton variant="rect" height={220} />
        </div>
      ) : loadFailed ? (
        <div>
          <Banner variant="error" title={t('shared.history.error.title')}>
            {t('shared.history.error.body')}
          </Banner>
          <div className="shared__retry">
            <Button variant="primary" onClick={retry}>{t('common.retry')}</Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="shared-filters">
            <div className="shared-chips" role="group" aria-label={t('shared.history.filters.typeLabel')}>
              {TYPE_FILTERS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className="shared-chip"
                  aria-pressed={typeFilter === value}
                  onClick={() => setTypeFilter(value)}
                >
                  {t(`shared.history.filters.${value}`)}
                </button>
              ))}
            </div>
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder={t('shared.history.filters.searchPlaceholder')}
              ariaLabel={t('shared.history.filters.searchPlaceholder')}
            />
            <Input
              label={t('shared.history.filters.fromLabel')}
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <Input
              label={t('shared.history.filters.toLabel')}
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            <Select
              label={t('common.sort')}
              aria-label={t('common.sort')}
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as 'newest' | 'oldest')}
              options={[
                { value: 'newest', label: t('shared.history.sort.newest') },
                { value: 'oldest', label: t('shared.history.sort.oldest') },
              ]}
            />
            {filtersActive && (
              <Button variant="ghost" onClick={clearFilters}>
                {t('shared.history.filters.clear')}
              </Button>
            )}
          </div>

          <p className="shared-count" role="status">
            <Bidi>{t('shared.history.count', { count: filtered.length })}</Bidi>
          </p>

          {filtered.length === 0 ? (
            <Card>
              <EmptyState
                title={t('shared.history.emptyTitle')}
                body={t('shared.history.emptyBody')}
              >
                {filtersActive && (
                  <Button variant="secondary" onClick={clearFilters}>
                    {t('shared.history.emptyClear')}
                  </Button>
                )}
              </EmptyState>
            </Card>
          ) : (
            <>
              {isAdmin ? (
                <>
                  <div className="shared-table-wrap">
                    <Table columns={columns} data={filtered} ariaLabel={t('shared.history.title')} />
                  </div>
                  <div className="shared-cards">
                    {filtered.map((i) => (
                      <HistoryCard key={i.id} item={i} onOpen={openItem} />
                    ))}
                  </div>
                </>
              ) : (
                <div className="shared-cards shared-cards--always">
                  {filtered.map((i) => (
                    <HistoryCard key={i.id} item={i} roomy onOpen={openItem} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default HistoryPage
