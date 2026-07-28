import { Injectable } from '@nestjs/common'

import type { User } from '@/domain/enterprise/entities/user'

import { ADMIN_PERMISSIONS } from '@/core/auth/permissions'
import { left, right, type Either } from '@/core/either'
import { UnexpectedError } from '@/core/errors/unexpected-error'
import { CacheRepository } from '@/domain/application/cache/cache-repository'
import { permissionsCacheKey } from '@/domain/application/cache/permissions-cache'
import { UserRepository } from '@/domain/application/repositories/user-repository'
import { UserRoleAssignmentRepository } from '@/domain/application/repositories/user-role-assignment-repository'
import { EmailAlreadyInUseError } from '@/domain/application/use-cases/errors/email-already-in-use-error'
import { LastAdminError } from '@/domain/application/use-cases/errors/last-admin-error'
import { UserNotFoundError } from '@/domain/application/use-cases/errors/user-not-found-error'

export interface UpdateUserInput {
  userId: string
  name?: string
  email?: string
  roleIds?: string[]
  actorUserId: string
}

export interface UpdateUserOutput {
  user: User
}

type UpdateUserResult = Either<
  UserNotFoundError | LastAdminError | EmailAlreadyInUseError | UnexpectedError,
  UpdateUserOutput
>

@Injectable()
export class UpdateUserUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly assignmentRepo: UserRoleAssignmentRepository,
    private readonly cache: CacheRepository,
  ) {}

  async execute(input: UpdateUserInput): Promise<UpdateUserResult> {
    const user = await this.userRepo.findById(input.userId)
    if (!user) return left(new UserNotFoundError())

    if (input.email !== undefined) {
      const existing = await this.userRepo.findByEmail(input.email)
      if (existing && existing.id.toString() !== input.userId) {
        return left(new EmailAlreadyInUseError(input.email))
      }
      user.updateEmail(input.email)
    }

    if (input.name !== undefined) {
      user.updateName(input.name)
    }

    if (input.roleIds !== undefined) {
      const currentPerms = await this.assignmentRepo.findPermissionsByUserId(input.userId)
      const isCurrentAdmin = currentPerms.some((p) => (ADMIN_PERMISSIONS as readonly string[]).includes(p))
      if (isCurrentAdmin) {
        const adminCount = await this.assignmentRepo.countUsersWithAnyPermission([...ADMIN_PERMISSIONS])
        if (adminCount <= 1) return left(new LastAdminError())
      }
    }

    try {
      if (input.roleIds !== undefined) {
        await this.userRepo.saveWithRoles(user, input.roleIds, {
          actorUserId: input.actorUserId,
          action: 'user.update',
          resourceType: 'user',
          resourceId: input.userId,
        })
        user.assignRoles(input.roleIds)
        await this.cache.delete(permissionsCacheKey(input.userId))
      } else {
        await this.userRepo.saveWithAudit(user, {
          actorUserId: input.actorUserId,
          action: 'user.update',
          resourceType: 'user',
          resourceId: input.userId,
        })
      }
    } catch (err) {
      console.error('[UpdateUserUseCase] unexpected error:', err)
      return left(new UnexpectedError(err))
    }

    return right({ user })
  }
}
