import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RoleEditorDialog } from './role-editor-dialog'

import type { Role } from '@/features/admin/types'

import { renderWithProviders } from '@/test/render-with-providers'


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

describe('RoleEditorDialog — modo criacao', () => {
  const onOpenChange = vi.fn()
  const onSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exibe titulo "Novo Cargo" no modo criacao', () => {
    renderWithProviders(
      <RoleEditorDialog
        open
        onOpenChange={onOpenChange}
        role={null}
        onSubmit={onSubmit}
        isPending={false}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Novo Cargo' })).toBeInTheDocument()
  })

  it('exibe botao "Criar cargo" no modo criacao', () => {
    renderWithProviders(
      <RoleEditorDialog
        open
        onOpenChange={onOpenChange}
        role={null}
        onSubmit={onSubmit}
        isPending={false}
      />,
    )

    expect(screen.getByRole('button', { name: 'Criar cargo' })).toBeInTheDocument()
  })

  it('valida campo nome obrigatorio e nao chama onSubmit', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <RoleEditorDialog
        open
        onOpenChange={onOpenChange}
        role={null}
        onSubmit={onSubmit}
        isPending={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Criar cargo' }))

    expect(await screen.findByText('Nome obrigatório')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('exibe erro de validacao na descricao quando ela e muito longa', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <RoleEditorDialog
        open
        onOpenChange={onOpenChange}
        role={null}
        onSubmit={onSubmit}
        isPending={false}
      />,
    )

    const longDescription = 'a'.repeat(501)
    await user.type(screen.getByLabelText('Nome'), 'Nome Valido')
    await user.type(screen.getByLabelText('Descrição'), longDescription)
    await user.click(screen.getByRole('button', { name: 'Criar cargo' }))

    expect(await screen.findByText(/String must contain at most 500 character/)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('chama onSubmit com os valores corretos ao submeter', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <RoleEditorDialog
        open
        onOpenChange={onOpenChange}
        role={null}
        onSubmit={onSubmit}
        isPending={false}
      />,
    )

    await user.type(screen.getByLabelText('Nome'), 'Editor')
    await user.type(screen.getByLabelText('Descrição'), 'Cargo de editor')
    await user.click(screen.getByRole('button', { name: 'Criar cargo' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Editor',
          description: 'Cargo de editor',
          permissions: [],
        }),
        expect.anything(),
      )
    })
  })

  it('exibe "Salvando..." e botao desabilitado quando isPending=true', () => {
    renderWithProviders(
      <RoleEditorDialog
        open
        onOpenChange={onOpenChange}
        role={null}
        onSubmit={onSubmit}
        isPending
      />,
    )

    expect(screen.getByRole('button', { name: 'Salvando...' })).toBeDisabled()
  })

  it('fecha o dialog ao clicar em Cancelar', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <RoleEditorDialog
        open
        onOpenChange={onOpenChange}
        role={null}
        onSubmit={onSubmit}
        isPending={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('permite marcar e desmarcar uma permissao via checkbox', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <RoleEditorDialog
        open
        onOpenChange={onOpenChange}
        role={null}
        onSubmit={onSubmit}
        isPending={false}
      />,
    )

    // Admin category is selected by default — shows admin:users and admin:roles
    const [firstCheckbox] = screen.getAllByRole('checkbox')
    if (!firstCheckbox) throw new Error('checkbox ausente')
    expect(firstCheckbox).not.toBeChecked()

    await user.click(firstCheckbox)
    expect(firstCheckbox).toBeChecked()

    // uncheck
    await user.click(firstCheckbox)
    expect(firstCheckbox).not.toBeChecked()
  })

  it('marca todas as permissoes da categoria ao clicar em "Marcar todas"', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <RoleEditorDialog
        open
        onOpenChange={onOpenChange}
        role={null}
        onSubmit={onSubmit}
        isPending={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Marcar todas' }))

    const checkboxes = screen.getAllByRole('checkbox')
    for (const cb of checkboxes) {
      expect(cb).toBeChecked()
    }
  })

  it('limpa todas as permissoes da categoria ao clicar em "Limpar"', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <RoleEditorDialog
        open
        onOpenChange={onOpenChange}
        role={null}
        onSubmit={onSubmit}
        isPending={false}
      />,
    )

    // First mark all
    await user.click(screen.getByRole('button', { name: 'Marcar todas' }))
    // Then clear
    await user.click(screen.getByRole('button', { name: 'Limpar' }))

    const checkboxes = screen.getAllByRole('checkbox')
    for (const cb of checkboxes) {
      expect(cb).not.toBeChecked()
    }
  })

  it('filtra permissoes ao digitar no campo de busca', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <RoleEditorDialog
        open
        onOpenChange={onOpenChange}
        role={null}
        onSubmit={onSubmit}
        isPending={false}
      />,
    )

    const searchInput = screen.getByPlaceholderText('Filtrar permissões...')
    await user.type(searchInput, 'users')

    // Only admin:users should remain visible
    expect(screen.getByText('admin:users')).toBeInTheDocument()
    expect(screen.queryByText('admin:roles')).not.toBeInTheDocument()
  })

  it('exibe mensagem quando nenhuma permissao corresponde ao filtro', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <RoleEditorDialog
        open
        onOpenChange={onOpenChange}
        role={null}
        onSubmit={onSubmit}
        isPending={false}
      />,
    )

    const searchInput = screen.getByPlaceholderText('Filtrar permissões...')
    await user.type(searchInput, 'naoexiste')

    expect(screen.getByText('Nenhuma permissão encontrada.')).toBeInTheDocument()
  })

  it('muda de categoria ao clicar em um botao de categoria na sidebar', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <RoleEditorDialog
        open
        onOpenChange={onOpenChange}
        role={null}
        onSubmit={onSubmit}
        isPending={false}
      />,
    )

    // Click on "Visualizacao" category button (desktop sidebar buttons)
    const [categoryButton] = screen.getAllByRole('button', { name: /Visualização/ })
    if (!categoryButton) throw new Error('botão de categoria ausente')
    await user.click(categoryButton)

    expect(screen.getByText('view:dashboard')).toBeInTheDocument()
  })

  it('reseta o formulario ao fechar e reabrir', async () => {
    const user = userEvent.setup({ delay: null })
    const { rerender } = renderWithProviders(
      <RoleEditorDialog
        open
        onOpenChange={onOpenChange}
        role={null}
        onSubmit={onSubmit}
        isPending={false}
      />,
    )

    await user.type(screen.getByLabelText('Nome'), 'Teste')

    // Simulate close via handleOpenChange(false) — pressing Cancelar calls onOpenChange(false)
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    // Reopen
    rerender(
      <RoleEditorDialog
        open
        onOpenChange={onOpenChange}
        role={null}
        onSubmit={onSubmit}
        isPending={false}
      />,
    )

    // The form should be reset — field should be empty
    expect(screen.getByLabelText('Nome')).toHaveValue('')
  })
})

