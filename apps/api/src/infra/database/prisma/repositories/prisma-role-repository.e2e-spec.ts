import { randomUUID } from 'node:crypto'

import { describe, it, expect, beforeEach } from 'vitest'

import { PrismaRoleRepository } from './prisma-role-repository'

import type { PrismaService } from '../prisma.service'
import type { PrismaClient } from '@prisma/client'

import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { Role } from '@/domain/enterprise/entities/role'

const seedAudit = {
  actorUserId: 'seed',
  action: 'role.create' as const,
  resourceType: 'role' as const,
}

function makeRole(
  override?: Partial<{
    name: string
    description: string | null
    isSystem: boolean
    permissions: string[]
  }>,
): Role {
  return Role.create({
    name: override?.name ?? `role-${randomUUID()}`,
    description: override?.description ?? null,
    isSystem: override?.isSystem ?? false,
    permissions: (override?.permissions ?? []) as never,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
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

describe(PrismaRoleRepository.name, () => {
  let prisma: PrismaClient
  let sut: PrismaRoleRepository

  beforeEach(async () => {
    prisma = globalThis.__E2E_PRISMA__!
    sut = new PrismaRoleRepository(prisma as unknown as PrismaService)
    await prisma.userRoleAssignment.deleteMany()
    await prisma.rolePermission.deleteMany()
    await prisma.role.deleteMany()
    await prisma.auditEvent.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('findById', () => {
    it('returns null for non-existent id', async () => {
      const result = await sut.findById(randomUUID())

      expect(result).toBeNull()
    })

    it('finds a saved role with permissions', async () => {
      const role = makeRole({ permissions: ['admin:users', 'admin:roles'] })
      await sut.save(role, seedAudit)

      const result = await sut.findById(role.id.toString())

      expect(result).not.toBeNull()
      expect(result!.id.toString()).toBe(role.id.toString())
      expect(result!.name).toBe(role.name)
      expect(result!.permissions).toEqual(expect.arrayContaining(['admin:users', 'admin:roles']))
    })
  })

  describe('findByName', () => {
    it('returns null for non-existent name', async () => {
      const result = await sut.findByName('non-existent-role')

      expect(result).toBeNull()
    })

    it('finds a role by name', async () => {
      const role = makeRole({ name: 'admin' })
      await sut.save(role, seedAudit)

      const result = await sut.findByName('admin')

      expect(result).not.toBeNull()
      expect(result!.id.toString()).toBe(role.id.toString())
    })
  })

  describe('findMany', () => {
    it('returns first page with nextCursor when there are more rows', async () => {
      for (const r of [makeRole(), makeRole(), makeRole()]) {
        await sut.save(r, seedAudit)
      }

      const result = await sut.findMany({ limit: 2 })

      expect(result.roles).toHaveLength(2)
      expect(result.nextCursor).not.toBeNull()
    })

    it('returns nextCursor null on the last page', async () => {
      await sut.save(makeRole(), seedAudit)
      await sut.save(makeRole(), seedAudit)

      const result = await sut.findMany({ limit: 10 })

      expect(result.roles).toHaveLength(2)
      expect(result.nextCursor).toBeNull()
    })

    it('continues from the cursor without repeating rows (orders by id desc)', async () => {
      for (const r of [makeRole(), makeRole(), makeRole(), makeRole(), makeRole()]) {
        await sut.save(r, seedAudit)
      }

      const first = await sut.findMany({ limit: 2 })
      const second = await sut.findMany({ limit: 2, cursor: first.nextCursor! })

      const firstIds = first.roles.map((r) => r.id.toString())
      const secondIds = second.roles.map((r) => r.id.toString())
      expect(firstIds.some((id) => secondIds.includes(id))).toBe(false)
      for (const id of secondIds) {
        expect(id < firstIds[firstIds.length - 1]).toBe(true)
      }
    })
  })

  describe('save', () => {
    it('persists role with preserved id and permissions (create path)', async () => {
      const id = new UniqueEntityID()
      const role = Role.create(
        {
          name: 'moderator',
          description: 'Can moderate content',
          isSystem: false,
          permissions: ['admin:users', 'admin:roles'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        id,
      )

      await sut.save(role, seedAudit)

      const persisted = await prisma.role.findUnique({
        where: { id: id.toString() },
        include: { permissions: true },
      })
      expect(persisted).not.toBeNull()
      expect(persisted!.id).toBe(id.toString())
      expect(persisted!.name).toBe('moderator')
      expect(persisted!.description).toBe('Can moderate content')
      expect(persisted!.permissions.map((p) => p.permission)).toEqual(
        expect.arrayContaining(['admin:users', 'admin:roles']),
      )
    })

    it('updates name and replaces permissions (update path)', async () => {
      const role = makeRole({ name: 'editor', permissions: ['view:dashboard'] })
      await sut.save(role, seedAudit)

      role.updateName('senior-editor')
      role.setPermissions(['admin:users', 'admin:roles', 'view:dashboard'])
      await sut.save(role, { actorUserId: 'seed', action: 'role.update', resourceType: 'role' })

      const persisted = await prisma.role.findUnique({
        where: { id: role.id.toString() },
        include: { permissions: true },
      })
      expect(persisted!.name).toBe('senior-editor')
      expect(persisted!.permissions).toHaveLength(3)
      expect(persisted!.permissions.map((p) => p.permission)).toEqual(
        expect.arrayContaining(['admin:users', 'admin:roles', 'view:dashboard']),
      )
    })

    it('persiste audit event junto com o save (create path)', async () => {
      const role = makeRole({ name: 'audited-role' })

      await sut.save(role, {
        actorUserId: 'actor-99',
        action: 'role.create',
        resourceType: 'role',
        resourceId: role.id.toString(),
      })

      const event = await prisma.auditEvent.findFirst({ where: { actorUserId: 'actor-99' } })
      expect(event).not.toBeNull()
      expect(event!.action).toBe('role.create')
    })

    it('persiste audit event junto com o save (update path)', async () => {
      const role = makeRole({ name: 'role-to-update' })
      await sut.save(role, seedAudit)
      await prisma.auditEvent.deleteMany()

      role.updateName('updated-role')
      await sut.save(role, {
        actorUserId: 'actor-77',
        action: 'role.update',
        resourceType: 'role',
        resourceId: role.id.toString(),
      })

      const event = await prisma.auditEvent.findFirst({ where: { actorUserId: 'actor-77' } })
      expect(event).not.toBeNull()
      expect(event!.action).toBe('role.update')
    })
  })

  describe('delete', () => {
    it('removes role and its permissions in cascade', async () => {
      const role = makeRole({ permissions: ['admin:users'] })
      await sut.save(role, seedAudit)

      await sut.delete(role.id.toString(), {
        actorUserId: 'actor-1',
        action: 'role.delete',
        resourceType: 'role',
        resourceId: role.id.toString(),
      })

      const persisted = await prisma.role.findUnique({ where: { id: role.id.toString() } })
      expect(persisted).toBeNull()

      const permissions = await prisma.rolePermission.findMany({
        where: { roleId: role.id.toString() },
      })
      expect(permissions).toHaveLength(0)
    })

    it('persiste audit event junto com o delete', async () => {
      const role = makeRole()
      await sut.save(role, seedAudit)
      await prisma.auditEvent.deleteMany()

      await sut.delete(role.id.toString(), {
        actorUserId: 'actor-delete',
        action: 'role.delete',
        resourceType: 'role',
        resourceId: role.id.toString(),
      })

      const event = await prisma.auditEvent.findFirst({ where: { actorUserId: 'actor-delete' } })
      expect(event).not.toBeNull()
      expect(event!.action).toBe('role.delete')
    })

    it('persiste o metadata do audit quando informado', async () => {
      const role = makeRole()
      await sut.save(role, seedAudit)
      await prisma.auditEvent.deleteMany()

      await sut.delete(role.id.toString(), {
        actorUserId: 'actor-delete',
        action: 'role.delete',
        resourceType: 'role',
        resourceId: role.id.toString(),
        metadata: { name: role.name },
      })

      const event = await prisma.auditEvent.findFirst({ where: { actorUserId: 'actor-delete' } })
      expect(event!.metadata).toEqual({ name: role.name })
    })
  })

  describe('countAssignedUsers', () => {
    it('returns 0 when no assignments exist', async () => {
      const role = makeRole()
      await sut.save(role, seedAudit)

      const count = await sut.countAssignedUsers(role.id.toString())

      expect(count).toBe(0)
    })

    it('returns correct count with assignments', async () => {
      const role = makeRole()
      await sut.save(role, seedAudit)

      await prisma.userRoleAssignment.create({
        data: { userId: await createTestUser(prisma), roleId: role.id.toString() },
      })
      await prisma.userRoleAssignment.create({
        data: { userId: await createTestUser(prisma), roleId: role.id.toString() },
      })

      const count = await sut.countAssignedUsers(role.id.toString())

      expect(count).toBe(2)
    })
  })

  describe('countAssignedUsersMany', () => {
    it('agrupa as contagens por role em uma única consulta', async () => {
      const roleA = makeRole({ name: `role-${randomUUID()}` })
      const roleB = makeRole({ name: `role-${randomUUID()}` })
      await sut.save(roleA, seedAudit)
      await sut.save(roleB, seedAudit)
      await prisma.userRoleAssignment.create({
        data: { userId: await createTestUser(prisma), roleId: roleA.id.toString() },
      })
      await prisma.userRoleAssignment.create({
        data: { userId: await createTestUser(prisma), roleId: roleA.id.toString() },
      })

      const map = await sut.countAssignedUsersMany([roleA.id.toString(), roleB.id.toString()])

      expect(map.get(roleA.id.toString())).toBe(2)
      expect(map.has(roleB.id.toString())).toBe(false)
    })

    it('retorna mapa vazio para lista de ids vazia', async () => {
      const map = await sut.countAssignedUsersMany([])

      expect(map.size).toBe(0)
    })
  })
})
