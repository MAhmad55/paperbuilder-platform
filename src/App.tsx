import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { lazy, Suspense, type ReactNode } from 'react'
import { AuthProvider, useAuth } from './shell/AuthContext'
import { RouteAnnouncer } from './shell/RouteAnnouncer'
import { ToastProvider } from './design-system'
import { Skeleton } from './design-system/Skeleton'
import { AppShell } from './shell/AppShell'
/* ------------------------------------------------------------------
   Lazy route pages (bundle headroom) — one dynamic import per page,
   grouped by route group (public, admin, school, teacher, shared).
   The Design System, Foundation Test and Public Preview pages are
   lazy too, so they never ship in the entry chunk. The route
   structure and the RequireRole guards below are unchanged; only
   how each page component is loaded moved.
------------------------------------------------------------------ */

// Public & access screens
const LandingPage = lazy(() => import('./pages/LandingPage'))
const SignInPage = lazy(() => import('./pages/SignInPage'))
const RequestAccessPage = lazy(() => import('./pages/RequestAccessPage'))
const RequestStatusPage = lazy(() => import('./pages/RequestStatusPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const InvitePage = lazy(() => import('./pages/InvitePage'))
const LegalPage = lazy(() => import('./pages/LegalPage'))
const PublicPreviewPage = lazy(() => import('./pages/PublicPreviewPage'))

// Showcase / test pages (demo-only, never on first paint)
const DesignSystemPage = lazy(() => import('./pages/DesignSystemPage'))
const FoundationTestPage = lazy(() => import('./pages/FoundationTestPage'))

// Shared system-state page (no-permission / 404 / session-expired)
const SystemStatePage = lazy(() => import('./pages/SystemStatePage'))

// Super Admin screens
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const AdminSchoolsPage = lazy(() => import('./pages/admin/AdminSchoolsPage'))
const AdminSchoolDetailPage = lazy(() => import('./pages/admin/AdminSchoolDetailPage'))
const AdminApprovalsPage = lazy(() => import('./pages/admin/AdminApprovalsPage'))
const AdminPlansPage = lazy(() => import('./pages/admin/AdminPlansPage'))
const AdminBankPage = lazy(() => import('./pages/admin/AdminBankPage'))
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'))
const AdminAnnouncementsPage = lazy(() => import('./pages/admin/AdminAnnouncementsPage'))
const AdminAuditPage = lazy(() => import('./pages/admin/AdminAuditPage'))
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'))

// School Admin screens
const SchoolDashboardPage = lazy(() => import('./pages/school/SchoolDashboardPage'))
const SchoolApprovalsPage = lazy(() => import('./pages/school/SchoolApprovalsPage'))
const SchoolTeachersPage = lazy(() => import('./pages/school/SchoolTeachersPage'))
const SchoolClassesPage = lazy(() => import('./pages/school/SchoolClassesPage'))
const SchoolCalendarPage = lazy(() => import('./pages/school/SchoolCalendarPage'))
const SchoolPapersPage = lazy(() => import('./pages/school/SchoolPapersPage'))
const SchoolTemplatesPage = lazy(() => import('./pages/school/SchoolTemplatesPage'))
const SchoolReportsPage = lazy(() => import('./pages/school/SchoolReportsPage'))
const SchoolSettingsPage = lazy(() => import('./pages/school/SchoolSettingsPage'))
const SchoolPlanPage = lazy(() => import('./pages/school/SchoolPlanPage'))

// Teacher screens
const TeacherDashboardPage = lazy(() => import('./pages/teacher/TeacherDashboardPage'))
const PaperStudioPage = lazy(() => import('./pages/teacher/PaperStudioPage'))
const TeacherPapersPage = lazy(() => import('./pages/teacher/TeacherPapersPage'))
const TeacherPaperDetailPage = lazy(() => import('./pages/teacher/TeacherPaperDetailPage'))
const TeacherTemplatesPage = lazy(() => import('./pages/teacher/TeacherTemplatesPage'))
const TeacherSavedQuestionsPage = lazy(() => import('./pages/teacher/TeacherSavedQuestionsPage'))

// Shared screens (role-neutral)
const ProfilePage = lazy(() => import('./pages/shared/ProfilePage'))
const SettingsPage = lazy(() => import('./pages/shared/SettingsPage'))
const HistoryPage = lazy(() => import('./pages/shared/HistoryPage'))
const NotificationsPage = lazy(() => import('./pages/shared/NotificationsPage'))
const HelpPage = lazy(() => import('./pages/shared/HelpPage'))
const SystemStatesPage = lazy(() => import('./pages/shared/SystemStatesPage'))

/**
 * Daftar loading skeleton — the Suspense fallback while a lazy route
 * chunk loads. Deliberately text-free (no h1, no copy): the
 * RouteAnnouncer only announces a real page heading once the page
 * itself has painted, and no new user-facing string is introduced.
 * Uses the existing design-system Skeleton bars.
 */
function RouteSkeleton() {
  return (
    <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '24px 0' }}>
      <Skeleton variant="rect" width="38%" height={30} />
      <Skeleton variant="line" width="68%" height={14} />
      <Skeleton variant="line" count={4} />
    </div>
  )
}

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
      {/* One Suspense boundary for every protected route group
          (admin, school, teacher, shared, showcase): the shell stays
          visible while the lazy page chunk loads. */}
      <Suspense fallback={<RouteSkeleton />}>
        <Outlet />
      </Suspense>
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
   Root router
------------------------------------------------------------------ */

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <RouteAnnouncer />
          <Routes>
          {/* Public & access screens (Phase 2, blueprint 4.1) — no sidebar.
              Each public route has its own Suspense boundary (no shell to
              keep visible here); the fallback is the text-free skeleton. */}
          <Route path="/" element={<Suspense fallback={<RouteSkeleton />}><LandingPage /></Suspense>} />
          <Route path="/sign-in" element={<Suspense fallback={<RouteSkeleton />}><SignInPage /></Suspense>} />
          <Route path="/request-access" element={<Suspense fallback={<RouteSkeleton />}><RequestAccessPage /></Suspense>} />
          <Route path="/request-status" element={<Suspense fallback={<RouteSkeleton />}><RequestStatusPage /></Suspense>} />
          <Route path="/forgot-password" element={<Suspense fallback={<RouteSkeleton />}><ForgotPasswordPage /></Suspense>} />
          <Route path="/invite" element={<Suspense fallback={<RouteSkeleton />}><InvitePage /></Suspense>} />
          <Route path="/legal/:doc" element={<Suspense fallback={<RouteSkeleton />}><LegalPage /></Suspense>} />
          <Route path="/public-preview" element={<Suspense fallback={<RouteSkeleton />}><PublicPreviewPage /></Suspense>} />

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
            {/* Shared screens (Phase 6, blueprint 4.5) — role-neutral paths,
                any authenticated role; the shell rail links them for all roles. */}
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/system-states" element={<SystemStatesPage />} />
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
