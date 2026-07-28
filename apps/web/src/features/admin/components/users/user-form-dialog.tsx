import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import type { AdminUser, Role } from '@/features/admin/types'
import type { ReactElement } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { useSetUserPassword, useUpdateUser } from '@/features/admin/api/users-api'
import { UserFormFields } from '@/features/admin/components/users/user-form-fields'

const createSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(200),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(12, 'Mínimo 12 caracteres').max(128, 'Máximo 128 caracteres'),
  roleIds: z.array(z.string()).default([]),
})

const editSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(200),
  email: z.string().email('E-mail inválido'),
  roleIds: z.array(z.string()).default([]),
  newPassword: z
    .string()
    .max(128)
    .refine((v) => v === '' || v.length >= 8, { message: 'Mínimo 8 caracteres' })
    .optional()
    .or(z.literal('')),
})

type CreateValues = z.infer<typeof createSchema>
type EditValues = z.infer<typeof editSchema>

interface UserFormDialogCreateProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: null
  roles: Role[]
  onSubmit: (values: CreateValues) => void
  isPending: boolean
}

interface UserFormDialogEditProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: AdminUser
  roles: Role[]
  onSubmit: (values: EditValues) => void
  isPending: boolean
}

type UserFormDialogProps = UserFormDialogCreateProps | UserFormDialogEditProps

function toggleRole(roleId: string, currentIds: string[], setValue: (ids: string[]) => void) {
  if (currentIds.includes(roleId)) {
    setValue(currentIds.filter((id) => id !== roleId))
  } else {
    setValue([...currentIds, roleId])
  }
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  roles,
  onSubmit,
  isPending,
}: UserFormDialogProps): ReactElement {
  const isEdit = user !== null
  const updateUser = useUpdateUser()
  const setPassword = useSetUserPassword()

  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', email: '', password: '', roleIds: [] },
  })

  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      roleIds: user?.roleIds ?? [],
      newPassword: '',
    },
  })

  const { reset: resetCreate } = createForm
  const { reset: resetEdit } = editForm

  useEffect(() => {
    if (open) {
      if (isEdit) {
        resetEdit({
          name: user.name,
          email: user.email,
          roleIds: user.roleIds ?? [],
          newPassword: '',
        })
      } else {
        resetCreate({ name: '', email: '', password: '', roleIds: [] })
      }
    }
  }, [open, isEdit, user, resetCreate, resetEdit])

  function handleEditSubmit(values: EditValues) {
    /* c8 ignore start */
    if (!user) return
    /* c8 ignore stop */

    updateUser.mutate(
      { id: user.id, name: values.name, email: values.email, roleIds: values.roleIds },
      {
        onSuccess: () => {
          const newPw = values.newPassword
          if (newPw && newPw.length > 0) {
            setPassword.mutate(
              { userId: user.id, newPassword: newPw },
              {
                onSuccess: () => {
                  onOpenChange(false)
                  toast.success('Usuário atualizado com sucesso.')
                },
                onError: () => {
                  toast.warning('Dados salvos, mas erro ao atualizar a senha. Tente novamente.')
                },
              },
            )
          } else {
            onOpenChange(false)
            toast.success('Usuário atualizado com sucesso.')
          }
        },
      },
    )
  }

  if (isEdit) {
    const {
      handleSubmit,
      register,
      watch,
      setValue,
      formState: { errors },
    } = editForm
    const selectedRoleIds = watch('roleIds') ?? []
    const isSubmitting = updateUser.isPending || setPassword.isPending || isPending

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              void handleSubmit(handleEditSubmit)(e)
            }}
            className="space-y-4"
          >
            <UserFormFields
              idPrefix="edit-user"
              roles={roles}
              selectedRoleIds={selectedRoleIds}
              onToggleRole={(roleId) =>
                toggleRole(roleId, selectedRoleIds, (ids) =>
                  setValue('roleIds', ids, { shouldValidate: true }),
                )
              }
              nameField={register('name')}
              emailField={register('email')}
              nameError={errors.name?.message}
              emailError={errors.email?.message}
              rolesError={errors.roleIds?.message}
            />

            <div className="space-y-1.5">
              <Label htmlFor="edit-user-password">Nova senha</Label>
              <PasswordInput
                id="edit-user-password"
                placeholder="Deixe em branco para não alterar"
                {...register('newPassword')}
              />
              {errors.newPassword && (
                <p className="text-xs text-destructive">{errors.newPassword.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full sm:w-auto"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="h-11 w-full sm:w-auto">
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  const {
    handleSubmit,
    register,
    watch: watchCreate,
    setValue: setValueCreate,
    formState: { errors },
  } = createForm
  const selectedRoleIds = watchCreate('roleIds') ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e)
          }}
          className="space-y-4"
        >
          <UserFormFields
            idPrefix="user"
            roles={roles}
            selectedRoleIds={selectedRoleIds}
            onToggleRole={(roleId) =>
              toggleRole(roleId, selectedRoleIds, (ids) =>
                setValueCreate('roleIds', ids, { shouldValidate: true }),
              )
            }
            nameField={register('name')}
            emailField={register('email')}
            nameError={errors.name?.message}
            emailError={errors.email?.message}
            rolesError={errors.roleIds?.message}
          />

          <div className="space-y-1.5">
            <Label htmlFor="user-password">Senha</Label>
            <PasswordInput
              id="user-password"
              placeholder="Mínimo 12 caracteres"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="h-11 w-full sm:w-auto">
              {isPending ? 'Criando...' : 'Criar usuário'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
