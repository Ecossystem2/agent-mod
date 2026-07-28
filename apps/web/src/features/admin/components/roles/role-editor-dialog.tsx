import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import type { Role } from '@/features/admin/types'
import type { ReactElement } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ADMIN_PERMISSIONS, PERMISSION_CATEGORIES } from '@/features/admin/types'

/* c8 ignore start */
const DEFAULT_CATEGORY_LABEL = PERMISSION_CATEGORIES[0]?.label ?? ''
/* c8 ignore stop */

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100),
  description: z.string().max(500).nullable().optional(),
  permissions: z.array(z.string()).default([]),
})

type FormValues = z.infer<typeof schema>

interface RoleEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: Role | null
  onSubmit: (values: FormValues) => void
  isPending: boolean
}

export function RoleEditorDialog({
  open,
  onOpenChange,
  role,
  onSubmit,
  isPending,
}: RoleEditorDialogProps): ReactElement {
  const isEdit = role !== null
  const isSystem = role?.isSystem ?? false

  const [selectedCategory, setSelectedCategory] = useState<string>(DEFAULT_CATEGORY_LABEL)
  const [search, setSearch] = useState('')

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: role?.name ?? '',
      description: role?.description ?? '',
      permissions: role?.permissions ?? [],
    },
  })

  const selectedPermissions = watch('permissions')
  /* c8 ignore start */
  // schema .default([]) garante string[] em runtime; ?? [] é rede de tipo (ramo morto)
  const safePermissions: string[] = selectedPermissions ?? []
  /* c8 ignore stop */

  function handleOpenChange(next: boolean) {
    /* c8 ignore start */
    // next=true path unreachable: controlled Radix Dialog has no DialogTrigger
    if (next) { onOpenChange(next); return }
    /* c8 ignore stop */
    reset({
      name: role?.name ?? '',
      description: role?.description ?? '',
      permissions: role?.permissions ?? [],
    })
    setSearch('')
    setSelectedCategory(DEFAULT_CATEGORY_LABEL)
    onOpenChange(next)
  }

  function togglePermission(perm: string) {
    if (safePermissions.includes(perm)) {
      setValue(
        'permissions',
        safePermissions.filter((p) => p !== perm),
        { shouldValidate: true },
      )
    } else {
      setValue('permissions', [...safePermissions, perm], { shouldValidate: true })
    }
  }

  function markAllInCategory(categoryLabel: string) {
    const category = PERMISSION_CATEGORIES.find((c) => c.label === categoryLabel)
    /* c8 ignore start */
    if (!category) return
    /* c8 ignore stop */
    const toAdd = category.permissions.filter((p) => !safePermissions.includes(p))
    setValue('permissions', [...safePermissions, ...toAdd], { shouldValidate: true })
  }

  function clearCategory(categoryLabel: string) {
    const category = PERMISSION_CATEGORIES.find((c) => c.label === categoryLabel)
    /* c8 ignore start */
    if (!category) return
    /* c8 ignore stop */
    const categoryPerms = new Set(category.permissions)
    setValue(
      'permissions',
      safePermissions.filter((p) => !categoryPerms.has(p as (typeof ADMIN_PERMISSIONS)[number])),
      { shouldValidate: true },
    )
  }

  const filteredPermissions = (() => {
    const category = PERMISSION_CATEGORIES.find((c) => c.label === selectedCategory)
    /* c8 ignore start */
    if (!category) return []
    /* c8 ignore stop */
    if (!search) return category.permissions
    const q = search.toLowerCase()
    return category.permissions.filter((p) => p.toLowerCase().includes(q))
  })()

  const categoryCountMap = PERMISSION_CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat.label] = cat.permissions.filter((p) => safePermissions.includes(p)).length
    return acc
  }, {})

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>{isEdit ? 'Editar Cargo' : 'Novo Cargo'}</DialogTitle>
          {isSystem && (
            <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              Cargo de Sistema — somente leitura
            </span>
          )}
        </DialogHeader>

        <form
          onSubmit={(e) => { void handleSubmit(onSubmit)(e) }}
          className="flex flex-1 flex-col gap-0 overflow-hidden"
        >
          <div className="flex flex-col gap-4 overflow-y-auto px-6 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="role-name">Nome</Label>
              <Input
                id="role-name"
                placeholder="ex: Administrador"
                disabled={isSystem}
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role-description">Descrição</Label>
              <Input
                id="role-description"
                placeholder="Descrição opcional"
                disabled={isSystem}
                {...register('description')}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Permissões</Label>
                <span className="text-xs text-muted-foreground">
                  {safePermissions.length} de {ADMIN_PERMISSIONS.length} permissões
                </span>
              </div>

              <Input
                placeholder="Filtrar permissões..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={isSystem}
                className="h-9"
              />

              <div className="flex flex-col gap-3 md:flex-row md:gap-0">
                {/* Categorias — sidebar em md+, select em mobile */}
                <div className="md:hidden">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERMISSION_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.label} value={cat.label}>
                          {cat.label} ({categoryCountMap[cat.label]}/{cat.permissions.length})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="hidden w-44 shrink-0 flex-col border-r md:flex">
                  {PERMISSION_CATEGORIES.map((cat) => (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => setSelectedCategory(cat.label)}
                      className={`flex items-center justify-between px-3 py-2.5 text-left text-sm transition-colors ${
                        selectedCategory === cat.label
                          ? 'bg-accent font-medium'
                          : 'hover:bg-muted/60'
                      }`}
                    >
                      <span>{cat.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {categoryCountMap[cat.label]}/{cat.permissions.length}
                      </span>
                    </button>
                  ))}
                </div>

                <Controller
                  control={control}
                  name="permissions"
                  render={() => (
                    <div className="flex flex-1 flex-col md:pl-4">
                      <div className="mb-2 flex gap-2">
                        <button
                          type="button"
                          disabled={isSystem}
                          onClick={() => markAllInCategory(selectedCategory)}
                          className="text-xs text-primary underline-offset-2 hover:underline disabled:pointer-events-none disabled:opacity-50"
                        >
                          Marcar todas
                        </button>
                        <span className="text-xs text-muted-foreground">/</span>
                        <button
                          type="button"
                          disabled={isSystem}
                          onClick={() => clearCategory(selectedCategory)}
                          className="text-xs text-primary underline-offset-2 hover:underline disabled:pointer-events-none disabled:opacity-50"
                        >
                          Limpar
                        </button>
                      </div>

                      {filteredPermissions.length === 0 && (
                        <p className="text-sm text-muted-foreground">Nenhuma permissão encontrada.</p>
                      )}

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {filteredPermissions.map((perm) => {
                          const checked = safePermissions.includes(perm)
                          return (
                            <label
                              key={perm}
                              className="flex cursor-pointer items-center gap-2 rounded-md border p-2 transition-colors hover:bg-muted/40"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={isSystem}
                                onChange={() => togglePermission(perm)}
                                className="h-4 w-4 cursor-pointer accent-primary"
                              />
                              <span className="font-mono text-xs">{perm}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full sm:w-auto"
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            {!isSystem && (
              <Button
                type="submit"
                disabled={isPending}
                className="h-11 w-full sm:w-auto"
              >
                {isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar cargo'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
