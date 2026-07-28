import type { AuditEventInput } from '@/domain/application/repositories/audit-event-repository'

export abstract class SetPasswordPort {
  abstract setPassword(
    userId: string,
    newPassword: string,
    audit: AuditEventInput,
  ): Promise<void>
}
