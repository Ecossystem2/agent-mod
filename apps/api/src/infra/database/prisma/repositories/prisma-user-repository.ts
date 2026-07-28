import { Injectable } from '@nestjs/common'

import { PrismaUserMapper } from '../mappers/admin/prisma-user-mapper'
import { PrismaService } from '../prisma.service'

import type { CursorPaginationParams } from '@/core/repositories/pagination-params'
import type { AuditEventInput } from '@/domain/application/repositories/audit-event-repository'
import type { User } from '@/domain/enterprise/entities/user'

import { normalizeCursorLimit } from '@/core/repositories/pagination-params'
import { UserRepository } from '@/domain/application/repositories/user-repository'

const USER_COLUMNS = {
  id: true,
  email: true,
  emailVerified: true,
  name: true,
  image: true,
  isActive: true,
  isProtected: true,
  createdAt: true,
  updatedAt: true,
} as const

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super()
  }

  async findById(id: string): Promise<User | null> {
    const raw = await this.prisma.user.findUnique({
      where: { id },
      select: { ...USER_COLUMNS, roleAssignments: { select: { roleId: true } } },
    })
    if (!raw) return null
    return PrismaUserMapper.toDomain(raw, raw.roleAssignments.map((a) => a.roleId))
  }

  async findByEmail(email: string): Promise<User | null> {
    const raw = await this.prisma.user.findUnique({
      where: { email },
      select: { ...USER_COLUMNS, roleAssignments: { select: { roleId: true } } },
    })
    if (!raw) return null
    return PrismaUserMapper.toDomain(raw, raw.roleAssignments.map((a) => a.roleId))
  }

  async findMany(params: CursorPaginationParams): Promise<{ users: User[]; nextCursor: string | null }> {
    const limit = normalizeCursorLimit(params.limit)

    const raws = await this.prisma.user.findMany({
      select: USER_COLUMNS,
      take: limit + 1,
      orderBy: { id: 'desc' },
      ...(params.cursor ? { where: { id: { lt: params.cursor } } } : {}),
    })

    const hasMore = raws.length > limit
    const page = hasMore ? raws.slice(0, limit) : raws
    const last = page.at(-1)
    const nextCursor = hasMore && last ? last.id : null

    return { users: page.map((raw) => PrismaUserMapper.toDomain(raw)), nextCursor }
  }

  async saveWithAudit(user: User, audit: AuditEventInput): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id.toString() },
        data: {
          name: user.name,
          email: user.email,
          isActive: user.isActive,
          isProtected: user.isProtected,
          updatedAt: user.updatedAt,
        },
      }),
      this.prisma.auditEvent.create({
        data: {
          actorUserId: audit.actorUserId,
          action: audit.action,
          resourceType: audit.resourceType,
          resourceId: audit.resourceId,
          metadata: audit.metadata !== undefined ? (audit.metadata as object) : undefined,
        },
      }),
    ])
  }

  async saveWithRoles(user: User, roleIds: string[], audit: AuditEventInput): Promise<void> {
    const userId = user.id.toString()
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          name: user.name,
          email: user.email,
          isActive: user.isActive,
          isProtected: user.isProtected,
          updatedAt: user.updatedAt,
        },
      }),
      this.prisma.userRoleAssignment.deleteMany({
        where: { userId },
      }),
      ...(roleIds.length > 0
        ? [
            this.prisma.userRoleAssignment.createMany({
              data: roleIds.map((roleId) => ({ userId, roleId })),
            }),
          ]
        : []),
      this.prisma.auditEvent.create({
        data: {
          actorUserId: audit.actorUserId,
          action: audit.action,
          resourceType: audit.resourceType,
          resourceId: audit.resourceId,
          metadata: audit.metadata !== undefined ? (audit.metadata as object) : undefined,
        },
      }),
    ])
  }

  async deleteById(id: string, audit: AuditEventInput): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.delete({ where: { id } }),
      this.prisma.auditEvent.create({
        data: {
          actorUserId: audit.actorUserId,
          action: audit.action,
          resourceType: audit.resourceType,
          resourceId: audit.resourceId,
          metadata: audit.metadata !== undefined ? (audit.metadata as object) : undefined,
        },
      }),
    ])
  }
}
