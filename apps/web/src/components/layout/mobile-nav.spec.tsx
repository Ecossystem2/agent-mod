import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MobileNav } from './mobile-nav'

import { renderWithProviders } from '@/test/render-with-providers'

const useAuthMock = vi.fn()

vi.mock('@/providers/auth-context', () => ({
  useAuth: () => useAuthMock() as unknown,
}))

describe('MobileNav', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthMock.mockReturnValue({ user: { permissions: ['admin:users', 'admin:roles'] } })
  })

  it('abre o drawer ao clicar no menu e mostra os itens', async () => {
    renderWithProviders(<MobileNav />)

    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu de navegação' }))

    expect(screen.getByText('Usuarios')).toBeInTheDocument()
    expect(screen.getByText('Cargos')).toBeInTheDocument()
  })

  it('fecha o drawer pelo backdrop', async () => {
    renderWithProviders(<MobileNav />)

    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu de navegação' }))
    await userEvent.click(screen.getByRole('button', { name: 'Fechar menu de navegação' }))

    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument()
  })

  it('fecha o drawer ao navegar por um item', async () => {
    renderWithProviders(<MobileNav />)

    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu de navegação' }))
    await userEvent.click(screen.getByRole('link', { name: 'Usuarios' }))

    expect(screen.queryByText('Cargos')).not.toBeInTheDocument()
  })
})
