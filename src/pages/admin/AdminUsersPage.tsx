import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UserPlus } from 'lucide-react'
import { PageHeader } from '../../shell/PageHeader'
import {
  Avatar, Badge, Banner, Button, Dialog, Input, SearchField, Select, Skeleton, Table, useToast,
} from '../../design-system'
import type { BadgeTone, TableColumn } from '../../design-system'
import { AuthService, PlatformService, SchoolService, SUPER_ADMINS } from '../../services/mock-store'
import type { Person, PersonRole } from '../../services/mock-store'
import { Bidi } from '../../utils/bidi'
import { formatDate } from '../../utils/date'
import type { AppLanguage } from '../../i18n'
import '../../styles/admin-users.css'

type RoleFilter = 'all' | PersonRole
type StatusFilter = 'all' | Person['status']

const ROLE_FILTERS: RoleFilter[] = ['all', 'super-admin', 'school-admin', 'teacher']
const STATUS_FILTERS: StatusFilter[] = ['all', 'active', 'invited', 'inactive']

const ROLE_BADGE_TONE: Record<PersonRole, BadgeTone> = {
  'super-admin': 'ink',
  'school-admin': 'mark',
  teacher: 'neutral',
}

const STATUS_BADGE_TONE: Record<Person['status'], BadgeTone> = {
  active: 'ink',
  invited: 'mark',
  inactive: 'pen',
}

const ROLE_KEY: Record<PersonRole, string> = {
  'super-admin': 'superAdmin',
  'school-admin': 'schoolAdmin',
  teacher: 'teacher',
}

function roleFilterFromParam(value: string | null): RoleFilter {
  return value === 'super-admin' || value === 'school-admin' || value === 'teacher' ? value : 'all'
}

