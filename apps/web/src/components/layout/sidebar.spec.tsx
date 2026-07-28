import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Sidebar } from './sidebar'

import { renderWithProviders } from '@/test/render-with-providers'

const useAuthMock = vi.fn()

vi.mock('@/providers/auth-context', () => ({
  useAuth: () => useAuthMock() as unknown,
}))

describe('Sidebar', () => {
  it('mostra apenas os itens permitidos pelas permissões do usuário', () => {
    useAuthMock.mockReturnValue({ user: { permissions: ['admin:users'] } })

    renderWithProviders(<Sidebar />)

    expect(screen.getByText('Usuarios')).toBeInTheDocument()
    expect(screen.queryByText('Cargos')).not.toBeInTheDocument()
  })

  it('mostra ambos os itens quando o usuário tem as duas permissões', () => {
    useAuthMock.mockReturnValue({ user: { permissions: ['admin:users', 'admin:roles'] } })

    renderWithProviders(<Sidebar />)

    expect(screen.getByText('Usuarios')).toBeInTheDocument()
    expect(screen.getByText('Cargos')).toBeInTheDocument()
  })

  it('esconde todos os itens quando não há usuário (fallback de permissões vazio)', () => {
    useAuthMock.mockReturnValue({ user: null })

    renderWithProviders(<Sidebar />)

    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument()
    expect(screen.queryByText('Cargos')).not.toBeInTheDocument()
  })

  it('aplica a classe ativa no NavLink quando a rota atual coincide com o item', () => {
    useAuthMock.mockReturnValue({ user: { permissions: ['admin:users'] } })

    renderWithProviders(<Sidebar />, { route: '/app/admin/users' })

    const link = screen.getByRole('link', { name: 'Usuarios' })
    expect(link.className).toContain('bg-sidebar-accent')
  })
})
