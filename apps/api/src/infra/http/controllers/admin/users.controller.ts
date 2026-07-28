import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { z } from 'zod'


import { CannotDeleteSelfError } from '@/domain/application/use-cases/errors/cannot-delete-self-error'
import { EmailAlreadyInUseError } from '@/domain/application/use-cases/errors/email-already-in-use-error'
import { LastAdminError } from '@/domain/application/use-cases/errors/last-admin-error'
import { ProtectedUserError } from '@/domain/application/use-cases/errors/protected-user-error'
import { UserNotFoundError } from '@/domain/application/use-cases/errors/user-not-found-error'
import { CreateAdminUserUseCase } from '@/domain/application/use-cases/users/create-admin-user-use-case'
import { DeactivateUserUseCase } from '@/domain/application/use-cases/users/deactivate-user-use-case'
import { DeleteUserUseCase } from '@/domain/application/use-cases/users/delete-user-use-case'
import { ListUsersUseCase } from '@/domain/application/use-cases/users/list-users-use-case'
import { ReactivateUserUseCase } from '@/domain/application/use-cases/users/reactivate-user-use-case'
import { SetUserPasswordUseCase } from '@/domain/application/use-cases/users/set-user-password-use-case'
import { UpdateUserUseCase } from '@/domain/application/use-cases/users/update-user-use-case'
import { checkPassword, isStrongPassword } from '@/infra/auth/password-policy'
import { CurrentUser, type SessionUser } from '@/infra/http/decorators/current-user.decorator'
import { RequiresPermission } from '@/infra/http/decorators/requires-permission.decorator'
import { CustomHttpException } from '@/infra/http/exceptions/custom-http.exception'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation.pipe'
import { UserPresenter } from '@/infra/http/presenters/admin/user-presenter'

const listUsersQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const createUserBodySchema = z
  .object({
    name: z.string().min(1).max(200),
    email: z.string().email(),
    password: z
      .string()
      .min(12)
      .max(128)
      .refine(isStrongPassword, (val) => ({ message: checkPassword(val).reason! })),
    roleIds: z.array(z.string()).default([]),
  })
  .strict()

const updateUserBodySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    email: z.string().email().optional(),
    roleIds: z.array(z.string()).optional(),
  })
  .strict()

const setUserPasswordBodySchema = z
  .object({
    newPassword: z
      .string()
      .min(12)
      .max(128)
      .refine(isStrongPassword, (val) => ({ message: checkPassword(val).reason! })),
  })
  .strict()

@Controller('admin/users')
@RequiresPermission('admin:users')
export class UsersController {
  constructor(
    private readonly listUsers: ListUsersUseCase,
    private readonly createAdminUser: CreateAdminUserUseCase,
    private readonly updateUser: UpdateUserUseCase,
    private readonly deleteUser: DeleteUserUseCase,
    private readonly deactivateUser: DeactivateUserUseCase,
    private readonly reactivateUser: ReactivateUserUseCase,
    private readonly setUserPassword: SetUserPasswordUseCase,
  ) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(listUsersQuerySchema)) query: z.infer<typeof listUsersQuerySchema>,
  ) {
    const result = await this.listUsers.execute({ cursor: query.cursor, limit: query.limit })
    if (result.isLeft()) throw CustomHttpException.fromUseCaseError(result.value)
    const { users, nextCursor } = result.value
    return {
      users: users.map(({ user, roleIds }) => UserPresenter.toHTTP(user, roleIds)),
      nextCursor,
    }
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createUserBodySchema)) body: z.infer<typeof createUserBodySchema>,
    @CurrentUser() user: SessionUser,
  ) {
    const result = await this.createAdminUser.execute({
      name: body.name,
      email: body.email,
      password: body.password,
      roleIds: body.roleIds,
      actorUserId: user.id,
    })
    if (result.isLeft()) {
      if (result.value instanceof EmailAlreadyInUseError) {
        throw new CustomHttpException('EmailAlreadyInUse', result.value.message, 409)
      }
      throw CustomHttpException.fromUseCaseError(result.value)
    }
    return { user: UserPresenter.toHTTP(result.value.user) }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserBodySchema)) body: z.infer<typeof updateUserBodySchema>,
    @CurrentUser() user: SessionUser,
  ) {
    const result = await this.updateUser.execute({
      userId: id,
      name: body.name,
      email: body.email,
      roleIds: body.roleIds,
      actorUserId: user.id,
    })
    if (result.isLeft()) {
      if (result.value instanceof UserNotFoundError) {
        throw new CustomHttpException('UserNotFound', result.value.message, 404)
      }
      if (result.value instanceof EmailAlreadyInUseError) {
        throw new CustomHttpException('EmailAlreadyInUse', result.value.message, 409)
      }
      if (result.value instanceof LastAdminError) {
        throw new CustomHttpException('LastAdmin', result.value.message, 409)
      }
      throw CustomHttpException.fromUseCaseError(result.value)
    }
    return { user: UserPresenter.toHTTP(result.value.user) }
  }

  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string, @CurrentUser() actor: SessionUser) {
    const result = await this.deactivateUser.execute({
      targetUserId: id,
      actorUserId: actor.id,
    })
    if (result.isLeft()) {
      if (result.value instanceof UserNotFoundError) {
        throw new CustomHttpException('UserNotFound', result.value.message, 404)
      }
      if (result.value instanceof ProtectedUserError) {
        throw new CustomHttpException('ProtectedUser', result.value.message, 409)
      }
      if (result.value instanceof CannotDeleteSelfError) {
        throw new CustomHttpException('CannotDeleteSelf', result.value.message, 400)
      }
      if (result.value instanceof LastAdminError) {
        throw new CustomHttpException('LastAdmin', result.value.message, 409)
      }
      throw CustomHttpException.fromUseCaseError(result.value)
    }
    return {}
  }

  @Patch(':id/reactivate')
  async reactivate(@Param('id') id: string, @CurrentUser() actor: SessionUser) {
    const result = await this.reactivateUser.execute({
      targetUserId: id,
      actorUserId: actor.id,
    })
    if (result.isLeft()) {
      if (result.value instanceof UserNotFoundError) {
        throw new CustomHttpException('UserNotFound', result.value.message, 404)
      }
      throw CustomHttpException.fromUseCaseError(result.value)
    }
    return {}
  }

  @Patch(':id/password')
  async setPassword(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setUserPasswordBodySchema))
    body: z.infer<typeof setUserPasswordBodySchema>,
    @CurrentUser() actor: SessionUser,
  ) {
    const result = await this.setUserPassword.execute({
      targetUserId: id,
      newPassword: body.newPassword,
      actorUserId: actor.id,
    })
    if (result.isLeft()) {
      if (result.value instanceof UserNotFoundError) {
        throw new CustomHttpException('UserNotFound', result.value.message, 404)
      }
      throw CustomHttpException.fromUseCaseError(result.value)
    }
    return {}
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    const result = await this.deleteUser.execute({ userId: id, actorUserId: user.id })
    if (result.isLeft()) {
      if (result.value instanceof UserNotFoundError) {
        throw new CustomHttpException('UserNotFound', result.value.message, 404)
      }
      if (result.value instanceof ProtectedUserError) {
        throw new CustomHttpException('ProtectedUser', result.value.message, 409)
      }
      if (result.value instanceof CannotDeleteSelfError) {
        throw new CustomHttpException('CannotDeleteSelf', result.value.message, 400)
      }
      if (result.value instanceof LastAdminError) {
        throw new CustomHttpException('LastAdmin', result.value.message, 409)
      }
      throw CustomHttpException.fromUseCaseError(result.value)
    }
    return {}
  }
}
