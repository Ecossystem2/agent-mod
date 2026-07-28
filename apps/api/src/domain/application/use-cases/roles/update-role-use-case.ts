import { Injectable } from '@nestjs/common'

import type { Permission } from '@/core/auth/permissions'
import type { Role } from '@/domain/enterprise/entities/role'

import { left, right, type Either } from '@/core/either'
import { UnexpectedError } from '@/core/errors/unexpected-error'
import { CacheRepository } from '@/domain/application/cache/cache-repository'
import { PERMISSIONS_CACHE_PATTERN } from '@/domain/application/cache/permissions-cache'
import { RoleRepository } from '@/domain/application/repositories/role-repository'
import { RoleIsSystemError } from '@/domain/application/use-cases/errors/role-is-system-error'
import { RoleNameTakenError } from '@/domain/application/use-cases/errors/role-name-taken-error'
import { RoleNotFoundError } from '@/domain/application/use-cases/errors/role-not-found-error'

export interface UpdateRoleInput {
  roleId: string
  name?: string
  description?: string | null
  permissions?: Permission[]
  actorUserId: string
}

export interface UpdateRoleOutput {
  role: Role
}

type UpdateRoleResult = Either<RoleNotFoundError | RoleIsSystemError | RoleNameTakenError | UnexpectedError, UpdateRoleOutput>

@Injectable()
export class UpdateRoleUseCase {
  constructor(
    private readonly roles: RoleRepository,
    private readonly cache: CacheRepository,
  ) {}

  async execute(input: UpdateRoleInput): Promise<UpdateRoleResult> {
    const role = await this.roles.findById(input.roleId)
    if (!role) return left(new RoleNotFoundError())
    if (role.isSystem) return left(new RoleIsSystemError())

    if (input.name !== undefined && input.name !== role.name) {
      const existing = await this.roles.findByName(input.name)
      if (existing) return left(new RoleNameTakenError(input.name))
      role.updateName(input.name)
    }

    if (input.description !== undefined) {
      role.updateDescription(input.description)
    }

    if (input.permissions !== undefined) {
      role.setPermissions(input.permissions)
    }

    try {
      await this.roles.save(role, {
        actorUserId: input.actorUserId,
        action: 'role.update',
        resourceType: 'role',
        resourceId: role.id.toString(),
        metadata: { name: role.name },
      })
      await this.cache.invalidateByPattern(PERMISSIONS_CACHE_PATTERN)
    } catch (err) {
      console.error('[UpdateRoleUseCase] unexpected error:', err)
      return left(new UnexpectedError(err))
    }

    return right({ role })
  }
}
