import type { CursorPaginationParams } from '@/core/repositories/pagination-params'
import type { AuditEventInput } from '@/domain/application/repositories/audit-event-repository'
import type { Role } from '@/domain/enterprise/entities/role'

export abstract class RoleRepository {
  abstract findById(id: string): Promise<Role | null>
  abstract findByName(name: string): Promise<Role | null>
  abstract findMany(params: CursorPaginationParams): Promise<{ roles: Role[]; nextCursor: string | null }>
  abstract save(role: Role, audit: AuditEventInput): Promise<void>
  abstract delete(id: string, audit: AuditEventInput): Promise<void>
  abstract countAssignedUsers(roleId: string): Promise<number>
  abstract countAssignedUsersMany(roleIds: string[]): Promise<Map<string, number>>
}
