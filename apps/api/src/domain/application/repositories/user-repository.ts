import type { CursorPaginationParams } from '@/core/repositories/pagination-params'
import type { AuditEventInput } from '@/domain/application/repositories/audit-event-repository'
import type { User } from '@/domain/enterprise/entities/user'

export abstract class UserRepository {
  abstract findById(id: string): Promise<User | null>
  abstract findByEmail(email: string): Promise<User | null>
  abstract findMany(params: CursorPaginationParams): Promise<{ users: User[]; nextCursor: string | null }>
  abstract saveWithAudit(user: User, audit: AuditEventInput): Promise<void>
  abstract saveWithRoles(user: User, roleIds: string[], audit: AuditEventInput): Promise<void>
  abstract deleteById(id: string, audit: AuditEventInput): Promise<void>
}
