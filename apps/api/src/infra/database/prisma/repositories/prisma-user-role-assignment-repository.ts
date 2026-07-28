import { Injectable } from '@nestjs/common'

import { PrismaService } from '../prisma.service'

import type { Permission } from '@/core/auth/permissions'
import type { AuditEventInput } from '@/domain/application/repositories/audit-event-repository'

import { UserRoleAssignmentRepository } from '@/domain/application/repositories/user-role-assignment-repository'

@Injectable()
export class PrismaUserRoleAssignmentRepository extends UserRoleAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {
    super()
  }

  async findRoleIdsByUserId(userId: string): Promise<string[]> {
    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: { userId },
      select: { roleId: true },
    })
    return assignments.map((a) => a.roleId)
  }

  async findRoleIdsByUserIds(userIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>()
    if (userIds.length === 0) return map

    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, roleId: true },
    })
    for (const a of assignments) {
      const list = map.get(a.userId)
      if (list) list.push(a.roleId)
      else map.set(a.userId, [a.roleId])
    }
    return map
  }

  async findPermissionsByUserId(userId: string): Promise<Permission[]> {
    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: { userId },
      select: { role: { select: { permissions: { select: { permission: true } } } } },
    })
    const perms = new Set<Permission>()
    for (const a of assignments) {
      for (const p of a.role.permissions) {
        perms.add(p.permission as Permission)
      }
    }
    return [...perms]
  }

  async assign(userId: string, roleId: string): Promise<void> {
    await this.prisma.userRoleAssignment.upsert({
      where: { userId_roleId: { userId, roleId } },
      create: { userId, roleId },
      update: {},
    })
  }

  async unassign(userId: string, roleId: string): Promise<void> {
    await this.prisma.userRoleAssignment.deleteMany({ where: { userId, roleId } })
  }

  async replaceAll(userId: string, roleIds: string[], audit: AuditEventInput): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.userRoleAssignment.deleteMany({ where: { userId } }),
      this.prisma.userRoleAssignment.createMany({
        data: roleIds.map((roleId) => ({ userId, roleId })),
        skipDuplicates: true,
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

  async countUsersWithAnyPermission(permissions: Permission[]): Promise<number> {
    if (permissions.length === 0) return 0

    return this.prisma.user.count({
      where: {
        roleAssignments: {
          some: {
            role: { permissions: { some: { permission: { in: [...permissions] } } } },
          },
        },
      },
    })
  }
}
