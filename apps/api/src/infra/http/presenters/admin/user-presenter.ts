import type { User } from '@/domain/enterprise/entities/user'

export interface UserPresenterOutput {
  id: string
  email: string
  name: string
  emailVerified: boolean
  roleIds: string[]
  isActive: boolean
  isProtected: boolean
  createdAt: Date
}

export class UserPresenter {
  static toHTTP(user: User, roleIds?: string[]): UserPresenterOutput {
    return {
      id: user.id.toString(),
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      roleIds: roleIds ?? [...user.roleIds],
      isActive: user.isActive,
      isProtected: user.isProtected,
      createdAt: user.createdAt,
    }
  }
}
