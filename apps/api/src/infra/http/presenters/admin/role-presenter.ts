import type { Role } from '@/domain/enterprise/entities/role'

export interface RolePresenterOutput {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  permissions: readonly string[]
  assignedUserCount: number
  createdAt: Date
}

export class RolePresenter {
  static toHTTP(role: Role, assignedUserCount: number): RolePresenterOutput {
    return {
      id: role.id.toString(),
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions,
      assignedUserCount,
      createdAt: role.createdAt,
    }
  }
}
