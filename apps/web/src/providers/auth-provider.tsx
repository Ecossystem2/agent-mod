import { useQuery } from '@tanstack/react-query'

import type { ReactElement, ReactNode } from 'react'

import { api } from '@/lib/api-client'
import { AuthContext, type AuthContextValue, type AuthUser } from '@/providers/auth-context'

async function fetchSession(): Promise<AuthUser | null> {
  try {
    const { data } = await api.get<{ user?: AuthUser; permissions?: readonly string[] } | null>(
      '/api/auth/get-session',
    )
    if (!data?.user) return null
    return { ...data.user, permissions: data.permissions ?? [] }
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: fetchSession,
    staleTime: 60_000,
    retry: false,
  })

  const value: AuthContextValue = {
    user: data ?? null,
    isLoading,
    isAuthenticated: !!data,
    refresh: async () => {
      await refetch()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
