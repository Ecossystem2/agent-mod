import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AdminUser, Role } from '@/features/admin/types'
import type * as ReactHookForm from 'react-hook-form'

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

// Controla o comportamento do mock de RHF entre testes
let forceWatchRoleIdsUndefined = false
let forceRoleIdsError = false

vi.mock('react-hook-form', async (importOriginal) => {
  const original = await importOriginal<typeof ReactHookForm>()
  return {
    ...original,
    useForm: (options?: Parameters<typeof original.useForm>[0]) => {
      const form = original.useForm(options)
      const originalWatch = form.watch.bind(form)
      const patchedWatch = (...args: Parameters<typeof form.watch>) => {
        if (forceWatchRoleIdsUndefined && (args[0] as unknown) === 'roleIds') {
          return undefined as unknown as string[]
        }
        return originalWatch(...(args))
      }

      // Detecta se este form é o editForm (tem newPassword em defaultValues)
      const isEditForm =
        options?.defaultValues &&
        'newPassword' in (options.defaultValues as Record<string, unknown>)

      if (forceRoleIdsError && isEditForm) {
        // Retorna um formState com roleIds error pré-definido
        const mockedFormState = {
          ...form.formState,
          errors: {
            ...form.formState.errors,
            roleIds: { message: 'Erro nos cargos', type: 'custom' },
          },
        }
        return { ...form, watch: patchedWatch, formState: mockedFormState }
      }

      return { ...form, watch: patchedWatch }
    },
  }
})

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

describe('UserFormDialog — ramos defensivos (RHF mock)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    forceWatchRoleIdsUndefined = false
    forceRoleIdsError = false
  })

  it('cobre o ramo ?? [] de watchCreate quando watch retorna undefined no modo criação', async () => {
    forceWatchRoleIdsUndefined = true
    const { UserFormDialog } = await import('./user-form-dialog')

    renderWithProviders(
      <UserFormDialog
        open
        onOpenChange={vi.fn()}
        user={null}
        roles={roles}
        onSubmit={vi.fn()}
        isPending={false}
      />,
    )

    // O diálogo deve renderizar sem crash mesmo com watch retornando undefined
    expect(screen.getByRole('heading', { name: 'Novo usuário' })).toBeInTheDocument()
    // A lista de checkboxes deve renderizar (usando [] como fallback)
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('cobre o ramo ?? [] de watch quando watch retorna undefined no modo edição', async () => {
    forceWatchRoleIdsUndefined = true
    const { UserFormDialog } = await import('./user-form-dialog')

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

    // O diálogo deve renderizar sem crash com watch retornando undefined
    expect(screen.getByRole('heading', { name: 'Editar usuário' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('cobre o ramo errors.roleIds no modo edição quando formState tem erro de cargos', async () => {
    forceRoleIdsError = true
    const { UserFormDialog } = await import('./user-form-dialog')

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

    // O componente deve renderizar com o erro de roleIds visível
    await waitFor(() => {
      expect(screen.getByText('Erro nos cargos')).toBeInTheDocument()
    })
  })

  it('cobre linha 100 (roleIds ?? []) passando user com roleIds undefined', async () => {
    const { UserFormDialog } = await import('./user-form-dialog')
    // user com roleIds undefined → no useEffect: user.roleIds ?? [] = undefined ?? [] = []
    const userWithUndefinedRoleIds = {
      ...existingUser,
      roleIds: undefined as unknown as string[],
    }

    renderWithProviders(
      <UserFormDialog
        open
        onOpenChange={vi.fn()}
        user={userWithUndefinedRoleIds}
        roles={roles}
        onSubmit={vi.fn()}
        isPending={false}
      />,
    )

    // Renderiza o formulário de edição sem crash
    expect(screen.getByRole('heading', { name: 'Editar usuário' })).toBeInTheDocument()
    // useEffect executou resetEdit com roleIds: undefined ?? [] = []
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })
})
