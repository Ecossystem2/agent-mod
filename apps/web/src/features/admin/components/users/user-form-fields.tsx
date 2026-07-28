import type { Role } from '@/features/admin/types'
import type { ReactElement } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface UserFormFieldsProps {
  idPrefix: string
  roles: Role[]
  selectedRoleIds: string[]
  onToggleRole: (roleId: string) => void
  nameField: UseFormRegisterReturn
  emailField: UseFormRegisterReturn
  nameError?: string
  emailError?: string
  rolesError?: string
}

export function UserFormFields({
  idPrefix,
  roles,
  selectedRoleIds,
  onToggleRole,
  nameField,
  emailField,
  nameError,
  emailError,
  rolesError,
}: UserFormFieldsProps): ReactElement {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-name`}>Nome</Label>
        <Input id={`${idPrefix}-name`} placeholder="Nome completo" {...nameField} />
        {nameError && <p className="text-xs text-destructive">{nameError}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-email`}>E-mail</Label>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          placeholder="email@exemplo.com"
          {...emailField}
        />
        {emailError && <p className="text-xs text-destructive">{emailError}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Cargos</Label>
        {roles.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum cargo disponível.</p>
        )}
        <div className="space-y-2">
          {roles.map((role) => (
            <label
              key={role.id}
              className="flex cursor-pointer items-center gap-2 rounded-md border p-2 hover:bg-muted/40"
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={selectedRoleIds.includes(role.id)}
                onChange={() => onToggleRole(role.id)}
              />
              <span className="text-sm">{role.name}</span>
            </label>
          ))}
        </div>
        {rolesError && <p className="text-xs text-destructive">{rolesError}</p>}
      </div>
    </>
  )
}
