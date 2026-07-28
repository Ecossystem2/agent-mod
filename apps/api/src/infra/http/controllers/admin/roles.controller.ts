import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { z } from 'zod'

import { PERMISSIONS } from '@/core/auth/permissions'
import { RoleInUseError } from '@/domain/application/use-cases/errors/role-in-use-error'
import { RoleIsSystemError } from '@/domain/application/use-cases/errors/role-is-system-error'
import { RoleNameTakenError } from '@/domain/application/use-cases/errors/role-name-taken-error'
import { RoleNotFoundError } from '@/domain/application/use-cases/errors/role-not-found-error'
import { CreateRoleUseCase } from '@/domain/application/use-cases/roles/create-role-use-case'
import { DeleteRoleUseCase } from '@/domain/application/use-cases/roles/delete-role-use-case'
import { ListRolesUseCase } from '@/domain/application/use-cases/roles/list-roles-use-case'
import { UpdateRoleUseCase } from '@/domain/application/use-cases/roles/update-role-use-case'
import { CurrentUser, type SessionUser } from '@/infra/http/decorators/current-user.decorator'
import { RequiresPermission } from '@/infra/http/decorators/requires-permission.decorator'
import { CustomHttpException } from '@/infra/http/exceptions/custom-http.exception'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation.pipe'
import { RolePresenter } from '@/infra/http/presenters/admin/role-presenter'

const listRolesQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const createRoleBodySchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).nullable().optional(),
    permissions: z.array(z.enum(PERMISSIONS)).default([]),
  })
  .strict()

const updateRoleBodySchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).nullable().optional(),
    permissions: z.array(z.enum(PERMISSIONS)).optional(),
  })
  .strict()

@Controller('admin/roles')
@RequiresPermission('admin:roles')
export class RolesController {
  constructor(
    private readonly listRoles: ListRolesUseCase,
    private readonly createRole: CreateRoleUseCase,
    private readonly updateRole: UpdateRoleUseCase,
    private readonly deleteRole: DeleteRoleUseCase,
  ) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(listRolesQuerySchema)) query: z.infer<typeof listRolesQuerySchema>,
  ) {
    const result = await this.listRoles.execute({ cursor: query.cursor, limit: query.limit })
    if (result.isLeft()) throw CustomHttpException.fromUseCaseError(result.value)
    const { roles, nextCursor } = result.value
    return {
      roles: roles.map(({ role, assignedUserCount }) =>
        RolePresenter.toHTTP(role, assignedUserCount),
      ),
      nextCursor,
    }
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createRoleBodySchema)) body: z.infer<typeof createRoleBodySchema>,
    @CurrentUser() user: SessionUser,
  ) {
    const result = await this.createRole.execute({
      name: body.name,
      description: body.description,
      permissions: body.permissions,
      actorUserId: user.id,
    })
    if (result.isLeft()) {
      if (result.value instanceof RoleNameTakenError) {
        throw new CustomHttpException('RoleNameTaken', result.value.message, 409)
      }
      throw CustomHttpException.fromUseCaseError(result.value)
    }
    return { role: RolePresenter.toHTTP(result.value.role, 0) }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateRoleBodySchema)) body: z.infer<typeof updateRoleBodySchema>,
    @CurrentUser() user: SessionUser,
  ) {
    const result = await this.updateRole.execute({
      roleId: id,
      name: body.name,
      description: body.description,
      permissions: body.permissions,
      actorUserId: user.id,
    })
    if (result.isLeft()) {
      if (result.value instanceof RoleNotFoundError) {
        throw new CustomHttpException('RoleNotFound', result.value.message, 404)
      }
      if (result.value instanceof RoleIsSystemError) {
        throw new CustomHttpException('RoleIsSystem', result.value.message, 409)
      }
      if (result.value instanceof RoleNameTakenError) {
        throw new CustomHttpException('RoleNameTaken', result.value.message, 409)
      }
      throw CustomHttpException.fromUseCaseError(result.value)
    }
    return { role: RolePresenter.toHTTP(result.value.role, 0) }
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    const result = await this.deleteRole.execute({ roleId: id, actorUserId: user.id })
    if (result.isLeft()) {
      if (result.value instanceof RoleNotFoundError) {
        throw new CustomHttpException('RoleNotFound', result.value.message, 404)
      }
      if (result.value instanceof RoleIsSystemError) {
        throw new CustomHttpException('RoleIsSystem', result.value.message, 409)
      }
      if (result.value instanceof RoleInUseError) {
        throw new CustomHttpException('RoleInUse', result.value.message, 409)
      }
      throw CustomHttpException.fromUseCaseError(result.value)
    }
    return {}
  }
}
