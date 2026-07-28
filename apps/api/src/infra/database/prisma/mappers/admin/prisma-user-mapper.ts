import type { User as PrismaUser } from '@prisma/client'

import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { User } from '@/domain/enterprise/entities/user'

export class PrismaUserMapper {
  static toDomain(raw: PrismaUser, roleIds: string[] = []): User {
    return User.create(
      {
        name: raw.name,
        email: raw.email,
        emailVerified: raw.emailVerified,
        image: raw.image,
        roleIds,
        isActive: raw.isActive,
        isProtected: raw.isProtected,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }
}
