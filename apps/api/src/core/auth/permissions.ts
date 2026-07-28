export const PERMISSIONS = [
  'admin:users',
  'admin:roles',
  'view:dashboard',
  'view:settings',
  'manage:settings',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export const ADMIN_PERMISSIONS = ['admin:users', 'admin:roles'] as const satisfies readonly Permission[]

export function hasAnyPermission(
  userPerms: readonly string[],
  required: readonly Permission[],
): boolean {
  if (required.length === 0) return true
  return required.some((p) => userPerms.includes(p))
}
