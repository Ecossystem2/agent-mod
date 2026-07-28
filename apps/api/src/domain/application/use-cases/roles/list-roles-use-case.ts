import { Injectable } from '@nestjs/common'

import type { CursorPaginationParams } from '@/core/repositories/pagination-params'
import type { Role } from '@/domain/enterprise/entities/role'

import { right, type Either } from '@/core/either'
import { RoleRepository } from '@/domain/application/repositories/role-repository'

export type ListRolesInput = CursorPaginationParams

export interface RoleWithCount {
  role: Role
  assignedUserCount: number
}

export interface ListRolesOutput {
  roles: RoleWithCount[]
  nextCursor: string | null
}

type ListRolesResult = Either<never, ListRolesOutput>

@Injectable()
export class ListRolesUseCase {
  constructor(private readonly roleRepo: RoleRepository) {}

  async execute(input: ListRolesInput): Promise<ListRolesResult> {
    const { roles, nextCursor } = await this.roleRepo.findMany(input)
    const countByRole = await this.roleRepo.countAssignedUsersMany(
      roles.map((role) => role.id.toString()),
    )
    const rolesWithCount: RoleWithCount[] = roles.map((role) => ({
      role,
      assignedUserCount: countByRole.get(role.id.toString()) ?? 0,
    }))
    return right({ roles: rolesWithCount, nextCursor })
  }
}
