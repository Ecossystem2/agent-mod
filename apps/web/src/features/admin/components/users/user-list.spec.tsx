import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UserList } from './user-list'

import type { AdminUser, Role } from '@/features/admin/types'
import type { ReactElement } from 'react'

import { api } from '@/lib/api-client'
import { renderWithProviders } from '@/test/render-with-providers'

vi.mock('@/features/admin/components/users/user-deactivate-dialog', () => ({
  UserDeactivateDialog: ({
    user,
    open,
    onOpenChange,
  }: {
    user: { name: string }
    open: boolean
    onOpenChange: (open: boolean) => void
  }): ReactElement => {
    if (!open) return <></>
    return (
      <div role="alertdialog" data-testid="deactivate-dialog">
        <p>Desativar {user.name}</p>
        <button onClick={() => onOpenChange(false)}>Cancelar</button>
        <button onClick={() => onOpenChange(true)} data-testid="open-change-true">
          Reabrir
        </button>
      </div>
    )
  },
}))

const toastSuccess = vi.fn()
const toastError = vi.fn()

vi.mock('sonner', () => ({
  toast: {
    success: (msg: string) => toastSuccess(msg),
    error: (msg: string) => toastError(msg),
  },
}))

vi.mock('@/lib/api-client', () => ({
  api: { patch: vi.fn() },
}))

