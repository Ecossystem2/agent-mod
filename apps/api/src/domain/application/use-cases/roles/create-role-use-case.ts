import { Injectable } from '@nestjs/common'

import type { Permission } from '@/core/auth/permissions'

import { left, right, type Either } from '@/core/either'
import { UnexpectedError } from '@/core/errors/unexpected-error'
import { RoleRepository } from '@/domain/application/repositories/role-repository'
import { RoleNameTakenError } from '@/domain/application/use-cases/errors/role-name-taken-error'
import { Role } from '@/domain/enterprise/entities/role'

export interface CreateRoleInput {
  name: string
  description?: string | null
  permissions?: Permission[]
  actorUserId: string
}

export interface CreateRoleOutput {
  role: Role
}

type CreateRoleResult = Either<RoleNameTakenError | UnexpectedError, CreateRoleOutput>

@Injectable()
export class CreateRoleUseCase {
  constructor(private readonly roles: RoleRepository) {}

  async execute(input: CreateRoleInput): Promise<CreateRoleResult> {
    try {
      const existing = await this.roles.findByName(input.name)
      if (existing) return left(new RoleNameTakenError(input.name))

      const role = Role.create({
        name: input.name,
        description: input.description ?? null,
        isSystem: false,
        permissions: input.permissions ?? [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await this.roles.save(role, {
        actorUserId: input.actorUserId,
        action: 'role.create',
        resourceType: 'role',
        resourceId: role.id.toString(),
        metadata: { name: role.name },
      })

      return right({ role })
    } catch (err) {
      console.error('[CreateRoleUseCase] unexpected error:', err)
      return left(new UnexpectedError(err))
    }
  }
}
