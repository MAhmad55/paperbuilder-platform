import { NavLink } from 'react-router-dom'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { railNavForRole, DESIGN_SYSTEM_ITEM, roleLabelKey } from './navigation'
import { useAuth } from './AuthContext'

export interface RailProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Rail({ collapsed, onToggleCollapse }: RailProps) {
  const { t } = useTranslation()
  const { role } = useAuth()
  if (!role) return null

  const items = [...railNavForRole(role), DESIGN_SYSTEM_ITEM]

  return (
    <aside className={['app-rail', collapsed && 'app-rail--collapsed'].filter(Boolean).join(' ')} aria-label={t('shell.roleSwitcher')}>
      <div className="app-rail__brand">
        <span className="app-rail__logo" aria-hidden="true">PB</span>
        {!collapsed && (
          <div>
            <div className="app-rail__brand-name">{t('app.name')}</div>
            <div className="app-rail__role">{t(roleLabelKey(role))}</div>
          </div>
        )}
      </div>

      <nav className="app-rail__nav" aria-label={t('nav.dashboard')}>
        <div className="app-rail__section">{t(roleLabelKey(role))}</div>
        {items.map(item => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to + item.labelKey}
              to={item.to}
              end={item.to.split('/').length <= 2}
              className="app-rail__link"
              aria-label={t(item.labelKey)}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{t(item.labelKey)}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="app-rail__foot">
        <button
          type="button"
          className="app-rail__collapse"
          onClick={onToggleCollapse}
          aria-label={collapsed ? t('shell.expandRail') : t('shell.collapseRail')}
        >
          {collapsed ? <ChevronsRight size={18} className="flip-rtl" aria-hidden="true" /> : <ChevronsLeft size={18} className="flip-rtl" aria-hidden="true" />}
        </button>
      </div>
    </aside>
  )
}

export default Rail
