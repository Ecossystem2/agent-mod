import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AuthContext, useAuth } from './auth-context'

import type { AuthContextValue } from './auth-context'

describe('useAuth', () => {
  it('lança erro quando usado fora do AuthProvider', () => {
    function Consumer() {
      useAuth()
      return null
    }

    expect(() => render(<Consumer />)).toThrow(
      'useAuth deve ser usado dentro de <AuthProvider />',
    )
  })

  it('retorna o valor do contexto quando usado dentro do AuthProvider', () => {
    const value: AuthContextValue = {
      user: { id: 'u1', email: 'test@example.com', name: 'Test', emailVerified: true },
      isLoading: false,
      isAuthenticated: true,
      refresh: vi.fn(),
    }

    function Consumer() {
      const ctx = useAuth()
      return <div>{ctx.user?.name}</div>
    }

    render(
      <AuthContext.Provider value={value}>
        <Consumer />
      </AuthContext.Provider>,
    )

    expect(screen.getByText('Test')).toBeInTheDocument()
  })
})
