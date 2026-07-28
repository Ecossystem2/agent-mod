import { Injectable } from '@nestjs/common'

import { left, right, type Either } from '@/core/either'
import { UnexpectedError } from '@/core/errors/unexpected-error'
import { CacheRepository } from '@/domain/application/cache/cache-repository'
import { PERMISSIONS_CACHE_PATTERN } from '@/domain/application/cache/permissions-cache'
import { RoleRepository } from '@/domain/application/repositories/role-repository'
import { RoleInUseError } from '@/domain/application/use-cases/errors/role-in-use-error'
import { RoleIsSystemError } from '@/domain/application/use-cases/errors/role-is-system-error'
import { RoleNotFoundError } from '@/domain/application/use-cases/errors/role-not-found-error'

export interface DeleteRoleInput {
  roleId: string
  actorUserId: string
}

type DeleteRoleResult = Either<RoleNotFoundError | RoleIsSystemError | RoleInUseError | UnexpectedError, null>

@Injectable()
export class DeleteRoleUseCase {
  constructor(
    private readonly roles: RoleRepository,
    private readonly cache: CacheRepository,
  ) {}

  async execute(input: DeleteRoleInput): Promise<DeleteRoleResult> {
    const role = await this.roles.findById(input.roleId)
    if (!role) return left(new RoleNotFoundError())
    if (role.isSystem) return left(new RoleIsSystemError())

    const count = await this.roles.countAssignedUsers(input.roleId)
    if (count > 0) return left(new RoleInUseError(count))

    try {
      await this.roles.delete(input.roleId, {
        actorUserId: input.actorUserId,
        action: 'role.delete',
        resourceType: 'role',
        resourceId: input.roleId,
      })
      await this.cache.invalidateByPattern(PERMISSIONS_CACHE_PATTERN)
    } catch (err) {
      console.error('[DeleteRoleUseCase] unexpected error:', err)
      return left(new UnexpectedError(err))
    }

    return right(null)
  }
}
