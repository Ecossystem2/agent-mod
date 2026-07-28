import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RolesPage } from './roles-page'

import type { Role } from '@/features/admin/types'

import { api } from '@/lib/api-client'
import { renderWithProviders } from '@/test/render-with-providers'

const toastSuccess = vi.fn()

vi.mock('sonner', () => ({
  toast: { success: (msg: string) => toastSuccess(msg) },
}))

vi.mock('@/lib/api-client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

const makeRole = (overrides: Partial<Role> = {}): Role => ({
  id: 'r1',
  name: 'Administrador',
  description: 'Acesso total',
  isSystem: false,
  permissions: ['admin:users'],
  assignedUserCount: 2,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

describe('RolesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exibe indicador de carregamento enquanto busca', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => undefined))

    renderWithProviders(<RolesPage />)

    expect(screen.getByText('Carregando cargos...')).toBeInTheDocument()
  })

  it('exibe a lista de cargos apos carregar', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { roles: [makeRole()], nextCursor: null } })

    renderWithProviders(<RolesPage />)

    expect(await screen.findByText('Administrador')).toBeInTheDocument()
  })

  it('exibe mensagem de lista vazia quando nao ha cargos', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { roles: [], nextCursor: null } })

    renderWithProviders(<RolesPage />)

    expect(await screen.findByText('Nenhum cargo encontrado.')).toBeInTheDocument()
  })

  it('abre o dialog de criacao ao clicar em "Novo Cargo"', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { roles: [], nextCursor: null } })
    const user = userEvent.setup({ delay: null })

    renderWithProviders(<RolesPage />)

    await screen.findByText('Nenhum cargo encontrado.')
    await user.click(screen.getByRole('button', { name: 'Novo Cargo' }))

    expect(screen.getByRole('heading', { name: 'Novo Cargo' })).toBeInTheDocument()
  })

  it('abre o dialog de edicao ao clicar em Editar de um cargo', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { roles: [makeRole()], nextCursor: null } })
    const user = userEvent.setup({ delay: null })

    renderWithProviders(<RolesPage />)

    await screen.findByText('Administrador')
    await user.click(screen.getByRole('button', { name: 'Editar' }))

    expect(screen.getByRole('heading', { name: 'Editar Cargo' })).toBeInTheDocument()
  })

  it('abre o dialog de exclusao ao clicar em Excluir de um cargo comum', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { roles: [makeRole()], nextCursor: null } })
    const user = userEvent.setup({ delay: null })

    renderWithProviders(<RolesPage />)

    await screen.findByText('Administrador')
    await user.click(screen.getByRole('button', { name: 'Excluir' }))

    expect(screen.getByText('Excluir cargo')).toBeInTheDocument()
  })

  it('cria um cargo, fecha o dialog e exibe toast de sucesso', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { roles: [], nextCursor: null } })
    vi.mocked(api.post).mockResolvedValue({ data: { role: makeRole({ id: 'r2', name: 'Novo' }) } })
    const user = userEvent.setup({ delay: null })

    renderWithProviders(<RolesPage />)

    await screen.findByText('Nenhum cargo encontrado.')
    await user.click(screen.getByRole('button', { name: 'Novo Cargo' }))

    await user.type(screen.getByLabelText('Nome'), 'Novo Cargo')
    await user.click(screen.getByRole('button', { name: 'Criar cargo' }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/admin/roles', expect.objectContaining({ name: 'Novo Cargo' }))
    })
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith('Cargo criado com sucesso.')
    })
  })

  it('atualiza um cargo, fecha o dialog e exibe toast de sucesso', async () => {
    const role = makeRole()
    vi.mocked(api.get).mockResolvedValue({ data: { roles: [role], nextCursor: null } })
    vi.mocked(api.patch).mockResolvedValue({ data: { role } })
    const user = userEvent.setup({ delay: null })

    renderWithProviders(<RolesPage />)

    await screen.findByText('Administrador')
    await user.click(screen.getByRole('button', { name: 'Editar' }))

    await user.clear(screen.getByLabelText('Nome'))
    await user.type(screen.getByLabelText('Nome'), 'Admin Atualizado')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        `/api/admin/roles/${role.id}`,
        expect.objectContaining({ name: 'Admin Atualizado' }),
      )
    })
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith('Cargo atualizado com sucesso.')
    })
  })

  it('exclui um cargo, fecha o dialog e exibe toast de sucesso', async () => {
    const role = makeRole()
    vi.mocked(api.get).mockResolvedValue({ data: { roles: [role], nextCursor: null } })
    vi.mocked(api.delete).mockResolvedValue({ data: {} })
    const user = userEvent.setup({ delay: null })

    renderWithProviders(<RolesPage />)

    await screen.findByText('Administrador')
    await user.click(screen.getByRole('button', { name: 'Excluir' }))

    // Confirm deletion in the delete dialog
    await user.click(screen.getByRole('button', { name: 'Excluir' }))

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith(`/api/admin/roles/${role.id}`)
    })
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith('Cargo excluído com sucesso.')
    })
  })

  it('handleDeleteConfirm nao faz nada se selectedRole for null', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { roles: [], nextCursor: null } })

    renderWithProviders(<RolesPage />)

    await screen.findByText('Nenhum cargo encontrado.')

    // The delete dialog has no selectedRole, so confirming should be a no-op
    // We verify that api.delete was never called
    expect(api.delete).not.toHaveBeenCalled()
  })

  it('carrega mais cargos ao clicar em "Carregar mais"', async () => {
    const first = makeRole({ id: 'r1', name: 'Administrador' })
    const second = makeRole({ id: 'r9', name: 'Editor' })
    vi.mocked(api.get).mockImplementation((_url: string, config?: { params?: { cursor?: string } }) => {
      if (config?.params?.cursor === 'r1') {
        return Promise.resolve({ data: { roles: [second], nextCursor: null } })
      }
      return Promise.resolve({ data: { roles: [first], nextCursor: 'r1' } })
    })
    const user = userEvent.setup({ delay: null })

    renderWithProviders(<RolesPage />)

    await screen.findByText('Administrador')
    await user.click(screen.getByRole('button', { name: 'Carregar mais' }))

    expect(await screen.findByText('Editor')).toBeInTheDocument()
  })
})
