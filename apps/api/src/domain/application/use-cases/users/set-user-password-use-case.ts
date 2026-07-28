import { Injectable } from '@nestjs/common'

import { left, right, type Either } from '@/core/either'
import { UnexpectedError } from '@/core/errors/unexpected-error'
import { SetPasswordPort } from '@/domain/application/ports/set-password-port'
import { UserRepository } from '@/domain/application/repositories/user-repository'
import { UserNotFoundError } from '@/domain/application/use-cases/errors/user-not-found-error'

export interface SetUserPasswordInput {
  targetUserId: string
  newPassword: string
  actorUserId: string
}

type SetUserPasswordResult = Either<UserNotFoundError | UnexpectedError, null>

@Injectable()
export class SetUserPasswordUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly setPasswordPort: SetPasswordPort,
  ) {}

  async execute(input: SetUserPasswordInput): Promise<SetUserPasswordResult> {
    const user = await this.userRepo.findById(input.targetUserId)
    if (!user) return left(new UserNotFoundError())

    try {
      await this.setPasswordPort.setPassword(input.targetUserId, input.newPassword, {
        actorUserId: input.actorUserId,
        action: 'user.set_password',
        resourceType: 'user',
        resourceId: input.targetUserId,
      })
    } catch (err) {
      console.error('[SetUserPasswordUseCase] unexpected error:', err)
      return left(new UnexpectedError(err))
    }

    return right(null)
  }
}
