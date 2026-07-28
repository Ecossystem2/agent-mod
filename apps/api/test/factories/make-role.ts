import type { Permission } from '@/core/auth/permissions'

import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { Role } from '@/domain/enterprise/entities/role'

export interface MakeRoleOverrides {
  id?: string
  name?: string
  description?: string | null
  isSystem?: boolean
  permissions?: Permission[]
  createdAt?: Date
  updatedAt?: Date
}

export function makeRole(overrides: MakeRoleOverrides = {}): Role {
  return Role.create(
    {
      name: overrides.name ?? 'Test Role',
      description: overrides.description ?? null,
      isSystem: overrides.isSystem ?? false,
      permissions: overrides.permissions ?? [],
      createdAt: overrides.createdAt ?? new Date('2024-01-01'),
      updatedAt: overrides.updatedAt ?? new Date('2024-01-01'),
    },
    new UniqueEntityID(overrides.id ?? 'role-1'),
  )
}
