import { Injectable } from '@nestjs/common'

import type { CursorPaginationParams } from '@/core/repositories/pagination-params'
import type { User } from '@/domain/enterprise/entities/user'

import { right, type Either } from '@/core/either'
import { UserRepository } from '@/domain/application/repositories/user-repository'
import { UserRoleAssignmentRepository } from '@/domain/application/repositories/user-role-assignment-repository'

export type ListUsersInput = CursorPaginationParams

export interface UserWithRoles {
  user: User
  roleIds: string[]
}

export interface ListUsersOutput {
  users: UserWithRoles[]
  nextCursor: string | null
}

type ListUsersResult = Either<never, ListUsersOutput>

@Injectable()
export class ListUsersUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly assignmentRepo: UserRoleAssignmentRepository,
  ) {}

  async execute(input: ListUsersInput): Promise<ListUsersResult> {
    const { users, nextCursor } = await this.userRepo.findMany(input)
    const roleIdsByUser = await this.assignmentRepo.findRoleIdsByUserIds(
      users.map((user) => user.id.toString()),
    )
    const usersWithRoles: UserWithRoles[] = users.map((user) => ({
      user,
      roleIds: roleIdsByUser.get(user.id.toString()) ?? [],
    }))
    return right({ users: usersWithRoles, nextCursor })
  }
}
