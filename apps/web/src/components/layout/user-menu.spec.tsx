import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UserMenu } from './user-menu'

const useAuthMock = vi.fn()
const mutate = vi.fn()
const useSignOutMock = vi.fn()

vi.mock('@/providers/auth-context', () => ({
  useAuth: () => useAuthMock() as unknown,
}))

vi.mock('@/features/auth/hooks/use-sign-out', () => ({
  useSignOut: () => useSignOutMock() as unknown,
}))

describe('UserMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSignOutMock.mockReturnValue({ mutate, isPending: false })
  })

  it('não renderiza nada sem usuário', () => {
    useAuthMock.mockReturnValue({ user: null })

    const { container } = render(<UserMenu />)

    expect(container).toBeEmptyDOMElement()
  })

  it('mostra iniciais de nome composto', () => {
    useAuthMock.mockReturnValue({ user: { name: 'Maria Silva', email: 'maria@x.com' } })

    render(<UserMenu />)

    expect(screen.getByText('MS')).toBeInTheDocument()
  })

  it('mostra iniciais de nome único', () => {
    useAuthMock.mockReturnValue({ user: { name: 'Maria', email: 'm@x.com' } })

    render(<UserMenu />)

    expect(screen.getByText('MA')).toBeInTheDocument()
  })

  it('mostra placeholder quando o nome é vazio', () => {
    useAuthMock.mockReturnValue({ user: { name: '   ', email: 'm@x.com' } })

    render(<UserMenu />)

    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('abre o menu e dispara logout', async () => {
    useAuthMock.mockReturnValue({ user: { name: 'Maria Silva', email: 'maria@x.com' } })

    render(<UserMenu />)
    await userEvent.click(screen.getByRole('button', { name: 'Menu do usuário' }))

    expect(screen.getByText('maria@x.com')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('menuitem'))

    expect(mutate).toHaveBeenCalledTimes(1)
  })

  it('fecha o menu pelo backdrop', async () => {
    useAuthMock.mockReturnValue({ user: { name: 'Maria Silva', email: 'maria@x.com' } })

    render(<UserMenu />)
    await userEvent.click(screen.getByRole('button', { name: 'Menu do usuário' }))
    await userEvent.click(screen.getByRole('button', { name: 'Fechar menu do usuário' }))

    expect(screen.queryByText('maria@x.com')).not.toBeInTheDocument()
  })

  it('desabilita o logout enquanto pendente', async () => {
    useAuthMock.mockReturnValue({ user: { name: 'Maria Silva', email: 'maria@x.com' } })
    useSignOutMock.mockReturnValue({ mutate, isPending: true })

    render(<UserMenu />)
    await userEvent.click(screen.getByRole('button', { name: 'Menu do usuário' }))

    expect(screen.getByRole('menuitem')).toBeDisabled()
  })
})
