import type { Permission } from '@/core/auth/permissions'
import type { AuditEventInput } from '@/domain/application/repositories/audit-event-repository'

export abstract class UserRoleAssignmentRepository {
  abstract findRoleIdsByUserId(userId: string): Promise<string[]>
  abstract findRoleIdsByUserIds(userIds: string[]): Promise<Map<string, string[]>>
  abstract findPermissionsByUserId(userId: string): Promise<Permission[]>
  abstract assign(userId: string, roleId: string): Promise<void>
  abstract unassign(userId: string, roleId: string): Promise<void>
  abstract replaceAll(userId: string, roleIds: string[], audit: AuditEventInput): Promise<void>
  abstract countUsersWithAnyPermission(permissions: Permission[]): Promise<number>
}
