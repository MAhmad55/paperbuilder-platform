import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { AuthService, PlatformService } from '../services'
import type { Session, Role } from '../services/types'
import type { Person } from '../mock/data'

interface AuthContextValue {
  session: Session | null
  role: Role | null
  currentUser: Person | null
  signIn: () => void
  switchRole: (role: Role) => void
  signOut: () => void
  /** Re-read the current user (a /profile save changes the stored name). */
  refreshProfile: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => AuthService.getSession())
  const [profileTick, setProfileTick] = useState(0)

  const refreshProfile = useCallback(() => setProfileTick((t) => t + 1), [])

  const switchRole = useCallback((role: Role) => {
    const next = AuthService.switchRole(role)
    setSession(next)
  }, [])

  const signIn = useCallback(() => {
    const desiredRole: Role = session?.role ?? 'teacher'
    const next = AuthService.signIn(desiredRole)
    setSession(next)
  }, [session?.role])

  const signOut = useCallback(() => {
    AuthService.signOut()
    setSession(null)
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    // listUsers applies profile overrides, so a name edited on /profile
    // shows in the TopBar immediately (USERS is the untouched seed).
    // profileTick is read here so refreshProfile() re-runs the lookup.
    void profileTick
    const user = session ? PlatformService.listUsers().find(u => u.id === session.userId) ?? null : null
    return {
      session,
      role: session?.role ?? null,
      currentUser: user,
      signIn,
      switchRole,
      signOut,
      refreshProfile,
    }
  }, [session, signIn, switchRole, signOut, refreshProfile, profileTick])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
