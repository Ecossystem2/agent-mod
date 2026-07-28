import { Injectable } from '@nestjs/common'

import { PrismaRoleMapper } from '../mappers/admin/prisma-role-mapper'
import { PrismaService } from '../prisma.service'

import type { CursorPaginationParams } from '@/core/repositories/pagination-params'
import type { AuditEventInput } from '@/domain/application/repositories/audit-event-repository'
import type { Role } from '@/domain/enterprise/entities/role'

import { normalizeCursorLimit } from '@/core/repositories/pagination-params'
import { RoleRepository } from '@/domain/application/repositories/role-repository'

@Injectable()
export class PrismaRoleRepository extends RoleRepository {
  constructor(private readonly prisma: PrismaService) {
    super()
  }

  async findById(id: string): Promise<Role | null> {
    const raw = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: true },
    })
    return raw ? PrismaRoleMapper.toDomain(raw) : null
  }

  async findByName(name: string): Promise<Role | null> {
    const raw = await this.prisma.role.findUnique({
      where: { name },
      include: { permissions: true },
    })
    return raw ? PrismaRoleMapper.toDomain(raw) : null
  }

  async findMany(params: CursorPaginationParams): Promise<{ roles: Role[]; nextCursor: string | null }> {
    const limit = normalizeCursorLimit(params.limit)

    const raws = await this.prisma.role.findMany({
      include: { permissions: true },
      take: limit + 1,
      orderBy: { id: 'desc' },
      ...(params.cursor ? { where: { id: { lt: params.cursor } } } : {}),
    })

    const hasMore = raws.length > limit
    const page = hasMore ? raws.slice(0, limit) : raws
    const last = page.at(-1)
    const nextCursor = hasMore && last ? last.id : null

    return { roles: page.map((raw) => PrismaRoleMapper.toDomain(raw)), nextCursor }
  }

  async save(role: Role, audit: AuditEventInput): Promise<void> {
    const roleId = role.id.toString()

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.role.findUnique({ where: { id: roleId }, select: { id: true } })

      if (existing) {
        await tx.rolePermission.deleteMany({ where: { roleId } })
        await tx.rolePermission.createMany({
          data: [...role.permissions].map((p) => ({ roleId, permission: p })),
        })
        await tx.role.update({
          where: { id: roleId },
          data: {
            name: role.name,
            description: role.description,
            updatedAt: role.updatedAt,
          },
        })
      } else {
        await tx.role.create({
          data: {
            ...PrismaRoleMapper.toPrismaCreate(role),
            createdAt: role.createdAt,
            updatedAt: role.updatedAt,
          },
        })
      }

      await tx.auditEvent.create({
        data: {
          actorUserId: audit.actorUserId,
          action: audit.action,
          resourceType: audit.resourceType,
          resourceId: audit.resourceId,
          metadata: audit.metadata !== undefined ? (audit.metadata as object) : undefined,
        },
      })
    })
  }

  async delete(id: string, audit: AuditEventInput): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.role.delete({ where: { id } }),
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

  async countAssignedUsers(roleId: string): Promise<number> {
    return this.prisma.userRoleAssignment.count({ where: { roleId } })
  }

  async countAssignedUsersMany(roleIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>()
    if (roleIds.length === 0) return map

    const grouped = await this.prisma.userRoleAssignment.groupBy({
      by: ['roleId'],
      where: { roleId: { in: roleIds } },
      _count: { _all: true },
    })
    for (const row of grouped) {
      map.set(row.roleId, row._count._all)
    }
    return map
  }
}
