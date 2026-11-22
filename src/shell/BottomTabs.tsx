import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { ChevronRight, LayoutGrid } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { bottomTabsForRole, moreItemsForRole } from './navigation'
import { useAuth } from './AuthContext'
import { BottomSheet } from '../design-system'

export function BottomTabs() {
  const { t } = useTranslation()
  const { role } = useAuth()
  const [moreOpen, setMoreOpen] = useState(false)
  const navigate = useNavigate()
  if (!role) return null

  const tabs = bottomTabsForRole(role)
  const more = moreItemsForRole(role)

  return (
    <nav className="app-bottom-tabs" aria-label={t('shell.more')}>
      <div className="app-bottom-tabs__inner">
        {tabs.map(item => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="app-bottom-tab"
              aria-label={t(item.labelKey)}
            >
              <Icon size={21} aria-hidden="true" />
              <span>{t(item.labelKey)}</span>
            </NavLink>
          )
        })}
        <button
          type="button"
          className="app-bottom-tab"
          aria-label={t('shell.more')}
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen(true)}
        >
          <LayoutGrid size={21} aria-hidden="true" />
          <span>{t('shell.more')}</span>
        </button>
      </div>

      <BottomSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title={t('shell.more')}
        ariaLabel={t('shell.more')}
      >
        <ul className="pb-menu__list" role="menu" style={{ position: 'static', boxShadow: 'none', border: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          {more.map(item => {
            const Icon = item.icon
            return (
              <li key={item.to} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className="pb-menu__item"
                  onClick={() => { navigate(item.to); setMoreOpen(false) }}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{t(item.labelKey)}</span>
                  <ChevronRight size={16} className="flip-rtl" aria-hidden="true" style={{ marginInlineStart: 'auto', color: 'var(--muted)' }} />
                </button>
              </li>
            )
          })}
        </ul>
      </BottomSheet>
    </nav>
  )
}

export default BottomTabs
