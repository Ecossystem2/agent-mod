import { randomUUID } from 'node:crypto'

import { describe, it, expect, beforeEach } from 'vitest'

import { PrismaUserRoleAssignmentRepository } from './prisma-user-role-assignment-repository'

import type { PrismaService } from '../prisma.service'
import type { PrismaClient } from '@prisma/client'

const seedAudit = {
  actorUserId: 'seed',
  action: 'user.update' as const,
  resourceType: 'user' as const,
}

async function createTestRole(
  prisma: PrismaClient,
  override?: Partial<{ name: string; permissions: string[] }>,
) {
  const roleId = randomUUID()
  const permissions = override?.permissions ?? []
  await prisma.role.create({
    data: {
      id: roleId,
      name: override?.name ?? `role-${randomUUID()}`,
      description: null,
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      permissions: {
        create: permissions.map((p) => ({ permission: p })),
      },
    },
  })
  return roleId
}

async function createTestUser(prisma: PrismaClient): Promise<string> {
  const userId = randomUUID()
  await prisma.user.create({
    data: {
      id: userId,
      email: `${userId}@test.com`,
      name: 'Test User',
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
  return userId
}

describe(PrismaUserRoleAssignmentRepository.name, () => {
  let prisma: PrismaClient
  let sut: PrismaUserRoleAssignmentRepository

  beforeEach(async () => {
    prisma = globalThis.__E2E_PRISMA__!
    sut = new PrismaUserRoleAssignmentRepository(prisma as unknown as PrismaService)
    await prisma.userRoleAssignment.deleteMany()
    await prisma.rolePermission.deleteMany()
    await prisma.role.deleteMany()
    await prisma.auditEvent.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('assign', () => {
    it('creates an assignment', async () => {
      const roleId = await createTestRole(prisma)
      const userId = await createTestUser(prisma)

      await sut.assign(userId, roleId)

      const assignment = await prisma.userRoleAssignment.findUnique({
        where: { userId_roleId: { userId, roleId } },
      })
      expect(assignment).not.toBeNull()
    })

    it('is idempotent — second call with same userId+roleId does not duplicate', async () => {
      const roleId = await createTestRole(prisma)
      const userId = await createTestUser(prisma)

      await sut.assign(userId, roleId)
      await sut.assign(userId, roleId)

      const assignments = await prisma.userRoleAssignment.findMany({
        where: { userId, roleId },
      })
      expect(assignments).toHaveLength(1)
    })
  })

  describe('unassign', () => {
    it('removes an existing assignment', async () => {
      const roleId = await createTestRole(prisma)
      const userId = await createTestUser(prisma)
      await sut.assign(userId, roleId)

      await sut.unassign(userId, roleId)

      const assignment = await prisma.userRoleAssignment.findUnique({
        where: { userId_roleId: { userId, roleId } },
      })
      expect(assignment).toBeNull()
    })

    it('does not fail when assignment does not exist', async () => {
      const roleId = await createTestRole(prisma)
      const userId = await createTestUser(prisma)

      await expect(sut.unassign(userId, roleId)).resolves.toBeUndefined()
    })
  })

  describe('replaceAll', () => {
    it('replaces all roles for a user', async () => {
      const roleIdA = await createTestRole(prisma)
      const roleIdB = await createTestRole(prisma)
      const roleIdC = await createTestRole(prisma)
      const userId = await createTestUser(prisma)

      await sut.assign(userId, roleIdA)
      await sut.assign(userId, roleIdB)

      await sut.replaceAll(userId, [roleIdC], seedAudit)

      const assignments = await prisma.userRoleAssignment.findMany({ where: { userId } })
      expect(assignments).toHaveLength(1)
      expect(assignments[0].roleId).toBe(roleIdC)
    })

    it('removes all roles when given an empty array', async () => {
      const roleIdA = await createTestRole(prisma)
      const roleIdB = await createTestRole(prisma)
      const userId = await createTestUser(prisma)

      await sut.assign(userId, roleIdA)
      await sut.assign(userId, roleIdB)

      await sut.replaceAll(userId, [], seedAudit)

      const assignments = await prisma.userRoleAssignment.findMany({ where: { userId } })
      expect(assignments).toHaveLength(0)
    })

    it('persiste audit event atomicamente com os assignments', async () => {
      const roleId = await createTestRole(prisma)
      const userId = await createTestUser(prisma)

      await sut.replaceAll(userId, [roleId], {
        actorUserId: 'actor-replace',
        action: 'user.create',
        resourceType: 'user',
        resourceId: userId,
      })

      const event = await prisma.auditEvent.findFirst({ where: { actorUserId: 'actor-replace' } })
      expect(event).not.toBeNull()
      expect(event!.action).toBe('user.create')
    })
  })

  describe('findRoleIdsByUserId', () => {
    it('returns the assigned role ids', async () => {
      const roleIdA = await createTestRole(prisma)
      const roleIdB = await createTestRole(prisma)
      const userId = await createTestUser(prisma)

      await sut.assign(userId, roleIdA)
      await sut.assign(userId, roleIdB)

      const roleIds = await sut.findRoleIdsByUserId(userId)

      expect(roleIds).toHaveLength(2)
      expect(roleIds).toEqual(expect.arrayContaining([roleIdA, roleIdB]))
    })

    it('returns empty array for user without roles', async () => {
      const roleIds = await sut.findRoleIdsByUserId(randomUUID())

      expect(roleIds).toEqual([])
    })
  })

  describe('findRoleIdsByUserIds', () => {
    it('agrupa os roleIds por usuário em uma única consulta', async () => {
      const roleIdA = await createTestRole(prisma)
      const roleIdB = await createTestRole(prisma)
      const userA = await createTestUser(prisma)
      const userB = await createTestUser(prisma)
      await sut.assign(userA, roleIdA)
      await sut.assign(userA, roleIdB)
      await sut.assign(userB, roleIdA)

      const map = await sut.findRoleIdsByUserIds([userA, userB])

      expect(map.get(userA)).toEqual(expect.arrayContaining([roleIdA, roleIdB]))
      expect(map.get(userA)).toHaveLength(2)
      expect(map.get(userB)).toEqual([roleIdA])
    })

    it('omite usuários sem roles do mapa', async () => {
      const roleId = await createTestRole(prisma)
      const userA = await createTestUser(prisma)
      const userB = await createTestUser(prisma)
      await sut.assign(userA, roleId)

      const map = await sut.findRoleIdsByUserIds([userA, userB])

      expect(map.get(userA)).toEqual([roleId])
      expect(map.has(userB)).toBe(false)
    })

    it('retorna mapa vazio para lista de ids vazia', async () => {
      const map = await sut.findRoleIdsByUserIds([])

      expect(map.size).toBe(0)
    })
  })

  describe('findPermissionsByUserId', () => {
    it('aggregates permissions from all assigned roles', async () => {
      const roleIdA = await createTestRole(prisma, { permissions: ['admin:users', 'admin:roles'] })
      const roleIdB = await createTestRole(prisma, { permissions: ['view:dashboard'] })
      const userId = await createTestUser(prisma)

      await sut.assign(userId, roleIdA)
      await sut.assign(userId, roleIdB)

      const permissions = await sut.findPermissionsByUserId(userId)

      expect(permissions).toHaveLength(3)
      expect(permissions).toEqual(
        expect.arrayContaining(['admin:users', 'admin:roles', 'view:dashboard']),
      )
    })

    it('deduplicates permissions shared across roles', async () => {
      const roleIdA = await createTestRole(prisma, { permissions: ['admin:users', 'admin:roles'] })
      const roleIdB = await createTestRole(prisma, { permissions: ['admin:users', 'view:dashboard'] })
      const userId = await createTestUser(prisma)

      await sut.assign(userId, roleIdA)
      await sut.assign(userId, roleIdB)

      const permissions = await sut.findPermissionsByUserId(userId)

      const unique = new Set(permissions)
      expect(unique.size).toBe(permissions.length)
      expect(permissions).toEqual(
        expect.arrayContaining(['admin:users', 'admin:roles', 'view:dashboard']),
      )
    })

    it('returns empty array for user without roles', async () => {
      const permissions = await sut.findPermissionsByUserId(randomUUID())

      expect(permissions).toEqual([])
    })
  })

  describe('countUsersWithAnyPermission', () => {
    it('returns 0 when no user has the given permission', async () => {
      const roleId = await createTestRole(prisma, { permissions: ['admin:users'] })
      const userId = await createTestUser(prisma)
      await sut.assign(userId, roleId)

      const count = await sut.countUsersWithAnyPermission(['view:settings'])

      expect(count).toBe(0)
    })

    it('counts distinct users that have any of the given permissions', async () => {
      const roleIdA = await createTestRole(prisma, { permissions: ['admin:users'] })
      const roleIdB = await createTestRole(prisma, { permissions: ['admin:roles'] })
      const userIdA = await createTestUser(prisma)
      const userIdB = await createTestUser(prisma)
      const userIdC = await createTestUser(prisma)

      await sut.assign(userIdA, roleIdA)
      await sut.assign(userIdB, roleIdB)
      await sut.assign(userIdC, roleIdA)
      await sut.assign(userIdC, roleIdB)

      const count = await sut.countUsersWithAnyPermission(['admin:users', 'admin:roles'])

      expect(count).toBe(3)
    })

    it('counts each user once even when they have multiple matching roles', async () => {
      const roleIdA = await createTestRole(prisma, { permissions: ['admin:users'] })
      const roleIdB = await createTestRole(prisma, { permissions: ['admin:users', 'admin:roles'] })
      const userId = await createTestUser(prisma)

      await sut.assign(userId, roleIdA)
      await sut.assign(userId, roleIdB)

      const count = await sut.countUsersWithAnyPermission(['admin:users'])

      expect(count).toBe(1)
    })

    it('returns 0 for an empty permission list', async () => {
      const count = await sut.countUsersWithAnyPermission([])

      expect(count).toBe(0)
    })
  })
})
