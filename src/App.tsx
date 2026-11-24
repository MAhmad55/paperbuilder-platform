import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthProvider, useAuth } from './shell/AuthContext'
import { ToastProvider } from './design-system'
import { AppShell } from './shell/AppShell'
import { SignInPage } from './pages/SignInPage'
import { LandingPage } from './pages/LandingPage'
import { RequestAccessPage } from './pages/RequestAccessPage'
import { RequestStatusPage } from './pages/RequestStatusPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { InvitePage } from './pages/InvitePage'
import { LegalPage } from './pages/LegalPage'
import { PublicPreviewPage } from './pages/PublicPreviewPage'
import { DesignSystemPage } from './pages/DesignSystemPage'
import { FoundationTestPage } from './pages/FoundationTestPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { SystemStatePage } from './pages/SystemStatePage'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminSchoolsPage } from './pages/admin/AdminSchoolsPage'
import { AdminSchoolDetailPage } from './pages/admin/AdminSchoolDetailPage'
import { AdminApprovalsPage } from './pages/admin/AdminApprovalsPage'
import { AdminPlansPage } from './pages/admin/AdminPlansPage'
import { AdminBankPage } from './pages/admin/AdminBankPage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { AdminAnnouncementsPage } from './pages/admin/AdminAnnouncementsPage'
import { AdminAuditPage } from './pages/admin/AdminAuditPage'
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage'
import { SchoolDashboardPage } from './pages/school/SchoolDashboardPage'
import { SchoolApprovalsPage } from './pages/school/SchoolApprovalsPage'
import { SchoolTeachersPage } from './pages/school/SchoolTeachersPage'
import { SchoolClassesPage } from './pages/school/SchoolClassesPage'
import { SchoolCalendarPage } from './pages/school/SchoolCalendarPage'
import { SchoolPapersPage } from './pages/school/SchoolPapersPage'
import { SchoolTemplatesPage } from './pages/school/SchoolTemplatesPage'
import { SchoolReportsPage } from './pages/school/SchoolReportsPage'
import { SchoolSettingsPage } from './pages/school/SchoolSettingsPage'
import { SchoolPlanPage } from './pages/school/SchoolPlanPage'
import { TeacherDashboardPage } from './pages/teacher/TeacherDashboardPage'
import { PaperStudioPage } from './pages/teacher/PaperStudioPage'
import { TeacherPapersPage } from './pages/teacher/TeacherPapersPage'
import { TeacherPaperDetailPage } from './pages/teacher/TeacherPaperDetailPage'
import { TeacherTemplatesPage } from './pages/teacher/TeacherTemplatesPage'
import { TeacherSavedQuestionsPage } from './pages/teacher/TeacherSavedQuestionsPage'

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

/** Guards a route group to one role; other roles get the no-permission state. */
function RequireRole({ role, children }: { role: Role; children?: ReactNode }) {
  const { role: currentRole } = useAuth()
  if (!currentRole) return <Navigate to="/sign-in" replace />
  if (currentRole !== role) return <SystemStatePage kind="no-permission" />
  return <>{children ?? <Outlet />}</>
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

/* ------------------------------------------------------------------
   Root router
------------------------------------------------------------------ */

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
          {/* Public & access screens (Phase 2, blueprint 4.1) — no sidebar */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/request-access" element={<RequestAccessPage />} />
          <Route path="/request-status" element={<RequestStatusPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/invite" element={<InvitePage />} />
          <Route path="/legal/:doc" element={<LegalPage />} />
          <Route path="/public-preview" element={<PublicPreviewPage />} />

          <Route element={<ProtectedLayout />}>
            <Route path="/home" element={<RoleHomeRedirect />} />
            <Route path="/design-system" element={<DesignSystemPage />} />
            <Route path="/foundation-test" element={<FoundationTestPage />} />
            {/* Super Admin screens (Phase 3, blueprint 4.2) */}
            <Route element={<RequireRole role="super-admin" />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/schools" element={<AdminSchoolsPage />} />
              <Route path="/admin/schools/:id" element={<AdminSchoolDetailPage />} />
              <Route path="/admin/approvals" element={<AdminApprovalsPage />} />
              <Route path="/admin/plans" element={<AdminPlansPage />} />
              <Route path="/admin/bank" element={<AdminBankPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />
              <Route path="/admin/audit" element={<AdminAuditPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
            </Route>
            <Route element={<RequireRole role="school-admin" />}>
              <Route path="/school" element={<SchoolDashboardPage />} />
              <Route path="/school/approvals" element={<SchoolApprovalsPage />} />
              <Route path="/school/teachers" element={<SchoolTeachersPage />} />
              <Route path="/school/classes" element={<SchoolClassesPage />} />
              <Route path="/school/calendar" element={<SchoolCalendarPage />} />
              <Route path="/school/papers" element={<SchoolPapersPage />} />
              <Route path="/school/templates" element={<SchoolTemplatesPage />} />
              <Route path="/school/reports" element={<SchoolReportsPage />} />
              <Route path="/school/settings" element={<SchoolSettingsPage />} />
              <Route path="/school/plan" element={<SchoolPlanPage />} />
            </Route>
            <Route element={<RequireRole role="teacher" />}>
              <Route path="/teacher" element={<TeacherDashboardPage />} />
              <Route path="/teacher/studio" element={<PaperStudioPage />} />
              <Route path="/teacher/papers" element={<TeacherPapersPage />} />
              <Route path="/teacher/papers/:id" element={<TeacherPaperDetailPage />} />
              <Route path="/teacher/templates" element={<TeacherTemplatesPage />} />
              <Route path="/teacher/questions" element={<TeacherSavedQuestionsPage />} />
            </Route>
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
