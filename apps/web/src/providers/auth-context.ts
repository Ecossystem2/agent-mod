import { createContext, useContext } from 'react'

export interface AuthUser {
  id: string
  email: string
  name: string
  emailVerified: boolean
  role?: string | null
  permissions?: readonly string[]
  [extra: string]: unknown
}

export interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  refresh: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider />')
  return ctx
}
