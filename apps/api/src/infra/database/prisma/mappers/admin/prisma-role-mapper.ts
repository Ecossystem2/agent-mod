import type { Permission } from '@/core/auth/permissions'
import type { Role as PrismaRole, RolePermission as PrismaRolePermission } from '@prisma/client'

import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { Role } from '@/domain/enterprise/entities/role'

type PrismaRoleWithPermissions = PrismaRole & {
  permissions: PrismaRolePermission[]
}

export class PrismaRoleMapper {
  static toDomain(raw: PrismaRoleWithPermissions): Role {
    return Role.create(
      {
        name: raw.name,
        description: raw.description,
        isSystem: raw.isSystem,
        permissions: raw.permissions.map((p) => p.permission as Permission),
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrismaCreate(
    role: Role,
  ): Omit<PrismaRole, 'createdAt' | 'updatedAt'> & { permissions: { create: { permission: string }[] } } {
    return {
      id: role.id.toString(),
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: {
        create: [...role.permissions].map((p) => ({ permission: p })),
      },
    }
  }
}
