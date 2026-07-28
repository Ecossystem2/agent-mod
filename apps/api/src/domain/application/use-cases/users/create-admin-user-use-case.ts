import { Injectable } from '@nestjs/common'

import type { User } from '@/domain/enterprise/entities/user'

import { left, right, type Either } from '@/core/either'
import { UnexpectedError } from '@/core/errors/unexpected-error'
import { CacheRepository } from '@/domain/application/cache/cache-repository'
import { permissionsCacheKey } from '@/domain/application/cache/permissions-cache'
import { AuthProvider } from '@/domain/application/providers/auth-provider'
import { UserRoleAssignmentRepository } from '@/domain/application/repositories/user-role-assignment-repository'
import { EmailAlreadyInUseError } from '@/domain/application/use-cases/errors/email-already-in-use-error'

export interface CreateAdminUserInput {
  name: string
  email: string
  password: string
  roleIds?: string[]
  actorUserId: string
}

export interface CreateAdminUserOutput {
  user: User
}

type CreateAdminUserResult = Either<EmailAlreadyInUseError | UnexpectedError, CreateAdminUserOutput>

@Injectable()
export class CreateAdminUserUseCase {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly assignmentRepo: UserRoleAssignmentRepository,
    private readonly cache: CacheRepository,
  ) {}

  async execute(input: CreateAdminUserInput): Promise<CreateAdminUserResult> {
    // better-auth é externo à nossa transação Prisma — o usuário é criado aqui e os
    // assignments + audit são atômicos no passo seguinte via replaceAll. Se replaceAll
    // falhar, compensamos removendo o usuário recém-criado para não deixar órfão.
    const result = await this.authProvider.signUp(input.name, input.email, input.password)
    if (!result.user) return left(new EmailAlreadyInUseError(input.email))

    const userId = result.user.id.toString()

    try {
      await this.assignmentRepo.replaceAll(userId, input.roleIds ?? [], {
        actorUserId: input.actorUserId,
        action: 'user.create',
        resourceType: 'user',
        resourceId: userId,
        metadata: { email: input.email },
      })
      await this.cache.delete(permissionsCacheKey(userId))
    } catch (err) {
      console.error('[CreateAdminUserUseCase] unexpected error:', err)
      try {
        await this.authProvider.deleteUser(userId)
      } catch (compensationErr) {
        console.error(
          '[CreateAdminUserUseCase] compensation failed, orphan user remains:',
          userId,
          compensationErr,
        )
      }
      return left(new UnexpectedError(err))
    }

    return right({ user: result.user })
  }
}
