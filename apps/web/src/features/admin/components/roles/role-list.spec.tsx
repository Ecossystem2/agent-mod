import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RoleList } from './role-list'

import type { Role } from '@/features/admin/types'

import { renderWithProviders } from '@/test/render-with-providers'


const makeRole = (overrides: Partial<Role> = {}): Role => ({
  id: 'r1',
  name: 'Administrador',
  description: 'Acesso total',
  isSystem: false,
  permissions: ['admin:users', 'admin:roles'],
  assignedUserCount: 3,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

describe('RoleList', () => {
  const onEdit = vi.fn()
  const onDelete = vi.fn()
  const onCreateClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exibe mensagem quando nao ha cargos', () => {
    renderWithProviders(
      <RoleList roles={[]} onEdit={onEdit} onDelete={onDelete} onCreateClick={onCreateClick} />,
    )

    expect(screen.getByText('Nenhum cargo encontrado.')).toBeInTheDocument()
  })

  it('exibe os dados do cargo na tabela', () => {
    const role = makeRole()
    renderWithProviders(
      <RoleList roles={[role]} onEdit={onEdit} onDelete={onDelete} onCreateClick={onCreateClick} />,
    )

    expect(screen.getByText('Administrador')).toBeInTheDocument()
    expect(screen.getByText('Acesso total')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    // 2 permissions — plural
    expect(screen.getByText('2 permissãoes')).toBeInTheDocument()
  })

  it('exibe "permissão" no singular quando ha exatamente 1 permissao', () => {
    const role = makeRole({ permissions: ['admin:users'] })
    renderWithProviders(
      <RoleList roles={[role]} onEdit={onEdit} onDelete={onDelete} onCreateClick={onCreateClick} />,
    )

    expect(screen.getByText('1 permissão')).toBeInTheDocument()
  })

  it('nao exibe descricao quando ela e nula', () => {
    const role = makeRole({ description: null })
    renderWithProviders(
      <RoleList roles={[role]} onEdit={onEdit} onDelete={onDelete} onCreateClick={onCreateClick} />,
    )

    // description div must not be rendered — just the name
    expect(screen.queryByText('Acesso total')).not.toBeInTheDocument()
  })

  it('exibe badge "Sistema" para cargo de sistema', () => {
    const role = makeRole({ isSystem: true })
    renderWithProviders(
      <RoleList roles={[role]} onEdit={onEdit} onDelete={onDelete} onCreateClick={onCreateClick} />,
    )

    expect(screen.getByText('Sistema')).toBeInTheDocument()
  })

  it('nao exibe badge "Sistema" para cargo comum', () => {
    const role = makeRole({ isSystem: false })
    renderWithProviders(
      <RoleList roles={[role]} onEdit={onEdit} onDelete={onDelete} onCreateClick={onCreateClick} />,
    )

    expect(screen.queryByText('Sistema')).not.toBeInTheDocument()
  })

  it('botao Excluir esta desabilitado para cargo de sistema', () => {
    const role = makeRole({ isSystem: true })
    renderWithProviders(
      <RoleList roles={[role]} onEdit={onEdit} onDelete={onDelete} onCreateClick={onCreateClick} />,
    )

    expect(screen.getByRole('button', { name: 'Excluir' })).toBeDisabled()
  })

  it('botao Excluir esta habilitado para cargo comum', () => {
    const role = makeRole({ isSystem: false })
    renderWithProviders(
      <RoleList roles={[role]} onEdit={onEdit} onDelete={onDelete} onCreateClick={onCreateClick} />,
    )

    expect(screen.getByRole('button', { name: 'Excluir' })).toBeEnabled()
  })

  it('chama onEdit ao clicar em Editar', async () => {
    const role = makeRole()
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <RoleList roles={[role]} onEdit={onEdit} onDelete={onDelete} onCreateClick={onCreateClick} />,
    )

    await user.click(screen.getByRole('button', { name: 'Editar' }))

    expect(onEdit).toHaveBeenCalledWith(role)
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('chama onDelete ao clicar em Excluir de cargo comum', async () => {
    const role = makeRole()
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <RoleList roles={[role]} onEdit={onEdit} onDelete={onDelete} onCreateClick={onCreateClick} />,
    )

    await user.click(screen.getByRole('button', { name: 'Excluir' }))

    expect(onDelete).toHaveBeenCalledWith(role)
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('chama onCreateClick ao clicar em Novo Cargo', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <RoleList roles={[]} onEdit={onEdit} onDelete={onDelete} onCreateClick={onCreateClick} />,
    )

    await user.click(screen.getByRole('button', { name: 'Novo Cargo' }))

    expect(onCreateClick).toHaveBeenCalledTimes(1)
  })

  it('renderiza multiplos cargos corretamente', () => {
    const roles = [
      makeRole({ id: 'r1', name: 'Admin' }),
      makeRole({ id: 'r2', name: 'Editor', description: null }),
    ]
    renderWithProviders(
      <RoleList roles={roles} onEdit={onEdit} onDelete={onDelete} onCreateClick={onCreateClick} />,
    )

    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('Editor')).toBeInTheDocument()
  })

  it('exibe "Carregar mais" e chama onLoadMore quando ha proxima pagina', async () => {
    const onLoadMore = vi.fn()
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <RoleList
        roles={[makeRole()]}
        onEdit={onEdit}
        onDelete={onDelete}
        onCreateClick={onCreateClick}
        hasNextPage
        onLoadMore={onLoadMore}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Carregar mais' }))

    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('nao exibe "Carregar mais" quando nao ha proxima pagina', () => {
    renderWithProviders(
      <RoleList
        roles={[makeRole()]}
        onEdit={onEdit}
        onDelete={onDelete}
        onCreateClick={onCreateClick}
        hasNextPage={false}
        onLoadMore={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Carregar mais' })).not.toBeInTheDocument()
  })
})
