import { Bell, ChevronsUpDown, Menu as MenuIcon, Check, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { setLanguage } from '../i18n'
import { useTheme } from '../utils/theme'
import { useAuth } from './AuthContext'
import { roleLabelKey } from './navigation'
import { Avatar } from '../design-system'
import { Menu, type MenuEntry } from '../design-system/Menu'

export interface TopBarProps {
  title: string
  onMenuClick?: () => void
  notifications?: number
}

export function TopBar({ title, onMenuClick, notifications = 0 }: TopBarProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { role, currentUser, switchRole, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const isUrdu = i18n.language === 'ur'

  const rolePath = (r: string) => (r === 'super-admin' ? '/admin' : r === 'school-admin' ? '/school' : '/teacher')

  const handleSwitchRole = (r: 'super-admin' | 'school-admin' | 'teacher') => {
    switchRole(r)
    navigate(rolePath(r))
  }

  const handleSignOut = () => {
    signOut()
    navigate('/sign-in')
  }

  const menuItems: MenuEntry[] = [
    { id: 'profile', label: t('shell.profile'), onSelect: () => navigate('/profile') },
    { id: 'settings', label: t('shell.settings'), onSelect: () => navigate('/settings') },
    { id: 'history', label: t('shell.history'), onSelect: () => navigate('/history') },
    { id: 'notifications', label: t('shell.notifications'), onSelect: () => navigate('/notifications') },
    { id: 'sep-1', divider: true },
    { id: 'role-header', label: t('shell.roleSwitcher'), disabled: true },
    { id: 'switch-super-admin', label: t('roles.superAdmin'), icon: role === 'super-admin' ? <Check size={15} aria-hidden="true" /> : undefined, onSelect: () => handleSwitchRole('super-admin') },
    { id: 'switch-school-admin', label: t('roles.schoolAdmin'), icon: role === 'school-admin' ? <Check size={15} aria-hidden="true" /> : undefined, onSelect: () => handleSwitchRole('school-admin') },
    { id: 'switch-teacher', label: t('roles.teacher'), icon: role === 'teacher' ? <Check size={15} aria-hidden="true" /> : undefined, onSelect: () => handleSwitchRole('teacher') },
    { id: 'sep-2', divider: true },
    { id: 'signout', label: t('shell.signOut'), danger: true, onSelect: handleSignOut },
  ]

  return (
    <header className="app-topbar">
      {onMenuClick && (
        <button type="button" className="pb-icon-btn app-topbar__menu-btn" aria-label={t('shell.openMenu')} onClick={onMenuClick}>
          <MenuIcon size={20} aria-hidden="true" />
        </button>
      )}

      <span className="app-topbar__page">{title}</span>

      <div className="app-topbar__spacer" />

      <div className="app-topbar__btn-group">
        <div className="lang-toggle" role="group" aria-label={t('demo.chooseLanguage')}>
          <button
            type="button"
            className="lang-toggle__option"
            aria-pressed={!isUrdu}
            onClick={() => setLanguage('en')}
          >
            English
          </button>
          <button
            type="button"
            className="lang-toggle__option"
            aria-pressed={isUrdu}
            onClick={() => setLanguage('ur')}
            lang="ur"
          >
            اردو
          </button>
        </div>

        <button
          type="button"
          className="pb-icon-btn"
          aria-label={t(theme === 'dark' ? 'shell.theme.switchToLight' : 'shell.theme.switchToDark')}
          aria-pressed={theme === 'dark'}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
        </button>

        <button
          type="button"
          className="pb-icon-btn"
          aria-label={`${t('shell.notifications')} (${notifications})`}
          onClick={() => navigate('/notifications')}
          style={{ position: 'relative' }}
        >
          <Bell size={19} aria-hidden="true" />
          {notifications > 0 && (
            <span
              style={{
                position: 'absolute', top: 5, insetInlineEnd: 5, minWidth: 16, height: 16, padding: '0 4px',
                borderRadius: 999, background: 'var(--pen-600)', color: '#fff', fontSize: 10, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
              }}
              aria-hidden="true"
            >
              {notifications > 9 ? '9+' : notifications}
            </span>
          )}
        </button>

        <Menu
          ariaLabel={t('shell.profile')}
          trigger={({ open }) => (
            <span className="app-topbar__profile" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {currentUser && <Avatar name={currentUser.name} size="md" />}
              <span style={{ textAlign: 'start' }}>
                <div className="app-topbar__profile-name">{currentUser?.name ?? t('shell.profile')}</div>
                <div className="app-topbar__profile-role">{role ? t(roleLabelKey(role)) : ''}</div>
              </span>
              <ChevronsUpDown size={15} className="flip-rtl" aria-hidden="true" style={{ color: 'var(--muted)', opacity: open ? 1 : 0.6 }} />
            </span>
          )}
          items={menuItems}
        />
      </div>
    </header>
  )
}

export default TopBar
