export const AUDIT_ACTIONS = [
  'role.create',
  'role.update',
  'role.delete',
  'user.create',
  'user.update',
  'user.delete',
  'user.deactivate',
  'user.reactivate',
  'user.set_password',
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export const AUDIT_RESOURCE_TYPES = ['role', 'user'] as const

export type AuditResourceType = (typeof AUDIT_RESOURCE_TYPES)[number]

export interface AuditEventInput {
  actorUserId: string
  action: AuditAction
  resourceType: AuditResourceType
  resourceId?: string
  metadata?: Record<string, unknown>
}