describe('RoleEditorDialog — modo edicao', () => {
  const onOpenChange = vi.fn()
  const onSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exibe titulo "Editar Cargo" no modo edicao', () => {
    const role = makeRole()
    renderWithProviders(
      <RoleEditorDialog
        open
        onOpenChange={onOpenChange}
        role={role}
        onSubmit={onSubmit}
        isPending={false}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Editar Cargo' })).toBeInTheDocument()
  })

  it('preenche os campos com os dados do cargo existente', () => {
    const role = makeRole({ name: 'Editor', description: 'Edita conteudo' })
    renderWithProviders(
      <RoleEditorDialog
        open
        onOpenChange={onOpenChange}
        role={role}
        onSubmit={onSubmit}
        isPending={false}
      />,
    )

    expect(screen.getByLabelText('Nome')).toHaveValue('Editor')
    expect(screen.getByLabelText('Descrição')).toHaveValue('Edita conteudo')
  })

  it('exibe botão "Salvar alterações" no modo edição', () => {
    const role = makeRole()
    renderWithProviders(
      <RoleEditorDialog
        open
        onOpenChange={onOpenChange}
        role={role}
        onSubmit={onSubmit}
        isPending={false}
      />,
    )

    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeInTheDocument()
  })

  it('chama onSubmit ao salvar alterações', async () => {
    const role = makeRole({ name: 'Editor', description: null, permissions: [] })
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <RoleEditorDialog
        open
        onOpenChange={onOpenChange}
        role={role}
        onSubmit={onSubmit}
        isPending={false}
      />,
    )

    await user.clear(screen.getByLabelText('Nome'))
    await user.type(screen.getByLabelText('Nome'), 'Editor Atualizado')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Editor Atualizado' }),
        expect.anything(),
      )
    })
  })

  it('as permissoes pre-selecionadas aparecem como checked', () => {
    const role = makeRole({ permissions: ['admin:users'] })
    renderWithProviders(
      <RoleEditorDialog
        open
        onOpenChange={onOpenChange}
        role={role}
        onSubmit={onSubmit}
        isPending={false}
      />,
    )

    // admin:users should be checked (we're in Admin category by default)
    const checkbox = screen.getAllByRole('checkbox').find((cb) => {
      const label = cb.closest('label')
      return label?.textContent?.includes('admin:users')
    })
    expect(checkbox).toBeChecked()
  })
})

