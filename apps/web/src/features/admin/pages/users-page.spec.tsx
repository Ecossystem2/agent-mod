import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UsersPage } from './users-page'

import type { ReactElement } from 'react'

import { api } from '@/lib/api-client'
import { renderWithProviders } from '@/test/render-with-providers'

// Captura props dos diálogos para testar ramos defensivos
let capturedOnConfirm: (() => void) | null = null
let capturedEditOnSubmit: ((values: Record<string, unknown>) => void) | null = null

vi.mock('@/features/admin/components/users/user-delete-dialog', () => ({
  UserDeleteDialog: ({
    open,
    onOpenChange,
    user,
    onConfirm,
    isPending,
  }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    user: { name: string } | null
    onConfirm: () => void
    isPending: boolean
  }): ReactElement => {
    capturedOnConfirm = onConfirm
    if (!open) return <></>
    return (
      <div role="dialog" data-testid="delete-dialog">
        <p>Excluir usuario</p>
        <p>{user?.name}</p>
        <button onClick={() => onOpenChange(false)} disabled={isPending}>
          Cancelar
        </button>
        <button data-testid="delete-confirm-btn" onClick={onConfirm} disabled={isPending}>
          {isPending ? 'Excluindo...' : 'Confirmar exclusao'}
        </button>
      </div>
    )
  },
}))

vi.mock('@/features/admin/components/users/user-form-dialog', () => ({
  UserFormDialog: ({
    open,
    onOpenChange,
    user,
    onSubmit,
  }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    user: { id: string; name: string; email: string; roleIds: string[] } | null
    onSubmit: (values: Record<string, unknown>) => void
    isPending: boolean
    roles: unknown[]
  }): ReactElement => {
    if (user !== null) {
      capturedEditOnSubmit = onSubmit
    }
    if (!open) return <></>
    if (user !== null) {
      return (
        <div>
          <h2>Editar usuario</h2>
          <button type="button" onClick={() => onOpenChange(false)}>
            Cancelar
          </button>
          <button
            type="button"
            data-testid="edit-submit-btn"
            onClick={() => onSubmit({ name: user.name, email: user.email, roleIds: [] })}
          >
            Salvar
          </button>
        </div>
      )
    }
    return (
      <div>
        <h2>Novo usuario</h2>
        <button type="button" onClick={() => onOpenChange(false)}>
          Cancelar
        </button>
        <button
          type="button"
          data-testid="create-submit-btn"
          onClick={() =>
            onSubmit({ name: 'Novo Usuario Test', email: 'novo@example.com', password: 'senha-bem-longa-12', roleIds: [] })
          }
        >
          Criar usuario
        </button>
      </div>
    )
  },
}))

const toastSuccess = vi.fn()

