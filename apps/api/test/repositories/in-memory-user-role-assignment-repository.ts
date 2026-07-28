import type { Permission } from '@/core/auth/permissions'
import type { AuditEventInput } from '@/domain/application/repositories/audit-event-repository'

import { UserRoleAssignmentRepository } from '@/domain/application/repositories/user-role-assignment-repository'

export class InMemoryUserRoleAssignmentRepository extends UserRoleAssignmentRepository {
  assignments = new Map<string, Set<string>>()
  auditEvents: AuditEventInput[] = []
  _rolePermissions = new Map<string, string[]>()
  shouldFailOnReplaceAll = false

  async findRoleIdsByUserId(userId: string): Promise<string[]> {
    return [...(this.assignments.get(userId) ?? [])]
  }

  async findRoleIdsByUserIds(userIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>()
    for (const id of userIds) {
      const roles = this.assignments.get(id)
      if (roles && roles.size > 0) map.set(id, [...roles])
    }
    return map
  }

  async findPermissionsByUserId(userId: string): Promise<Permission[]> {
    const roleIds = await this.findRoleIdsByUserId(userId)
    const perms = new Set<Permission>()
    for (const roleId of roleIds) {
      for (const p of this._rolePermissions.get(roleId) ?? []) {
        perms.add(p as Permission)
      }
    }
    return [...perms]
  }

  async assign(userId: string, roleId: string): Promise<void> {
    if (!this.assignments.has(userId)) this.assignments.set(userId, new Set())
    this.assignments.get(userId)!.add(roleId)
  }

  async unassign(userId: string, roleId: string): Promise<void> {
    this.assignments.get(userId)?.delete(roleId)
  }

  async replaceAll(userId: string, roleIds: string[], audit: AuditEventInput): Promise<void> {
    if (this.shouldFailOnReplaceAll) throw new Error('replaceAll failed')
    this.assignments.set(userId, new Set(roleIds))
    this.auditEvents.push(audit)
  }

  async countUsersWithAnyPermission(permissions: Permission[]): Promise<number> {
    let count = 0
    for (const [, roleIds] of this.assignments.entries()) {
      const userPerms = new Set<string>()
      for (const roleId of roleIds) {
        for (const p of this._rolePermissions.get(roleId) ?? []) userPerms.add(p)
      }
      if (permissions.some((p) => userPerms.has(p))) count++
    }
    return count
  }
}
