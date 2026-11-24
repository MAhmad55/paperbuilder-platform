import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router-dom'
import { Rail } from './Rail'
import { TopBar } from './TopBar'
import { BottomTabs } from './BottomTabs'
import { Drawer, Avatar } from '../design-system'
import { useAuth } from './AuthContext'
import { railNavForRole, type NavItem, ROUTES } from './navigation'
import { SharedService } from '../services/mock-store'

export interface AppShellProps {
  title?: string
  notifications?: number
  children: ReactNode
}

function roleHome(role: string): string {
  return role === 'super-admin' ? '/admin' : role === 'school-admin' ? '/school' : '/teacher'
}

function useShellTitle(): string {
  const { t } = useTranslation()
  const { role } = useAuth()
  const location = useLocation()
  return useMemo(() => {
    if (!role) return ''
    if (location.pathname.startsWith(ROUTES.designSystem)) return t('showcase.title')
    if (location.pathname.startsWith(ROUTES.foundationTest)) return t('test.title')
    const items = railNavForRole(role)
    let best: NavItem | null = null
    for (const item of items) {
      if (location.pathname === item.to || location.pathname.startsWith(item.to + '/')) {
        if (!best || item.to.length > best.to.length) best = item
      }
    }
    return (best ? t(best.labelKey) : t('nav.dashboard'))
  }, [role, location.pathname, t])
}

/**
 * The Daftar app shell: collapsible left rail (desktop), 64px top bar,
 * mobile bottom tabs + more-drawer.
 */
export function AppShell({ title, notifications = 0, children }: AppShellProps) {
  const { t } = useTranslation()
  const { currentUser } = useAuth()
  const derivedTitle = useShellTitle()
  const resolvedTitle = title ?? derivedTitle
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  /* Unread badge: re-counted on navigation (useShellTitle subscribes to
     the location) and whenever the store reports a notification was
     marked read (the store itself is not reactive). */
  const [, setNotifTick] = useState(0)
  useEffect(() => {
    const onChange = () => setNotifTick((n) => n + 1)
    window.addEventListener('paperbuilder:notifications', onChange)
    return () => window.removeEventListener('paperbuilder:notifications', onChange)
  }, [])
  const unread = currentUser ? SharedService.unreadNotificationCount(currentUser.id) : 0
  const badgeCount = notifications > 0 ? notifications : unread

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">{t('shell.skipToContent')}</a>

      <Rail collapsed={collapsed} onToggleCollapse={() => setCollapsed(c => !c)} />

      {/* Mobile nav drawer (rail equivalent) */}
      <Drawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        title={<span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span className="app-rail__logo" aria-hidden="true">PB</span>{t('app.name')}</span>}
        ariaLabel={t('shell.openMenu')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0 14px', borderBottom: '1px solid var(--line)', marginBottom: 12 }}>
          {currentUser && <Avatar name={currentUser.name} size="md" />}
          <div>
            <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--ink-900)' }}>{currentUser?.name}</div>
            <div className="pb-muted" style={{ fontSize: 'var(--text-xs)' }}>{currentUser?.role}</div>
          </div>
        </div>
        <MobileNav onNavigate={() => setMobileNavOpen(false)} />
      </Drawer>

      <div className="app-body">
        <TopBar
          title={resolvedTitle}
          notifications={badgeCount}
          onMenuClick={() => setMobileNavOpen(true)}
        />
        <main id="main" className="app-content" tabIndex={-1}>
          {children}
        </main>
        <BottomTabs />
      </div>
    </div>
  )
}

function MobileNav({ onNavigate }: { onNavigate: () => void }) {
  const { t } = useTranslation()
  const { role } = useAuth()
  if (!role) return null
  const items = railNavForRole(role)
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {items.map(item => {
        const Icon = item.icon
        return (
          <li key={item.to}>
            <NavLink
              to={item.to}
              onClick={onNavigate}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', color: 'var(--ink-900)', borderRadius: 10, textDecoration: 'none', fontSize: '0.9375rem', fontWeight: 500 }}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{t(item.labelKey)}</span>
            </NavLink>
          </li>
        )
      })}
    </ul>
  )
}

export default AppShell
