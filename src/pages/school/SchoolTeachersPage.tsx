import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UserPlus } from 'lucide-react'
import { PageHeader } from '../../shell/PageHeader'
import {
  Avatar, Badge, Banner, Button, Checkbox, Dialog, Input, SearchField, Select, Skeleton,
  Table, useToast,
} from '../../design-system'
import type { BadgeTone, TableColumn } from '../../design-system'
import { SchoolService } from '../../services/mock-store'
import { CLASSES, SUBJECTS } from '../../mock/data'
import type { Person } from '../../mock/data'
import { Bidi } from '../../utils/bidi'
import { formatDate } from '../../utils/date'
import type { AppLanguage } from '../../i18n'
import {
  demoActor, demoModeOf, demoSchool, subjectLabel, useSchoolDemo,
} from './shared'
import '../../styles/school.css'

type StatusFilter = 'all' | Person['status']
type SortKey = 'nameAsc' | 'nameDesc' | 'joinedNew' | 'joinedOld'

const STATUS_FILTERS: StatusFilter[] = ['all', 'active', 'invited', 'inactive']

const STATUS_BADGE_TONE: Record<Person['status'], BadgeTone> = {
  active: 'ink',
  invited: 'mark',
  inactive: 'pen',
}

/** Teachers — Phase 4. Table + mobile cards, invite, assignment edit, deactivate. */
export function SchoolTeachersPage() {
  const { t, i18n } = useTranslation()
  const [params, setParams] = useSearchParams()
  const { toast } = useToast()
  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage
  const demoMode = demoModeOf(params.get('demo'))
  const { loading, loadFailed, retry } = useSchoolDemo(demoMode)
  const forceEmpty = demoMode === 'empty'

  const actor = demoActor()
  const school = demoSchool()
  const schoolId = school?.id ?? ''

  const [version, setVersion] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('nameAsc')

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteErrors, setInviteErrors] = useState<{ name?: string; email?: string; form?: string }>({})
  const [inviteBusy, setInviteBusy] = useState(false)

  /* Assignment editor — also deep-linked from /school/classes (?edit=<teacher-id>). */
  const [editUser, setEditUser] = useState<Person | null>(null)
  const [editClasses, setEditClasses] = useState<string[]>([])
  const [editSubjects, setEditSubjects] = useState<string[]>([])
  const [editBusy, setEditBusy] = useState(false)

  const [confirmUser, setConfirmUser] = useState<{ user: Person; action: 'deactivate' | 'reactivate' } | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const teachers = useMemo(
    () => (forceEmpty || !schoolId ? [] : SchoolService.listTeachers(schoolId)),
    [forceEmpty, schoolId, version],
  )

  /* Deep link from the Classes page opens the assignment editor on mount. */
  const editParam = params.get('edit')
  useEffect(() => {
    if (!editParam || loading) return
    const found = teachers.find((u) => u.id === editParam)
    if (found) openEdit(found)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editParam, loading])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = teachers.filter((u) => {
      if (statusFilter !== 'all' && u.status !== statusFilter) return false
      if (subjectFilter !== 'all' && !u.subjects.includes(subjectFilter)) return false
      if (q && !`${u.name} ${u.email}`.toLowerCase().includes(q)) return false
      return true
    })
    const byName = (a: Person, b: Person) => a.name.localeCompare(b.name)
    switch (sortKey) {
      case 'nameAsc': return [...rows].sort(byName)
      case 'nameDesc': return [...rows].sort((a, b) => byName(b, a))
      case 'joinedNew': return [...rows].sort((a, b) => a.joinedDaysAgo - b.joinedDaysAgo)
      case 'joinedOld': return [...rows].sort((a, b) => b.joinedDaysAgo - a.joinedDaysAgo)
    }
  }, [teachers, statusFilter, subjectFilter, search, sortKey])

  const openInvite = () => {
    setInviteName('')
    setInviteEmail('')
    setInviteErrors({})
    setInviteOpen(true)
  }

  const submitInvite = (e?: { preventDefault: () => void }) => {
    e?.preventDefault()
    if (inviteBusy) return
    const errors: { name?: string; email?: string } = {}
    if (!inviteName.trim()) errors.name = t('school.teachers.inviteDialog.nameRequired')
    if (!inviteEmail.trim()) {
      errors.email = t('school.teachers.inviteDialog.emailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) {
      errors.email = t('school.teachers.inviteDialog.emailInvalid')
    }
    if (errors.name || errors.email) {
      setInviteErrors(errors)
      const firstId = errors.name ? 'school-invite-name' : 'school-invite-email'
      window.setTimeout(() => document.getElementById(firstId)?.focus(), 50)
      return
    }
    setInviteErrors({})
    setInviteBusy(true)
    window.setTimeout(() => {
      const result = SchoolService.inviteTeacher(schoolId, { name: inviteName, email: inviteEmail }, actor)
      setInviteBusy(false)
      if (!result.ok) {
        if (result.error.includes('already invited')) {
          setInviteErrors({ email: t('school.teachers.inviteDialog.emailTaken') })
          window.setTimeout(() => document.getElementById('school-invite-email')?.focus(), 50)
        } else if (result.error.includes('valid email')) {
          setInviteErrors({ email: t('school.teachers.inviteDialog.emailInvalid') })
        } else {
          setInviteErrors({ form: t('school.teachers.inviteDialog.error') })
        }
        return
      }
      setVersion((v) => v + 1)
      setInviteOpen(false)
      toast({ variant: 'success', message: t('school.teachers.toast.invited', { name: result.value.name }) })
    }, 200)
  }

  function openEdit(user: Person) {
    setEditUser(user)
    setEditClasses([...user.classes])
    setEditSubjects([...user.subjects])
  }

  const closeEdit = () => {
    setEditUser(null)
    if (params.get('edit')) {
      const next = new URLSearchParams(params)
      next.delete('edit')
      setParams(next, { replace: true })
    }
  }

  const saveAssignments = () => {
    if (!editUser || editBusy) return
    setEditBusy(true)
    window.setTimeout(() => {
      const result = SchoolService.updateTeacherAssignments(
        editUser.id,
        { subjects: editSubjects, classes: editClasses },
        actor,
      )
      setEditBusy(false)
      if (!result.ok) {
        toast({ variant: 'error', message: t('school.teachers.toast.error') })
        return
      }
      setVersion((v) => v + 1)
      closeEdit()
      toast({ variant: 'success', message: t('school.teachers.edit.savedToast', { name: editUser.name }) })
    }, 200)
  }

  const confirmStatusChange = () => {
    if (!confirmUser || confirmBusy) return
    setConfirmBusy(true)
    const target: Person['status'] = confirmUser.action === 'deactivate' ? 'inactive' : 'active'
    window.setTimeout(() => {
      const result = SchoolService.setTeacherStatus(confirmUser.user.id, target, actor)
      setConfirmBusy(false)
      if (!result.ok) {
        toast({ variant: 'error', message: t('school.teachers.toast.error') })
        setConfirmUser(null)
        return
      }
      setVersion((v) => v + 1)
      setConfirmUser(null)
      toast({
        variant: 'success',
        message: t(
          target === 'inactive' ? 'school.teachers.toast.deactivated' : 'school.teachers.toast.reactivated',
          { name: confirmUser.user.name },
        ),
      })
    }, 200)
  }

  const toggleIn = (list: string[], value: string, set: (next: string[]) => void) => {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  }

  const columns: TableColumn<Person>[] = [
    {
      id: 'name',
      header: t('school.teachers.table.name'),
      sortable: false,
      cell: (u) => (
        <span className="school-teacher-name">
          <Avatar name={u.name} size="sm" status={u.status} />
          <Bidi>{u.name}</Bidi>
        </span>
      ),
    },
    {
      id: 'subjects',
      header: t('school.teachers.table.subjects'),
      sortable: false,
      cell: (u) => (u.subjects.length > 0
        ? u.subjects.map((s) => subjectLabel(s, lang)).join(', ')
        : '—'),
    },
    {
      id: 'classes',
      header: t('school.teachers.table.classes'),
      sortable: false,
      cell: (u) => (u.classes.length > 0
        ? u.classes.map((c) => CLASSES.find(x => x.id === c)?.name ?? c).join(', ')
        : '—'),
    },
    {
      id: 'status',
      header: t('school.teachers.table.status'),
      sortable: false,
      cell: (u) => (
        <Badge tone={STATUS_BADGE_TONE[u.status]}>{t(`admin.users.status.${u.status}`)}</Badge>
      ),
    },
    {
      id: 'joined',
      header: t('school.teachers.table.joined'),
      sortable: false,
      cell: (u) => (
        <Bidi>
          {formatDate(new Date(Date.now() - u.joinedDaysAgo * 24 * 60 * 60 * 1000).toISOString(), lang)}
        </Bidi>
      ),
    },
    {
      id: 'actions',
      header: t('school.teachers.table.actions'),
      sortable: false,
      cell: (u) => (
        <span style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={() => openEdit(u)}>
            {t('school.teachers.editButton')}
          </Button>
          {u.status === 'inactive' ? (
            <Button variant="secondary" onClick={() => setConfirmUser({ user: u, action: 'reactivate' })}>
              {t('school.teachers.reactivate')}
            </Button>
          ) : (
            <Button
              variant="destructive-outline"
              disabled={u.id === actor.id}
              onClick={() => setConfirmUser({ user: u, action: 'deactivate' })}
            >
              {t('school.teachers.deactivate')}
            </Button>
          )}
        </span>
      ),
    },
  ]

  return (
    <div className="school">
      <PageHeader
        title={t('school.teachers.title')}
        lead={t('school.teachers.lead')}
        action={
          <Button variant="primary" size="lg" leadingIcon={<UserPlus size={18} aria-hidden="true" />} onClick={openInvite}>
            {t('school.teachers.invite')}
          </Button>
        }
      />

      {loading ? (
        <div className="school__skeleton" role="status" aria-label={t('common.loading')}>
          <Skeleton variant="rect" height={44} width="100%" />
          <Skeleton variant="rect" height={44} width="100%" />
          <Skeleton variant="rect" height={44} width="100%" />
          <Skeleton variant="rect" height={44} width="65%" />
        </div>
      ) : loadFailed ? (
        <div>
          <Banner variant="error" title={t('school.teachers.error.title')}>
            {t('school.teachers.error.body')}
          </Banner>
          <div className="school__retry">
            <Button variant="primary" onClick={retry}>
              {t('common.retry')}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="school-filters" role="search">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder={t('school.teachers.searchPlaceholder')}
              ariaLabel={t('school.teachers.searchPlaceholder')}
            />
            <Select
              label={t('school.teachers.filterStatus')}
              aria-label={t('school.teachers.filterStatus')}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              options={STATUS_FILTERS.map((s) => ({
                value: s,
                label: s === 'all' ? t('school.teachers.allStatuses') : t(`admin.users.status.${s}`),
              }))}
            />
            <Select
              label={t('school.teachers.filterSubject')}
              aria-label={t('school.teachers.filterSubject')}
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              options={[
                { value: 'all', label: t('school.teachers.allSubjects') },
                ...SUBJECTS.map((s) => ({ value: s.id, label: subjectLabel(s.id, lang) })),
              ]}
            />
            <Select
              label={t('school.teachers.sort.label')}
              aria-label={t('school.teachers.sort.label')}
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              options={(['nameAsc', 'nameDesc', 'joinedNew', 'joinedOld'] as SortKey[]).map((k) => ({
                value: k,
                label: t(`school.teachers.sort.${k}`),
              }))}
            />
          </div>

          <div className="school-table-wrap">
            <Table
              columns={columns}
              data={filtered}
              ariaLabel={t('school.teachers.title')}
              emptyTitle={t('school.teachers.emptyTitle')}
              emptyBody={t('school.teachers.emptyBody')}
              emptyAction={{ label: t('school.teachers.emptyAction'), onClick: openInvite }}
            />
          </div>
          {filtered.length > 0 && (
            <div className="school-cards">
                {filtered.map((u) => (
                  <article key={u.id} className="school-card">
                    <div className="school-card__head">
                      <span className="school-card__name"><Bidi>{u.name}</Bidi></span>
                      <Badge tone={STATUS_BADGE_TONE[u.status]}>{t(`admin.users.status.${u.status}`)}</Badge>
                    </div>
                    <div className="school-card__rows">
                      <span><Bidi>{u.email}</Bidi></span>
                      <span>
                        {u.subjects.length > 0 ? u.subjects.map((s) => subjectLabel(s, lang)).join(', ') : '—'}
                      </span>
                      <span>
                        {u.classes.length > 0
                          ? u.classes.map((c) => CLASSES.find(x => x.id === c)?.name ?? c).join(', ')
                          : '—'}
                      </span>
                    </div>
                    <div className="school-card__actions">
                      <Button variant="secondary" onClick={() => openEdit(u)}>
                        {t('school.teachers.editButton')}
                      </Button>
                      {u.status === 'inactive' ? (
                        <Button variant="secondary" onClick={() => setConfirmUser({ user: u, action: 'reactivate' })}>
                          {t('school.teachers.reactivate')}
                        </Button>
                      ) : (
                        <Button
                          variant="destructive-outline"
                          disabled={u.id === actor.id}
                          onClick={() => setConfirmUser({ user: u, action: 'deactivate' })}
                        >
                          {t('school.teachers.deactivate')}
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
            </div>
          )}
        </>
      )}

      <Dialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title={t('school.teachers.inviteDialog.title')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>
              {t('school.teachers.inviteDialog.cancel')}
            </Button>
            <Button variant="primary" loading={inviteBusy} onClick={submitInvite}>
              {t('school.teachers.inviteDialog.submit')}
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
          <div className="school-dialog-fields">
            <Input
              id="school-invite-name"
              label={t('school.teachers.inviteDialog.name')}
              placeholder={t('school.teachers.inviteDialog.namePlaceholder')}
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              autoComplete="name"
              required
              error={inviteErrors.name ?? null}
            />
            <Input
              id="school-invite-email"
              type="email"
              label={t('school.teachers.inviteDialog.email')}
              placeholder={t('school.teachers.inviteDialog.emailPlaceholder')}
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              autoComplete="email"
              required
              error={inviteErrors.email ?? null}
            />
          </div>
        </form>
      </Dialog>

      <Dialog
        open={editUser !== null}
        onClose={closeEdit}
        title={editUser ? `${t('school.teachers.edit.title')} — ${editUser.name}` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={closeEdit}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" loading={editBusy} onClick={saveAssignments}>
              {t('school.teachers.edit.save')}
            </Button>
          </>
        }
      >
        {editUser && (
          <div className="school-assign">
            <div className="school-assign__group">
              <h3>{t('school.teachers.edit.classesLabel')}</h3>
              <div className="school-assign__checks">
                {CLASSES.map((c) => (
                  <Checkbox
                    key={c.id}
                    label={c.name}
                    checked={editClasses.includes(c.id)}
                    onChange={(e) => toggleIn(editClasses, c.id, setEditClasses)}
                  />
                ))}
              </div>
            </div>
            <div className="school-assign__group">
              <h3>{t('school.teachers.edit.subjectsLabel')}</h3>
              <div className="school-assign__checks">
                {SUBJECTS.map((s) => (
                  <Checkbox
                    key={s.id}
                    label={subjectLabel(s.id, lang)}
                    checked={editSubjects.includes(s.id)}
                    onChange={(e) => toggleIn(editSubjects, s.id, setEditSubjects)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        open={confirmUser !== null}
        onClose={() => setConfirmUser(null)}
        title={
          confirmUser
            ? t(
                confirmUser.action === 'deactivate'
                  ? 'school.teachers.confirmDeactivate.title'
                  : 'school.teachers.confirmReactivate.title',
              )
            : ''
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmUser(null)}>
              {t('school.teachers.confirmDeactivate.cancel')}
            </Button>
            <Button
              variant={confirmUser?.action === 'deactivate' ? 'destructive' : 'primary'}
              loading={confirmBusy}
              onClick={confirmStatusChange}
            >
              {confirmUser
                ? t(
                    confirmUser.action === 'deactivate'
                      ? 'school.teachers.confirmDeactivate.confirm'
                      : 'school.teachers.confirmReactivate.confirm',
                  )
                : ''}
            </Button>
          </>
        }
      >
        {confirmUser && (
          <p className="school-confirm-body">
            {t(
              confirmUser.action === 'deactivate'
                ? 'school.teachers.confirmDeactivate.body'
                : 'school.teachers.confirmReactivate.body',
              { name: confirmUser.user.name },
            )}
          </p>
        )}
      </Dialog>
    </div>
  )
}

export default SchoolTeachersPage
