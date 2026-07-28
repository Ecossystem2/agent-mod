import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UserDeactivateDialog } from './user-deactivate-dialog'

import type { AdminUser } from '@/features/admin/types'

import { api } from '@/lib/api-client'
import { renderWithProviders } from '@/test/render-with-providers'



const toastSuccess = vi.fn()

vi.mock('sonner', () => ({
  toast: { success: (msg: string) => toastSuccess(msg), warning: vi.fn() },
}))

vi.mock('@/lib/api-client', () => ({
  api: { patch: vi.fn() },
}))

const user: AdminUser = {
  id: 'u1',
  email: 'maria@example.com',
  name: 'Maria',
  emailVerified: true,
  roleIds: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  isActive: true,
  isProtected: false,
}

describe('UserDeactivateDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mostra o nome do usuário na confirmação', () => {
    renderWithProviders(<UserDeactivateDialog user={user} open onOpenChange={vi.fn()} />)

    expect(screen.getByRole('alertdialog')).toHaveTextContent('Maria')
  })

  it('desativa, fecha o diálogo e dispara o toast de sucesso ao confirmar', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} })
    const onOpenChange = vi.fn()
    const userEventInstance = userEvent.setup()
    renderWithProviders(<UserDeactivateDialog user={user} open onOpenChange={onOpenChange} />)

    await userEventInstance.click(screen.getByRole('button', { name: 'Desativar' }))

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/api/admin/users/u1/deactivate')
    })
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
    expect(toastSuccess).toHaveBeenCalledWith('Conta desativada com sucesso.')
  })

  it('exibe "Desativando..." e desabilita os botões enquanto a mutação está pendente', async () => {
    let resolveDeactivate!: () => void
    vi.mocked(api.patch).mockReturnValue(
      new Promise<{ data: object }>((resolve) => {
        resolveDeactivate = () => resolve({ data: {} })
      }),
    )

    const userEventInstance = userEvent.setup()
    renderWithProviders(<UserDeactivateDialog user={user} open onOpenChange={vi.fn()} />)

    await userEventInstance.click(screen.getByRole('button', { name: 'Desativar' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Desativando...' })).toBeDisabled()
    })
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()

    resolveDeactivate()
  })
})