describe('RoleEditorDialog — cargo de sistema (isSystem=true)', () => {
  const onOpenChange = vi.fn()
  const onSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exibe badge de somente leitura', () => {
    const role = makeRole({ isSystem: true })
    renderWithProviders(
      <RoleEditorDialog
        open
        onOpenChange={onOpenChange}
        role={role}
        onSubmit={onSubmit}
        isPending={false}
      />,
    )

    expect(screen.getByText('Cargo de Sistema — somente leitura')).toBeInTheDocument()
  })

  it('nao exibe o botao de submit para cargo de sistema', () => {
    const role = makeRole({ isSystem: true })
    renderWithProviders(
      <RoleEditorDialog
        open
        onOpenChange={onOpenChange}
        role={role}
        onSubmit={onSubmit}
        isPending={false}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Salvar alterações' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Criar cargo' })).not.toBeInTheDocument()
  })

  it('campos Nome e Descricao ficam desabilitados', () => {
    const role = makeRole({ isSystem: true })
    renderWithProviders(
      <RoleEditorDialog
        open
        onOpenChange={onOpenChange}
        role={role}
        onSubmit={onSubmit}
        isPending={false}
      />,
    )

    expect(screen.getByLabelText('Nome')).toBeDisabled()
    expect(screen.getByLabelText('Descrição')).toBeDisabled()
  })

  it('checkboxes de permissao ficam desabilitados para cargo de sistema', () => {
    const role = makeRole({ isSystem: true, permissions: ['admin:users'] })
    renderWithProviders(
      <RoleEditorDialog
        open
        onOpenChange={onOpenChange}
        role={role}
        onSubmit={onSubmit}
        isPending={false}
      />,
    )

    const checkboxes = screen.getAllByRole('checkbox')
    for (const cb of checkboxes) {
      expect(cb).toBeDisabled()
    }
  })

  it('togglePermission nao altera permissoes para cargo de sistema', () => {
    const role = makeRole({ isSystem: true, permissions: [] })
    renderWithProviders(
      <RoleEditorDialog
        open
        onOpenChange={onOpenChange}
        role={role}
        onSubmit={onSubmit}
        isPending={false}
      />,
    )

    // Checkboxes are disabled so click should not change them
    const checkboxes = screen.getAllByRole('checkbox')
    if (checkboxes.length > 0) {
      // The disabled prop prevents the toggle
      expect(checkboxes[0]).toBeDisabled()
    }
  })

  it('botoes "Marcar todas" e "Limpar" ficam desabilitados para cargo de sistema', () => {
    const role = makeRole({ isSystem: true })
    renderWithProviders(
      <RoleEditorDialog
        open
        onOpenChange={onOpenChange}
        role={role}
        onSubmit={onSubmit}
        isPending={false}
      />,
    )

    expect(screen.getByRole('button', { name: 'Marcar todas' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Limpar' })).toBeDisabled()
  })
})
