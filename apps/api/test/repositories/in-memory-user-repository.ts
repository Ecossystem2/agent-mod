import type { InMemoryUserRoleAssignmentRepository } from './in-memory-user-role-assignment-repository'
import type { CursorPaginationParams } from '@/core/repositories/pagination-params'
import type { AuditEventInput } from '@/domain/application/repositories/audit-event-repository'
import type { User } from '@/domain/enterprise/entities/user'

import { normalizeCursorLimit } from '@/core/repositories/pagination-params'
import { UserRepository } from '@/domain/application/repositories/user-repository'

export class InMemoryUserRepository extends UserRepository {
  users: User[] = []
  auditEvents: AuditEventInput[] = []
  shouldFailOnDeleteById = false
  shouldFailOnSave = false
  assignmentRepo: InMemoryUserRoleAssignmentRepository | null = null

  async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id.toString() === id) ?? null
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((u) => u.email === email) ?? null
  }

  async findMany(params: CursorPaginationParams): Promise<{ users: User[]; nextCursor: string | null }> {
    const limit = normalizeCursorLimit(params.limit)
    const ordered = [...this.users].sort((a, b) =>
      b.id.toString().localeCompare(a.id.toString()),
    )
    const filtered = params.cursor
      ? ordered.filter((u) => u.id.toString() < params.cursor!)
      : ordered
    const page = filtered.slice(0, limit)
    const last = page.at(-1)
    const nextCursor = filtered.length > limit && last ? last.id.toString() : null
    return { users: page, nextCursor }
  }

  async saveWithAudit(user: User, audit: AuditEventInput): Promise<void> {
    if (this.shouldFailOnSave) throw new Error('saveWithAudit failed')
    const index = this.users.findIndex((u) => u.id.toString() === user.id.toString())
    if (index !== -1) {
      this.users[index] = user
    }
    this.auditEvents.push(audit)
  }

  async saveWithRoles(user: User, roleIds: string[], audit: AuditEventInput): Promise<void> {
    if (this.shouldFailOnSave) throw new Error('saveWithRoles failed')
    const index = this.users.findIndex((u) => u.id.toString() === user.id.toString())
    if (index !== -1) {
      this.users[index] = user
    }
    if (this.assignmentRepo) {
      await this.assignmentRepo.replaceAll(user.id.toString(), roleIds, audit)
    }
  }

  async deleteById(id: string, audit: AuditEventInput): Promise<void> {
    if (this.shouldFailOnDeleteById) throw new Error('deleteById failed')
    this.users = this.users.filter((u) => u.id.toString() !== id)
    this.auditEvents.push(audit)
  }
}
