import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { UserDeleteDialog } from './user-delete-dialog'

import type { AdminUser } from '@/features/admin/types'

import { renderWithProviders } from '@/test/render-with-providers'

const mockUser: AdminUser = {
  id: 'u1',
  email: 'joao@example.com',
  name: 'João Silva',
  emailVerified: true,
  roleIds: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  isActive: true,
  isProtected: false,
}

describe('UserDeleteDialog', () => {
  it('não renderiza conteúdo quando open é false', () => {
    renderWithProviders(
      <UserDeleteDialog
        open={false}
        onOpenChange={vi.fn()}
        user={mockUser}
        onConfirm={vi.fn()}
        isPending={false}
      />,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('exibe o nome do usuário na mensagem de confirmação', () => {
    renderWithProviders(
      <UserDeleteDialog
        open
        onOpenChange={vi.fn()}
        user={mockUser}
        onConfirm={vi.fn()}
        isPending={false}
      />,
    )

    expect(screen.getByRole('dialog')).toHaveTextContent('João Silva')
    expect(screen.getByText(/Esta acao nao pode ser desfeita/)).toBeInTheDocument()
  })

  it('exibe o nome como null quando user é null', () => {
    renderWithProviders(
      <UserDeleteDialog
        open
        onOpenChange={vi.fn()}
        user={null}
        onConfirm={vi.fn()}
        isPending={false}
      />,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('chama onOpenChange(false) ao clicar em Cancelar', async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <UserDeleteDialog
        open
        onOpenChange={onOpenChange}
        user={mockUser}
        onConfirm={vi.fn()}
        isPending={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('chama onConfirm ao clicar em Excluir', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <UserDeleteDialog
        open
        onOpenChange={vi.fn()}
        user={mockUser}
        onConfirm={onConfirm}
        isPending={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Excluir' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('desabilita os botões e exibe "Excluindo..." quando isPending é true', () => {
    renderWithProviders(
      <UserDeleteDialog
        open
        onOpenChange={vi.fn()}
        user={mockUser}
        onConfirm={vi.fn()}
        isPending
      />,
    )

    expect(screen.getByRole('button', { name: 'Excluindo...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  })
})
