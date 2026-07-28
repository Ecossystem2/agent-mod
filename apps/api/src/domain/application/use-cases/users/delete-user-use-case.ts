import { Injectable } from '@nestjs/common'

import { ADMIN_PERMISSIONS } from '@/core/auth/permissions'
import { left, right, type Either } from '@/core/either'
import { UnexpectedError } from '@/core/errors/unexpected-error'
import { CacheRepository } from '@/domain/application/cache/cache-repository'
import { permissionsCacheKey } from '@/domain/application/cache/permissions-cache'
import { UserRepository } from '@/domain/application/repositories/user-repository'
import { UserRoleAssignmentRepository } from '@/domain/application/repositories/user-role-assignment-repository'
import { CannotDeleteSelfError } from '@/domain/application/use-cases/errors/cannot-delete-self-error'
import { LastAdminError } from '@/domain/application/use-cases/errors/last-admin-error'
import { ProtectedUserError } from '@/domain/application/use-cases/errors/protected-user-error'
import { UserNotFoundError } from '@/domain/application/use-cases/errors/user-not-found-error'

export interface DeleteUserInput {
  userId: string
  actorUserId: string
}

type DeleteUserResult = Either<
  UserNotFoundError | CannotDeleteSelfError | ProtectedUserError | LastAdminError | UnexpectedError,
  null
>

@Injectable()
export class DeleteUserUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly assignmentRepo: UserRoleAssignmentRepository,
    private readonly cache: CacheRepository,
  ) {}

  async execute(input: DeleteUserInput): Promise<DeleteUserResult> {
    const user = await this.userRepo.findById(input.userId)
    if (!user) return left(new UserNotFoundError())

    if (input.userId === input.actorUserId) return left(new CannotDeleteSelfError())

    if (user.isProtected) return left(new ProtectedUserError(input.userId))

    const targetPerms = await this.assignmentRepo.findPermissionsByUserId(input.userId)
    const isTargetAdmin = targetPerms.some((p) => (ADMIN_PERMISSIONS as readonly string[]).includes(p))
    if (isTargetAdmin) {
      const adminCount = await this.assignmentRepo.countUsersWithAnyPermission([...ADMIN_PERMISSIONS])
      if (adminCount <= 1) return left(new LastAdminError())
    }

    try {
      await this.userRepo.deleteById(input.userId, {
        actorUserId: input.actorUserId,
        action: 'user.delete',
        resourceType: 'user',
        resourceId: input.userId,
      })
      await this.cache.delete(permissionsCacheKey(input.userId))
    } catch (err) {
      console.error('[DeleteUserUseCase] unexpected error:', err)
      return left(new UnexpectedError(err))
    }

    return right(null)
  }
}
