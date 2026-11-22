import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { AuthService, USERS } from '../services'
import type { Session, Role } from '../services/types'
import type { Person } from '../mock/data'

interface AuthContextValue {
  session: Session | null
  role: Role | null
  currentUser: Person | null
  signIn: () => void
  switchRole: (role: Role) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => AuthService.getSession())

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
    const user = session ? USERS.find(u => u.id === session.userId) ?? null : null
    return {
      session,
      role: session?.role ?? null,
      currentUser: user,
      signIn,
      switchRole,
      signOut,
    }
  }, [session, signIn, switchRole, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
