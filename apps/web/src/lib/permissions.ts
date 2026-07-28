// Em sincronia com o catálogo do backend (apps/api/src/infra/http/permissions.ts).
export function hasAnyPermission(
  userPerms: readonly string[] | undefined,
  required: readonly string[],
): boolean {
  if (required.length === 0) return true
  if (!userPerms || userPerms.length === 0) return false
  return required.some((p) => userPerms.includes(p))
}
