import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { User } from '@/domain/enterprise/entities/user'

export interface MakeUserOverrides {
  id?: string
  name?: string
  email?: string
  emailVerified?: boolean
  image?: string | null
  roleIds?: string[]
  isActive?: boolean
  isProtected?: boolean
  createdAt?: Date
  updatedAt?: Date
}

export function makeUser(overrides: MakeUserOverrides = {}): User {
  return User.create(
    {
      name: overrides.name ?? 'Test User',
      email: overrides.email ?? 'user@test.com',
      emailVerified: overrides.emailVerified ?? true,
      image: overrides.image ?? null,
      roleIds: overrides.roleIds ?? [],
      isActive: overrides.isActive ?? true,
      isProtected: overrides.isProtected ?? false,
      createdAt: overrides.createdAt ?? new Date('2024-01-01'),
      updatedAt: overrides.updatedAt ?? new Date('2024-01-01'),
    },
    new UniqueEntityID(overrides.id ?? 'user-1'),
  )
}
