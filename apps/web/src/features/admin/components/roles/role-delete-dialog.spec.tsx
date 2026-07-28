import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RoleDeleteDialog } from './role-delete-dialog'

import type { Role } from '@/features/admin/types'

import { renderWithProviders } from '@/test/render-with-providers'


const makeRole = (overrides: Partial<Role> = {}): Role => ({
  id: 'r1',
  name: 'Administrador',
  description: null,
  isSystem: false,
  permissions: ['admin:users'],
  assignedUserCount: 2,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

describe('RoleDeleteDialog', () => {
  const onOpenChange = vi.fn()
  const onConfirm = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exibe o nome do cargo na confirmacao', () => {
    const role = makeRole({ name: 'Suporte' })
    renderWithProviders(
      <RoleDeleteDialog
        open
        onOpenChange={onOpenChange}
        role={role}
        onConfirm={onConfirm}
        isPending={false}
      />,
    )

    expect(screen.getByRole('dialog')).toHaveTextContent('Suporte')
  })

  it('exibe nome null quando role e null', () => {
    renderWithProviders(
      <RoleDeleteDialog
        open
        onOpenChange={onOpenChange}
        role={null}
        onConfirm={onConfirm}
        isPending={false}
      />,
    )

    // dialog still renders with the title
    expect(screen.getByText('Excluir cargo')).toBeInTheDocument()
  })

  it('chama onConfirm ao clicar em Excluir', async () => {
    const role = makeRole()
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <RoleDeleteDialog
        open
        onOpenChange={onOpenChange}
        role={role}
        onConfirm={onConfirm}
        isPending={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Excluir' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('chama onOpenChange(false) ao clicar em Cancelar', async () => {
    const role = makeRole()
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <RoleDeleteDialog
        open
        onOpenChange={onOpenChange}
        role={role}
        onConfirm={onConfirm}
        isPending={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('botoes ficam desabilitados quando isPending=true', () => {
    const role = makeRole()
    renderWithProviders(
      <RoleDeleteDialog
        open
        onOpenChange={onOpenChange}
        role={role}
        onConfirm={onConfirm}
        isPending
      />,
    )

    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Excluindo...' })).toBeDisabled()
  })

  it('exibe texto "Excluindo..." quando isPending=true', () => {
    const role = makeRole()
    renderWithProviders(
      <RoleDeleteDialog
        open
        onOpenChange={onOpenChange}
        role={role}
        onConfirm={onConfirm}
        isPending
      />,
    )

    expect(screen.getByRole('button', { name: 'Excluindo...' })).toBeInTheDocument()
  })

  it('nao renderiza conteudo quando open=false', () => {
    const role = makeRole()
    renderWithProviders(
      <RoleDeleteDialog
        open={false}
        onOpenChange={onOpenChange}
        role={role}
        onConfirm={onConfirm}
        isPending={false}
      />,
    )

    expect(screen.queryByText('Excluir cargo')).not.toBeInTheDocument()
  })
})