const roles: Role[] = [
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

const activeUser: AdminUser = {
  id: 'u1',
  email: 'joao@example.com',
  name: 'João Silva',
  emailVerified: true,
  roleIds: ['r1'],
  createdAt: '2026-01-01T00:00:00.000Z',
  isActive: true,
  isProtected: false,
}

const inactiveUser: AdminUser = {
  id: 'u2',
  email: 'maria@example.com',
  name: 'Maria Souza',
  emailVerified: false,
  roleIds: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  isActive: false,
  isProtected: false,
}

const protectedUser: AdminUser = {
  id: 'u3',
  email: 'admin@example.com',
  name: 'Admin',
  emailVerified: true,
  roleIds: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  isActive: true,
  isProtected: true,
}

const defaultProps = {
  users: [],
  roles,
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onCreateClick: vi.fn(),
}

describe('UserList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exibe mensagem sem permissão quando hasPermission é false', () => {
    renderWithProviders(<UserList {...defaultProps} hasPermission={false} />)

    expect(
      screen.getByText('Você não tem permissão para visualizar usuários.'),
    ).toBeInTheDocument()
  })

  it('exibe spinner de carregamento quando isLoading é true', () => {
    renderWithProviders(<UserList {...defaultProps} isLoading />)

    expect(screen.getByText('Carregando usuários...')).toBeInTheDocument()
  })

  it('exibe mensagem de erro quando isError é true', () => {
    renderWithProviders(<UserList {...defaultProps} isError />)

    expect(screen.getByText('Erro ao carregar usuários.')).toBeInTheDocument()
  })

  it('exibe botão Tentar novamente quando isError e onRetry estão presentes', async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup({ delay: null })
    renderWithProviders(<UserList {...defaultProps} isError onRetry={onRetry} />)

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('não exibe botão Tentar novamente quando onRetry não é fornecido', () => {
    renderWithProviders(<UserList {...defaultProps} isError />)

    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument()
  })

  it('exibe mensagem quando a lista de usuários está vazia', () => {
    renderWithProviders(<UserList {...defaultProps} users={[]} />)

    expect(screen.getByText('Nenhum usuário encontrado.')).toBeInTheDocument()
  })

  it('chama onCreateClick ao clicar em Novo Usuario', async () => {
    const onCreateClick = vi.fn()
    const user = userEvent.setup({ delay: null })
    renderWithProviders(<UserList {...defaultProps} onCreateClick={onCreateClick} />)

    await user.click(screen.getByRole('button', { name: 'Novo Usuário' }))

    expect(onCreateClick).toHaveBeenCalledTimes(1)
  })

  it('renderiza usuário ativo com botões Editar, Desativar e Excluir', () => {
    renderWithProviders(<UserList {...defaultProps} users={[activeUser]} />)

    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Desativar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument()
  })

  it('chama onEdit ao clicar em Editar', async () => {
    const onEdit = vi.fn()
    const user = userEvent.setup({ delay: null })
    renderWithProviders(<UserList {...defaultProps} users={[activeUser]} onEdit={onEdit} />)

    await user.click(screen.getByRole('button', { name: 'Editar' }))

    expect(onEdit).toHaveBeenCalledWith(activeUser)
  })

  it('chama onDelete ao clicar em Excluir em usuário não-protegido', async () => {
    const onDelete = vi.fn()
    const user = userEvent.setup({ delay: null })
    renderWithProviders(<UserList {...defaultProps} users={[activeUser]} onDelete={onDelete} />)

    await user.click(screen.getByRole('button', { name: 'Excluir' }))

    expect(onDelete).toHaveBeenCalledWith(activeUser)
  })

  it('exibe badge Inativo para usuário inativo', () => {
    renderWithProviders(<UserList {...defaultProps} users={[inactiveUser]} />)

    expect(screen.getByText('Inativo')).toBeInTheDocument()
  })

  it('exibe email não verificado como "Nao"', () => {
    renderWithProviders(<UserList {...defaultProps} users={[inactiveUser]} />)

    expect(screen.getByText('Nao')).toBeInTheDocument()
  })

  it('exibe email verificado como "Sim"', () => {
    renderWithProviders(<UserList {...defaultProps} users={[activeUser]} />)

    expect(screen.getByText('Sim')).toBeInTheDocument()
  })

  it('exibe "Nenhum" quando usuário não tem cargos', () => {
    renderWithProviders(<UserList {...defaultProps} users={[inactiveUser]} />)

    expect(screen.getByText('Nenhum')).toBeInTheDocument()
  })

  it('exibe o nome do cargo resolvido a partir do roleId', () => {
    renderWithProviders(<UserList {...defaultProps} users={[activeUser]} roles={roles} />)

    expect(screen.getByText('Administrador')).toBeInTheDocument()
  })

  it('exibe o roleId diretamente quando o cargo não é encontrado', () => {
    renderWithProviders(
      <UserList
        {...defaultProps}
        users={[{ ...activeUser, roleIds: ['cargo-desconhecido'] }]}
        roles={[]}
      />,
    )

    expect(screen.getByText('cargo-desconhecido')).toBeInTheDocument()
  })

  it('exibe botão Reativar para usuário inativo e chama reactivate ao clicar', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} })
    const user = userEvent.setup({ delay: null })
    renderWithProviders(<UserList {...defaultProps} users={[inactiveUser]} />)

    await user.click(screen.getByRole('button', { name: 'Reativar' }))

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/api/admin/users/u2/reactivate')
    })
    expect(toastSuccess).toHaveBeenCalledWith('Conta reativada com sucesso.')
  })

  it('exibe "Reativando..." quando reactivate está pendente', async () => {
    let resolveReactivate!: () => void
    vi.mocked(api.patch).mockReturnValue(
      new Promise<{ data: object }>((resolve) => {
        resolveReactivate = () => resolve({ data: {} })
      }),
    )
    const user = userEvent.setup({ delay: null })
    renderWithProviders(<UserList {...defaultProps} users={[inactiveUser]} />)

    await user.click(screen.getByRole('button', { name: 'Reativar' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Reativando...' })).toBeDisabled()
    })

    resolveReactivate()
  })

  it('exibe toast de erro quando reativação falha', async () => {
    vi.mocked(api.patch).mockRejectedValue(new Error('erro'))
    const user = userEvent.setup({ delay: null })
    renderWithProviders(<UserList {...defaultProps} users={[inactiveUser]} />)

    await user.click(screen.getByRole('button', { name: 'Reativar' }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Erro ao reativar a conta.')
    })
  })

  it('abre UserDeactivateDialog ao clicar em Desativar e fecha ao cancelar', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProviders(<UserList {...defaultProps} users={[activeUser]} />)

    await user.click(screen.getByRole('button', { name: 'Desativar' }))

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })
  })

  it('não limpa o deactivateTarget quando onOpenChange é chamado com true (ramo defensivo)', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProviders(<UserList {...defaultProps} users={[activeUser]} />)

    await user.click(screen.getByRole('button', { name: 'Desativar' }))

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    // Chama onOpenChange(true) — o ramo `if (!open)` é false, o diálogo permanece aberto
    await user.click(screen.getByTestId('open-change-true'))

    // O diálogo ainda está visível pois setDeactivateTarget(null) não foi chamado
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('renderiza botões Desativar e Excluir desabilitados para usuário protegido', () => {
    renderWithProviders(<UserList {...defaultProps} users={[protectedUser]} />)

    const desativarButtons = screen.getAllByRole('button', { name: 'Desativar' })
    expect(desativarButtons[0]).toBeDisabled()

    const excluirButtons = screen.getAllByRole('button', { name: 'Excluir' })
    expect(excluirButtons[0]).toBeDisabled()
  })

  it('exibe tooltip de proteção para usuário protegido', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProviders(<UserList {...defaultProps} users={[protectedUser]} />)

    const [disabledDesativar] = screen.getAllByRole('button', { name: 'Desativar' })
    if (!disabledDesativar) throw new Error('botão Desativar ausente')
    await user.hover(disabledDesativar)

    await waitFor(() => {
      expect(
        screen.getAllByText('Esta conta é protegida e não pode ser desativada').length,
      ).toBeGreaterThan(0)
    })
  })

  it('exibe "Carregar mais" e chama onLoadMore quando há próxima página', async () => {
    const onLoadMore = vi.fn()
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <UserList
        {...defaultProps}
        users={[activeUser]}
        hasNextPage
        onLoadMore={onLoadMore}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Carregar mais' }))

    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('não exibe "Carregar mais" quando não há próxima página', () => {
    renderWithProviders(
      <UserList {...defaultProps} users={[activeUser]} hasNextPage={false} onLoadMore={vi.fn()} />,
    )

    expect(screen.queryByRole('button', { name: 'Carregar mais' })).not.toBeInTheDocument()
  })
})