/** Platform users — Phase 3 B7. Table, filters, invite dialog, deactivate/reactivate. */
export function AdminUsersPage() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const [params, setParams] = useSearchParams()
  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage
  const demo = params.get('demo')

  const actor = AuthService.currentUser() ?? SUPER_ADMINS[0]

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [users, setUsers] = useState<Person[]>([])

  const [roleFilter, setRoleFilter] = useState<RoleFilter>(() => roleFilterFromParam(params.get('role')))
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<PersonRole>('teacher')
  const [inviteErrors, setInviteErrors] = useState<{ name?: string; email?: string; form?: string }>({})
  const [inviteBusy, setInviteBusy] = useState(false)

  const [confirmUser, setConfirmUser] = useState<{ user: Person; action: 'deactivate' | 'reactivate' } | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const schoolById = useMemo(
    () => new Map(SchoolService.list().map((s) => [s.id, s.name])),
    [],
  )

  /* Simulated fetch so the loading state is real (mock data is synchronous). */
  useEffect(() => {
    setLoading(true)
    setLoadError(false)
    if (demo === 'loading') return undefined
    const handle = window.setTimeout(() => {
      if (demo === 'error') {
        setLoadError(true)
      } else {
        setUsers(demo === 'empty' ? [] : PlatformService.listUsers())
      }
      setLoading(false)
    }, 350)
    return () => window.clearTimeout(handle)
  }, [demo, reloadKey])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      if (statusFilter !== 'all' && u.status !== statusFilter) return false
      if (q && !`${u.name} ${u.email}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [users, roleFilter, statusFilter, search])

  const retryLoad = () => {
    const next = new URLSearchParams(params)
    next.delete('demo')
    setParams(next, { replace: true })
    setReloadKey((k) => k + 1)
  }

  const openInvite = () => {
    setInviteName('')
    setInviteEmail('')
    setInviteRole('teacher')
    setInviteErrors({})
    setInviteOpen(true)
  }

  const submitInvite = (e?: { preventDefault: () => void }) => {
    e?.preventDefault()
    if (inviteBusy) return
    const errors: { name?: string; email?: string } = {}
    if (!inviteName.trim()) errors.name = t('admin.users.inviteDialog.nameRequired')
    if (!inviteEmail.trim()) {
      errors.email = t('admin.users.inviteDialog.emailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) {
      errors.email = t('admin.users.inviteDialog.emailInvalid')
    }
    if (errors.name || errors.email) {
      setInviteErrors(errors)
      const firstId = errors.name ? 'invite-name' : 'invite-email'
      window.setTimeout(() => document.getElementById(firstId)?.focus(), 50)
      return
    }
    setInviteErrors({})
    setInviteBusy(true)
    window.setTimeout(() => {
      const result = PlatformService.inviteUser(
        { name: inviteName, email: inviteEmail, role: inviteRole },
        actor,
      )
      setInviteBusy(false)
      if (!result.ok) {
        if (result.error.includes('already invited')) {
          setInviteErrors({ email: t('admin.users.inviteDialog.emailTaken') })
          window.setTimeout(() => document.getElementById('invite-email')?.focus(), 50)
        } else if (result.error.includes('valid email')) {
          setInviteErrors({ email: t('admin.users.inviteDialog.emailInvalid') })
        } else {
          setInviteErrors({ form: t('admin.users.inviteDialog.error') })
        }
        return
      }
      setUsers(PlatformService.listUsers())
      setInviteOpen(false)
      toast({ variant: 'success', message: t('admin.users.toast.invited', { name: result.value.name }) })
    }, 200)
  }

  const confirmStatusChange = () => {
    if (!confirmUser || confirmBusy) return
    setConfirmBusy(true)
    const target: Person['status'] = confirmUser.action === 'deactivate' ? 'inactive' : 'active'
    window.setTimeout(() => {
      const result = PlatformService.setUserStatus(confirmUser.user.id, target, actor)
      setConfirmBusy(false)
      if (!result.ok) {
        toast({ variant: 'error', message: t('admin.users.toast.error') })
        setConfirmUser(null)
        return
      }
      setUsers(PlatformService.listUsers())
      setConfirmUser(null)
      toast({
        variant: 'success',
        message: t(
          target === 'inactive' ? 'admin.users.toast.deactivated' : 'admin.users.toast.reactivated',
          { name: confirmUser.user.name },
        ),
      })
    }, 200)
  }

  const columns: TableColumn<Person>[] = [
    {
      id: 'name',
      header: t('admin.users.table.name'),
      cell: (u) => (
        <span className="admin-users__name">
          <Avatar name={u.name} size="sm" status={u.status} />
          <Bidi>{u.name}</Bidi>
        </span>
      ),
    },
    {
      id: 'email',
      header: t('admin.users.table.email'),
      cell: (u) => <Bidi>{u.email}</Bidi>,
    },
    {
      id: 'role',
      header: t('admin.users.table.role'),
      cell: (u) => (
        <Badge tone={ROLE_BADGE_TONE[u.role]}>{t(`admin.users.role.${ROLE_KEY[u.role]}`)}</Badge>
      ),
    },
    {
      id: 'school',
      header: t('admin.users.table.school'),
      cell: (u) => (u.schoolId ? <Bidi>{schoolById.get(u.schoolId) ?? u.schoolId}</Bidi> : '—'),
    },
    {
      id: 'status',
      header: t('admin.users.table.status'),
      cell: (u) => (
        <Badge tone={STATUS_BADGE_TONE[u.status]}>{t(`admin.users.status.${u.status}`)}</Badge>
      ),
    },
    {
      id: 'joined',
      header: t('admin.users.table.joined'),
      cell: (u) => (
        <Bidi>
          {formatDate(new Date(Date.now() - u.joinedDaysAgo * 24 * 60 * 60 * 1000).toISOString(), lang)}
        </Bidi>
      ),
    },
    {
      id: 'actions',
      header: t('admin.users.table.actions'),
      sortable: false,
      cell: (u) => {
        const isSelf = u.id === actor.id
        if (u.status === 'inactive') {
          return (
            <Button
              variant="secondary"
              className="admin-users__row-action"
              onClick={() => setConfirmUser({ user: u, action: 'reactivate' })}
            >
              {t('admin.users.reactivate')}
            </Button>
          )
        }
        return (
          <Button
            variant="destructive-outline"
            className="admin-users__row-action"
            disabled={isSelf}
            title={isSelf ? t('admin.users.selfDeactivateNote') : undefined}
            onClick={() => setConfirmUser({ user: u, action: 'deactivate' })}
          >
            {t('admin.users.deactivate')}
          </Button>
        )
      },
    },
  ]

  return (
    <div className="admin-users">
      <PageHeader
        title={t('admin.users.title')}
        lead={t('admin.users.lead')}
        action={
          <Button variant="primary" size="lg" leadingIcon={<UserPlus size={18} aria-hidden="true" />} onClick={openInvite}>
            {t('admin.users.invite')}
          </Button>
        }
      />

      {loading ? (
        <div className="admin-users__skeleton" role="status" aria-label={t('admin.users.loading')}>
          <Skeleton variant="rect" height={44} width="100%" />
          <Skeleton variant="rect" height={44} width="100%" />
          <Skeleton variant="rect" height={44} width="100%" />
          <Skeleton variant="rect" height={44} width="100%" />
          <Skeleton variant="rect" height={44} width="65%" />
        </div>
      ) : loadError ? (
        <Banner variant="error" title={t('admin.users.error.title')}>
          {t('admin.users.error.body')}
          <div className="admin-users__banner-action">
            <Button variant="secondary" onClick={retryLoad}>
              {t('admin.users.error.retry')}
            </Button>
          </div>
        </Banner>
      ) : (
        <>
          <div className="admin-users__filters" role="search">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder={t('admin.users.searchPlaceholder')}
              ariaLabel={t('admin.users.searchPlaceholder')}
            />
            <Select
              label={t('admin.users.filterRole')}
              aria-label={t('admin.users.filterRole')}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
              options={ROLE_FILTERS.map((r) => ({
                value: r,
                label: r === 'all' ? t('admin.users.allRoles') : t(`admin.users.role.${ROLE_KEY[r as PersonRole]}`),
              }))}
            />
            <Select
              label={t('admin.users.filterStatus')}
              aria-label={t('admin.users.filterStatus')}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              options={STATUS_FILTERS.map((s) => ({
                value: s,
                label: s === 'all' ? t('admin.users.allStatuses') : t(`admin.users.status.${s}`),
              }))}
            />
          </div>

          <Table
            columns={columns}
            data={filtered}
            ariaLabel={t('admin.users.title')}
            emptyTitle={t('admin.users.emptyTitle')}
            emptyBody={t('admin.users.emptyBody')}
            emptyAction={{ label: t('admin.users.emptyAction'), onClick: openInvite }}
          />
        </>
      )}

      <Dialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title={t('admin.users.inviteDialog.title')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>
              {t('admin.users.inviteDialog.cancel')}
            </Button>
            <Button variant="primary" loading={inviteBusy} onClick={submitInvite}>
              {t('admin.users.inviteDialog.submit')}
            </Button>
          </>
        }
      >
        <form onSubmit={submitInvite} noValidate>
          {inviteErrors.form && (
            <div style={{ marginBlockEnd: 12 }}>
              <Banner variant="error">{inviteErrors.form}</Banner>
            </div>
          )}
          <div className="admin-users__dialog-fields">
            <Input
              id="invite-name"
              label={t('admin.users.inviteDialog.name')}
              placeholder={t('admin.users.inviteDialog.namePlaceholder')}
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              autoComplete="name"
              required
              error={inviteErrors.name ?? null}
            />
            <Input
              id="invite-email"
              type="email"
              label={t('admin.users.inviteDialog.email')}
              placeholder={t('admin.users.inviteDialog.emailPlaceholder')}
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              autoComplete="email"
              required
              error={inviteErrors.email ?? null}
            />
            <Select
              id="invite-role"
              label={t('admin.users.inviteDialog.role')}
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as PersonRole)}
              options={(['super-admin', 'school-admin', 'teacher'] as PersonRole[]).map((r) => ({
                value: r,
                label: t(`admin.users.role.${ROLE_KEY[r]}`),
              }))}
            />
          </div>
        </form>
      </Dialog>

      <Dialog
        open={confirmUser !== null}
        onClose={() => setConfirmUser(null)}
        title={
          confirmUser
            ? t(
                confirmUser.action === 'deactivate'
                  ? 'admin.users.confirmDeactivate.title'
                  : 'admin.users.confirmReactivate.title',
              )
            : ''
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmUser(null)}>
              {t('admin.users.confirmDeactivate.cancel')}
            </Button>
            <Button
              variant={confirmUser?.action === 'deactivate' ? 'destructive' : 'primary'}
              loading={confirmBusy}
              onClick={confirmStatusChange}
            >
              {confirmUser
                ? t(
                    confirmUser.action === 'deactivate'
                      ? 'admin.users.confirmDeactivate.confirm'
                      : 'admin.users.confirmReactivate.confirm',
                  )
                : ''}
            </Button>
          </>
        }
      >
        {confirmUser && (
          <p className="admin-users__confirm-body">
            {t(
              confirmUser.action === 'deactivate'
                ? 'admin.users.confirmDeactivate.body'
                : 'admin.users.confirmReactivate.body',
              { name: confirmUser.user.name },
            )}
          </p>
        )}
      </Dialog>
    </div>
  )
}

export default AdminUsersPage