vi.mock('sonner', () => ({
  toast: {
    success: (msg: string) => toastSuccess(msg),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock('@/lib/api-client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

const mockUsers = [
  {
    id: 'u1',
    email: 'joao@example.com',
    name: 'João Silva',
    emailVerified: true,
    roleIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    isActive: true,
    isProtected: false,
  },
]

const mockRoles = [
  {
    id: 'r1',
    name: 'Administrador',
    description: null,
    isSystem: false,
    permissions: ['admin:users'],
    assignedUserCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
]

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnConfirm = null
    capturedEditOnSubmit = null
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/api/admin/users') {
        return Promise.resolve({ data: { users: mockUsers, nextCursor: null } })
      }
      if (url === '/api/admin/roles') {
        return Promise.resolve({ data: { roles: mockRoles, nextCursor: null } })
      }
      return Promise.resolve({ data: {} })
    })
  })

  it('exibe o spinner de carregamento enquanto busca os usuários', () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => undefined))
    renderWithProviders(<UsersPage />)

    expect(screen.getByText('Carregando usuários...')).toBeInTheDocument()
  })

  it('exibe a lista de usuários após o carregamento', async () => {
    renderWithProviders(<UsersPage />)

    expect(await screen.findByText('João Silva')).toBeInTheDocument()
  })

  it('exibe mensagem de erro quando a busca falha', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('erro de rede'))
    renderWithProviders(<UsersPage />)

    expect(await screen.findByText('Erro ao carregar usuários.')).toBeInTheDocument()
  })

  it('abre o formulário de criação ao clicar em Novo Usuario', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProviders(<UsersPage />)

    await screen.findByText('João Silva')
    await user.click(screen.getByRole('button', { name: 'Novo Usuário' }))

    expect(screen.getByRole('heading', { name: 'Novo usuario' })).toBeInTheDocument()
  })

  it('fecha o formulário de criação ao clicar em Cancelar', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProviders(<UsersPage />)

    await screen.findByText('João Silva')
    await user.click(screen.getByRole('button', { name: 'Novo Usuário' }))

    expect(screen.getByRole('heading', { name: 'Novo usuario' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Novo usuario' })).not.toBeInTheDocument()
    })
  })

  it('cria usuário com sucesso ao submeter o formulário de criação', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { user: { id: 'u2', name: 'Novo' } } })
    const user = userEvent.setup({ delay: null })
    renderWithProviders(<UsersPage />)

    await screen.findByText('João Silva')
    await user.click(screen.getByRole('button', { name: 'Novo Usuário' }))
    await user.click(screen.getByTestId('create-submit-btn'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/admin/users', {
        name: 'Novo Usuario Test',
        email: 'novo@example.com',
        password: 'senha-bem-longa-12',
        roleIds: [],
      })
    })
    expect(toastSuccess).toHaveBeenCalledWith('Usuário criado com sucesso.')
  })

  it('abre o formulário de edição ao clicar em Editar', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProviders(<UsersPage />)

    await screen.findByText('João Silva')
    await user.click(screen.getByRole('button', { name: 'Editar' }))

    expect(screen.getByRole('heading', { name: 'Editar usuario' })).toBeInTheDocument()
  })

  it('o onSubmit do formulário de edição é um noop (mutações gerenciadas internamente pelo UserFormDialog)', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProviders(<UsersPage />)

    await screen.findByText('João Silva')
    await user.click(screen.getByRole('button', { name: 'Editar' }))

    expect(capturedEditOnSubmit).not.toBeNull()
    // Chama o onSubmit passado ao UserFormDialog no modo edição — é um noop
    // Esta chamada cobre o ramo da função anônima `() => {}` no UsersPage
    if (capturedEditOnSubmit) capturedEditOnSubmit({ name: 'João Silva', email: 'joao@example.com', roleIds: [] })

    // Nenhuma mutação deve ter sido disparada pois é um noop
    expect(api.post).not.toHaveBeenCalled()
    expect(api.patch).not.toHaveBeenCalled()
  })

  it('abre o diálogo de exclusão ao clicar em Excluir e confirma a exclusão', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: {} })
    const user = userEvent.setup({ delay: null })
    renderWithProviders(<UsersPage />)

    await screen.findByText('João Silva')
    await user.click(screen.getByRole('button', { name: 'Excluir' }))

    expect(screen.getByTestId('delete-dialog')).toHaveTextContent('Excluir usuario')

    await user.click(screen.getByTestId('delete-confirm-btn'))

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/api/admin/users/u1')
    })
    expect(toastSuccess).toHaveBeenCalledWith('Usuário excluído com sucesso.')
  })

  it('fecha o diálogo de exclusão ao cancelar', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProviders(<UsersPage />)

    await screen.findByText('João Silva')
    await user.click(screen.getByRole('button', { name: 'Excluir' }))

    expect(screen.getByTestId('delete-dialog')).toHaveTextContent('Excluir usuario')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => {
      expect(screen.queryByTestId('delete-dialog')).not.toBeInTheDocument()
    })
  })

  it('não chama delete quando handleDeleteConfirm é chamado sem selectedUser (ramo defensivo)', async () => {
    renderWithProviders(<UsersPage />)

    await screen.findByText('João Silva')

    // capturedOnConfirm captura a prop onConfirm passada ao UserDeleteDialog
    // quando selectedUser=null (estado inicial da página)
    expect(capturedOnConfirm).not.toBeNull()
    if (capturedOnConfirm) capturedOnConfirm()

    // Nenhuma chamada de delete deve ocorrer pois selectedUser era null
    expect(api.delete).not.toHaveBeenCalled()
  })

  it('exibe lista vazia quando não há usuários', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/api/admin/users') {
        return Promise.resolve({ data: { users: [], nextCursor: null } })
      }
      if (url === '/api/admin/roles') {
        return Promise.resolve({ data: { roles: [], nextCursor: null } })
      }
      return Promise.resolve({ data: {} })
    })

    renderWithProviders(<UsersPage />)

    expect(await screen.findByText('Nenhum usuário encontrado.')).toBeInTheDocument()
  })

  it('chama refetch ao clicar em Tentar novamente no estado de erro', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('erro'))
    const user = userEvent.setup({ delay: null })
    renderWithProviders(<UsersPage />)

    expect(await screen.findByText('Erro ao carregar usuários.')).toBeInTheDocument()

    vi.mocked(api.get).mockResolvedValue({ data: { users: mockUsers, nextCursor: null } })
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('João Silva')).toBeInTheDocument()
  })

  it('carrega mais usuários ao clicar em "Carregar mais"', async () => {
    const secondUser = { ...mockUsers[0], id: 'u9', name: 'Pedro Lima' }
    vi.mocked(api.get).mockImplementation((url: string, config?: { params?: { cursor?: string } }) => {
      if (url === '/api/admin/users') {
        if (config?.params?.cursor === 'u1') {
          return Promise.resolve({ data: { users: [secondUser], nextCursor: null } })
        }
        return Promise.resolve({ data: { users: mockUsers, nextCursor: 'u1' } })
      }
      if (url === '/api/admin/roles') {
        return Promise.resolve({ data: { roles: mockRoles, nextCursor: null } })
      }
      return Promise.resolve({ data: {} })
    })
    const user = userEvent.setup({ delay: null })
    renderWithProviders(<UsersPage />)

    await screen.findByText('João Silva')
    await user.click(screen.getByRole('button', { name: 'Carregar mais' }))

    expect(await screen.findByText('Pedro Lima')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Carregar mais' })).not.toBeInTheDocument()
    })
  })
})
