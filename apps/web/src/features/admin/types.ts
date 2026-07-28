export interface Role {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  permissions: string[]
  assignedUserCount: number
  createdAt: string
}

export interface AdminUser {
  id: string
  email: string
  name: string
  emailVerified: boolean
  roleIds: string[]
  createdAt: string
  isActive: boolean
  isProtected: boolean
}

// TODO(@rafaolegario): sem shared package de tipos entre apps/api e apps/web, este
// array é cópia manual de PERMISSIONS em apps/api/src/core/auth/permissions.ts.
// Ao adicionar permissão no backend, atualizar também aqui.
export const ADMIN_PERMISSIONS = [
  'admin:users',
  'admin:roles',
  'view:dashboard',
  'view:settings',
  'manage:settings',
] as const

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number]

export interface PermissionCategory {
  label: string
  permissions: AdminPermission[]
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  { label: 'Administração', permissions: ['admin:users', 'admin:roles'] },
  { label: 'Visualização', permissions: ['view:dashboard', 'view:settings'] },
  { label: 'Configurações', permissions: ['manage:settings'] },
]
