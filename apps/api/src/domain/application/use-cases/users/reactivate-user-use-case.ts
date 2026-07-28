import { Injectable } from '@nestjs/common'

import { left, right, type Either } from '@/core/either'
import { UnexpectedError } from '@/core/errors/unexpected-error'
import { UserRepository } from '@/domain/application/repositories/user-repository'
import { UserNotFoundError } from '@/domain/application/use-cases/errors/user-not-found-error'

export interface ReactivateUserInput {
  targetUserId: string
  actorUserId: string
}

type ReactivateUserResult = Either<UserNotFoundError | UnexpectedError, null>

@Injectable()
export class ReactivateUserUseCase {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(input: ReactivateUserInput): Promise<ReactivateUserResult> {
    const user = await this.userRepo.findById(input.targetUserId)
    if (!user) return left(new UserNotFoundError())

    const changed = user.reactivate()
    if (!changed) return right(null)

    try {
      await this.userRepo.saveWithAudit(user, {
        actorUserId: input.actorUserId,
        action: 'user.reactivate',
        resourceType: 'user',
        resourceId: input.targetUserId,
      })
    } catch (err) {
      console.error('[ReactivateUserUseCase] unexpected error:', err)
      return left(new UnexpectedError(err))
    }

    return right(null)
  }
}
