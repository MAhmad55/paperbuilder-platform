import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthProvider, useAuth } from './shell/AuthContext'
import { ToastProvider } from './design-system'
import { AppShell } from './shell/AppShell'
import { SignInPage } from './pages/SignInPage'
import { DesignSystemPage } from './pages/DesignSystemPage'
import { FoundationTestPage } from './pages/FoundationTestPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { SystemStatePage } from './pages/SystemStatePage'
import { railNavForRole, type NavItem } from './shell/navigation'
import type { Role } from './services/types'

/* ------------------------------------------------------------------
   Session guard — renders the app shell once signed in
------------------------------------------------------------------ */

function roleHome(role: Role): string {
  return role === 'super-admin' ? '/admin' : role === 'school-admin' ? '/school' : '/teacher'
}

function ProtectedLayout() {
  const { role } = useAuth()
  if (!role) return <Navigate to="/sign-in" replace />
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

function RoleHomeRedirect() {
  const { role } = useAuth()
  if (!role) return <Navigate to="/sign-in" replace />
  return <Navigate to={roleHome(role)} replace />
}

/* ------------------------------------------------------------------
   Role-gated placeholder routes
------------------------------------------------------------------ */

function AnyPlaceholder({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation()
  const { role } = useAuth()
  if (!role) return <Navigate to="/sign-in" replace />
  const title = t(titleKey)
  const breadcrumb = [
    { label: t('nav.dashboard'), to: roleHome(role) },
    { label: title },
  ]
  return <PlaceholderPage title={title} breadcrumb={breadcrumb} />
}

function RolePlaceholder({ role }: { role: Role }) {
  const { t } = useTranslation()
  const { role: currentRole } = useAuth()
  const location = useLocation()

  const matched = useMemo(() => {
    const items = railNavForRole(role)
    let best: NavItem | null = null
    for (const item of items) {
      if (location.pathname === item.to || location.pathname.startsWith(item.to + '/')) {
        if (!best || item.to.length > best.to.length) best = item
      }
    }
    return best
  }, [role, location.pathname])

  if (!currentRole) return <Navigate to="/sign-in" replace />
  if (currentRole !== role) return <SystemStatePage kind="no-permission" />

  const title = matched ? t(matched.labelKey) : t('nav.dashboard')
  const breadcrumb = [
    { label: t('nav.dashboard'), to: roleHome(role) },
    { label: title },
  ]
  return <PlaceholderPage title={title} breadcrumb={breadcrumb} />
}

/* ------------------------------------------------------------------
   Root router
------------------------------------------------------------------ */

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
          <Route path="/sign-in" element={<SignInPage />} />

          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<RoleHomeRedirect />} />
            <Route path="/design-system" element={<DesignSystemPage />} />
            <Route path="/foundation-test" element={<FoundationTestPage />} />
            <Route path="/admin/*" element={<RolePlaceholder role="super-admin" />} />
            <Route path="/school/*" element={<RolePlaceholder role="school-admin" />} />
            <Route path="/teacher/*" element={<RolePlaceholder role="teacher" />} />
            <Route path="/profile" element={<AnyPlaceholder titleKey="shell.profile" />} />
            <Route path="/settings" element={<AnyPlaceholder titleKey="shell.settings" />} />
            <Route path="/history" element={<AnyPlaceholder titleKey="shell.history" />} />
            <Route path="/notifications" element={<AnyPlaceholder titleKey="shell.notifications" />} />
            <Route path="/session-expired" element={<SystemStatePage kind="session-expired" />} />
            <Route path="*" element={<SystemStatePage kind="not-found" />} />
          </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
