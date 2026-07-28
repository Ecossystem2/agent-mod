import { Injectable } from '@nestjs/common'

import { ADMIN_PERMISSIONS } from '@/core/auth/permissions'
import { left, right, type Either } from '@/core/either'
import { UnexpectedError } from '@/core/errors/unexpected-error'
import { UserRepository } from '@/domain/application/repositories/user-repository'
import { UserRoleAssignmentRepository } from '@/domain/application/repositories/user-role-assignment-repository'
import { CannotDeleteSelfError } from '@/domain/application/use-cases/errors/cannot-delete-self-error'
import { LastAdminError } from '@/domain/application/use-cases/errors/last-admin-error'
import { ProtectedUserError } from '@/domain/application/use-cases/errors/protected-user-error'
import { UserNotFoundError } from '@/domain/application/use-cases/errors/user-not-found-error'

export interface DeactivateUserInput {
  targetUserId: string
  actorUserId: string
}

type DeactivateUserResult = Either<
  UserNotFoundError | CannotDeleteSelfError | ProtectedUserError | LastAdminError | UnexpectedError,
  null
>

@Injectable()
export class DeactivateUserUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly assignmentRepo: UserRoleAssignmentRepository,
  ) {}

  async execute(input: DeactivateUserInput): Promise<DeactivateUserResult> {
    const user = await this.userRepo.findById(input.targetUserId)
    if (!user) return left(new UserNotFoundError())

    if (input.targetUserId === input.actorUserId) return left(new CannotDeleteSelfError())

    if (user.isProtected) return left(new ProtectedUserError(input.targetUserId))

    const targetPerms = await this.assignmentRepo.findPermissionsByUserId(input.targetUserId)
    const isTargetAdmin = targetPerms.some((p) => (ADMIN_PERMISSIONS as readonly string[]).includes(p))
    if (isTargetAdmin) {
      const adminCount = await this.assignmentRepo.countUsersWithAnyPermission([...ADMIN_PERMISSIONS])
      if (adminCount <= 1) return left(new LastAdminError())
    }

    user.deactivate()

    try {
      await this.userRepo.saveWithAudit(user, {
        actorUserId: input.actorUserId,
        action: 'user.deactivate',
        resourceType: 'user',
        resourceId: input.targetUserId,
      })
    } catch (err) {
      console.error('[DeactivateUserUseCase] unexpected error:', err)
      return left(new UnexpectedError(err))
    }

    return right(null)
  }
}
