import type { CursorPaginationParams } from '@/core/repositories/pagination-params'
import type { AuditEventInput } from '@/domain/application/repositories/audit-event-repository'
import type { Role } from '@/domain/enterprise/entities/role'

import { normalizeCursorLimit } from '@/core/repositories/pagination-params'
import { RoleRepository } from '@/domain/application/repositories/role-repository'

export class InMemoryRoleRepository extends RoleRepository {
  roles: Role[] = []
  auditEvents: AuditEventInput[] = []
  _assignmentCounts = new Map<string, number>()
  shouldFailOnSave = false
  shouldFailOnDelete = false

  async findById(id: string): Promise<Role | null> {
    return this.roles.find((r) => r.id.toString() === id) ?? null
  }

  async findByName(name: string): Promise<Role | null> {
    return this.roles.find((r) => r.name === name) ?? null
  }

  async findMany(params: CursorPaginationParams): Promise<{ roles: Role[]; nextCursor: string | null }> {
    const limit = normalizeCursorLimit(params.limit)
    const ordered = [...this.roles].sort((a, b) =>
      b.id.toString().localeCompare(a.id.toString()),
    )
    const filtered = params.cursor
      ? ordered.filter((r) => r.id.toString() < params.cursor!)
      : ordered
    const page = filtered.slice(0, limit)
    const last = page.at(-1)
    const nextCursor = filtered.length > limit && last ? last.id.toString() : null
    return { roles: page, nextCursor }
  }

  async save(role: Role, audit: AuditEventInput): Promise<void> {
    if (this.shouldFailOnSave) throw new Error('save failed')
    const idx = this.roles.findIndex((r) => r.id.equals(role.id))
    if (idx >= 0) this.roles[idx] = role
    else this.roles.push(role)
    this.auditEvents.push(audit)
  }

  async delete(id: string, audit: AuditEventInput): Promise<void> {
    if (this.shouldFailOnDelete) throw new Error('delete failed')
    this.roles = this.roles.filter((r) => r.id.toString() !== id)
    this.auditEvents.push(audit)
  }

  async countAssignedUsers(roleId: string): Promise<number> {
    return this._assignmentCounts.get(roleId) ?? 0
  }

  async countAssignedUsersMany(roleIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>()
    for (const id of roleIds) {
      const count = this._assignmentCounts.get(id)
      if (count !== undefined) map.set(id, count)
    }
    return map
  }
}
