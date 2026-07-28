import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UserFormDialog } from './user-form-dialog'

import type { AdminUser, Role } from '@/features/admin/types'

import { api } from '@/lib/api-client'
import { renderWithProviders } from '@/test/render-with-providers'

const toastSuccess = vi.fn()
const toastWarning = vi.fn()

vi.mock('sonner', () => ({
  toast: {
    success: (msg: string) => toastSuccess(msg),
    warning: (msg: string) => toastWarning(msg),
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

const existingUser: AdminUser = {
  id: 'u1',
  email: 'maria@example.com',
  name: 'Maria',
  emailVerified: true,
  roleIds: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  isActive: true,
  isProtected: false,
}

describe('UserFormDialog — renderização com open={false}', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('não renderiza o conteúdo do diálogo quando open é false', () => {
    renderWithProviders(
      <UserFormDialog
        open={false}
        onOpenChange={vi.fn()}
        user={null}
        roles={roles}
        onSubmit={vi.fn()}
        isPending={false}
      />,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('não renderiza o diálogo de edição quando open é false', () => {
    renderWithProviders(
      <UserFormDialog
        open={false}
        onOpenChange={vi.fn()}
        user={existingUser}
        roles={roles}
        onSubmit={vi.fn()}
        isPending={false}
      />,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('UserFormDialog — modo criação', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('valida os campos obrigatórios e não chama onSubmit', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <UserFormDialog
        open
        onOpenChange={vi.fn()}
        user={null}
        roles={roles}
        onSubmit={onSubmit}
        isPending={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Criar usuário' }))

    expect(await screen.findByText('Nome obrigatório')).toBeInTheDocument()
    expect(screen.getByText('E-mail inválido')).toBeInTheDocument()
    expect(screen.getByText('Mínimo 12 caracteres')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('chama onSubmit com os valores e os cargos selecionados', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <UserFormDialog
        open
        onOpenChange={vi.fn()}
        user={null}
        roles={roles}
        onSubmit={onSubmit}
        isPending={false}
      />,
    )

    await user.type(screen.getByLabelText('Nome'), 'João Silva')
    await user.type(screen.getByLabelText('E-mail'), 'joao@example.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-bem-longa-12')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Criar usuário' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        {
          name: 'João Silva',
          email: 'joao@example.com',
          password: 'senha-bem-longa-12',
          roleIds: ['r1'],
        },
        expect.anything(),
      )
    })
  })
})

describe('UserFormDialog — modo criação — ações de cancelamento e estado pendente', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fecha o diálogo ao clicar em Cancelar no modo criação', async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <UserFormDialog
        open
        onOpenChange={onOpenChange}
        user={null}
        roles={roles}
        onSubmit={vi.fn()}
        isPending={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

describe('UserFormDialog — modo criação sem cargos disponíveis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exibe "Nenhum cargo disponivel" quando não há cargos no modo criação', () => {
    renderWithProviders(
      <UserFormDialog
        open
        onOpenChange={vi.fn()}
        user={null}
        roles={[]}
        onSubmit={vi.fn()}
        isPending={false}
      />,
    )

    expect(screen.getByText('Nenhum cargo disponível.')).toBeInTheDocument()
  })

  it('exibe estado "Criando..." quando isPending é true no modo criação', () => {
    renderWithProviders(
      <UserFormDialog
        open
        onOpenChange={vi.fn()}
        user={null}
        roles={[]}
        onSubmit={vi.fn()}
        isPending
      />,
    )

    expect(screen.getByRole('button', { name: 'Criando...' })).toBeDisabled()
  })
})

describe('UserFormDialog — modo edição', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('vem pré-preenchido com os dados do usuário', () => {
    renderWithProviders(
      <UserFormDialog
        open
        onOpenChange={vi.fn()}
        user={existingUser}
        roles={roles}
        onSubmit={vi.fn()}
        isPending={false}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Editar usuário' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveValue('Maria')
    expect(screen.getByLabelText('E-mail')).toHaveValue('maria@example.com')
  })

  it('exibe "Nenhum cargo disponivel" quando não há cargos no modo edição', () => {
    renderWithProviders(
      <UserFormDialog
        open
        onOpenChange={vi.fn()}
        user={existingUser}
        roles={[]}
        onSubmit={vi.fn()}
        isPending={false}
      />,
    )

    expect(screen.getByText('Nenhum cargo disponível.')).toBeInTheDocument()
  })

  it('alterna a seleção de cargo ao clicar no checkbox no modo edição', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { user: existingUser } })
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <UserFormDialog
        open
        onOpenChange={vi.fn()}
        user={existingUser}
        roles={roles}
        onSubmit={vi.fn()}
        isPending={false}
      />,
    )

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()

    await user.click(checkbox)
    expect(checkbox).toBeChecked()

    await user.click(checkbox)
    expect(checkbox).not.toBeChecked()
  })

  it('exibe erro de nome vazio no modo edição', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <UserFormDialog
        open
        onOpenChange={vi.fn()}
        user={existingUser}
        roles={roles}
        onSubmit={vi.fn()}
        isPending={false}
      />,
    )

    await user.clear(screen.getByLabelText('Nome'))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Nome obrigatório')).toBeInTheDocument()
  })

  it('exibe erro de e-mail inválido no modo edição ao submeter sem e-mail', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <UserFormDialog
        open
        onOpenChange={vi.fn()}
        user={existingUser}
        roles={roles}
        onSubmit={vi.fn()}
        isPending={false}
      />,
    )

    // Seleciona todo o texto do campo e-mail e apaga
    const emailInput = screen.getByLabelText('E-mail')
    await user.tripleClick(emailInput)
    await user.keyboard('{Backspace}')

    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('E-mail inválido')).toBeInTheDocument()
  })

  it('exibe erro de senha curta no modo edição', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <UserFormDialog
        open
        onOpenChange={vi.fn()}
        user={existingUser}
        roles={roles}
        onSubmit={vi.fn()}
        isPending={false}
      />,
    )

    await user.type(screen.getByLabelText('Nova senha'), 'curta')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Mínimo 8 caracteres')).toBeInTheDocument()
  })

  it('exibe "Salvando..." e desabilita botões quando isSubmitting é true', async () => {
    let resolvePatch!: (value: { data: { user: AdminUser } }) => void
    vi.mocked(api.patch).mockReturnValue(
      new Promise<{ data: { user: AdminUser } }>((resolve) => {
        resolvePatch = resolve
      }),
    )
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <UserFormDialog
        open
        onOpenChange={vi.fn()}
        user={existingUser}
        roles={roles}
        onSubmit={vi.fn()}
        isPending={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Salvando...' })).toBeDisabled()
    })

    resolvePatch({ data: { user: existingUser } })
  })

  it('exibe toast de aviso quando atualização de senha falha após salvar dados', async () => {
    vi.mocked(api.patch)
      .mockResolvedValueOnce({ data: { user: existingUser } }) // updateUser
      .mockRejectedValueOnce(new Error('erro')) // setPassword
    const onOpenChange = vi.fn()
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <UserFormDialog
        open
        onOpenChange={onOpenChange}
        user={existingUser}
        roles={roles}
        onSubmit={vi.fn()}
        isPending={false}
      />,
    )

    await user.type(screen.getByLabelText('Nova senha'), 'nova-senha-longa-123')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => {
      expect(toastWarning).toHaveBeenCalledWith(
        'Dados salvos, mas erro ao atualizar a senha. Tente novamente.',
      )
    })
  })

  it('fecha o diálogo ao clicar em Cancelar no modo edição', async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <UserFormDialog
        open
        onOpenChange={onOpenChange}
        user={existingUser}
        roles={roles}
        onSubmit={vi.fn()}
        isPending={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('atualiza o usuário sem trocar a senha e fecha com toast de sucesso', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { user: existingUser } })
    const onOpenChange = vi.fn()
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <UserFormDialog
        open
        onOpenChange={onOpenChange}
        user={existingUser}
        roles={roles}
        onSubmit={vi.fn()}
        isPending={false}
      />,
    )

    await user.clear(screen.getByLabelText('Nome'))
    await user.type(screen.getByLabelText('Nome'), 'Maria Souza')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/api/admin/users/u1', {
        name: 'Maria Souza',
        email: 'maria@example.com',
        roleIds: [],
      })
    })
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
    expect(toastSuccess).toHaveBeenCalledWith('Usuário atualizado com sucesso.')
    expect(api.patch).toHaveBeenCalledTimes(1)
  })

  it('atualiza o usuário e a senha quando uma nova senha é informada', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { user: existingUser } })
    const onOpenChange = vi.fn()
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <UserFormDialog
        open
        onOpenChange={onOpenChange}
        user={existingUser}
        roles={roles}
        onSubmit={vi.fn()}
        isPending={false}
      />,
    )

    await user.type(screen.getByLabelText('Nova senha'), 'nova-senha-123')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/api/admin/users/u1/password', {
        newPassword: 'nova-senha-123',
      })
    })
    expect(toastSuccess).toHaveBeenCalledWith('Usuário atualizado com sucesso.')
  })
})
