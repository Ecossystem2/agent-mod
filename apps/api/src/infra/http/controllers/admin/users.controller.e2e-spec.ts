import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { UsersController } from './users.controller'

import type { AppAuth } from '@/infra/auth/auth'
import type { INestApplication } from '@nestjs/common'
import type { PrismaClient } from '@prisma/client'

import { AppModule } from '@/infra/app.module'
import { AUTH_INSTANCE, AuthService } from '@/infra/auth/auth.service'


const ACTOR_ID = 'test-actor'

const mockUser = {
  id: ACTOR_ID,
  email: 'test@example.com',
  name: 'Test',
  emailVerified: true,
  permissions: ['admin:roles', 'admin:users'],
}

describe(UsersController.name + ' (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaClient

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthService)
      .useFactory({
        factory: (authInstance: AppAuth) => ({
          getSession: () =>
            Promise.resolve({
              user: {
                id: mockUser.id,
                email: mockUser.email,
                name: mockUser.name,
                emailVerified: mockUser.emailVerified,
              },
              permissions: mockUser.permissions,
            }),
          api: authInstance.api,
          instance: authInstance,
        }),
        inject: [AUTH_INSTANCE],
      })
      .compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    await app.init()

    prisma = globalThis.__E2E_PRISMA__!
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    await prisma.userRoleAssignment.deleteMany()
    await prisma.rolePermission.deleteMany()
    await prisma.role.deleteMany()
    await prisma.auditEvent.deleteMany()
    await prisma.session.deleteMany()
    await prisma.account.deleteMany()
    await prisma.user.deleteMany()
  })

  async function createUser(overrides?: Partial<{ id: string; email: string; name: string }>) {
    return prisma.user.create({
      data: {
        id: overrides?.id ?? 'user-1',
        email: overrides?.email ?? 'u1@test.com',
        name: overrides?.name ?? 'User One',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
  }

  describe('GET /api/admin/users', () => {
    it('retorna 200 com lista de usuários', async () => {
      await createUser()

      const res = await request(app.getHttpServer()).get('/api/admin/users')

      expect(res.status).toBe(200)
      expect(res.body.users).toHaveLength(1)
      expect(res.body).toHaveProperty('nextCursor')
    })

    it('retorna 200 com lista vazia e nextCursor null quando não há usuários', async () => {
      const res = await request(app.getHttpServer()).get('/api/admin/users')

      expect(res.status).toBe(200)
      expect(res.body.users).toHaveLength(0)
      expect(res.body.nextCursor).toBeNull()
    })
  })

  describe('POST /api/admin/users', () => {
    it('retorna 201 ao criar usuário com dados válidos', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/users')
        .send({ name: 'Novo Usuario', email: 'novo@test.com', password: 'senha-segura-12' })

      expect(res.status).toBe(201)
      expect(res.body.user.email).toBe('novo@test.com')
    })

    it('retorna 409 ao criar usuário com e-mail já existente', async () => {
      await createUser({ email: 'duplicado@test.com' })

      const res = await request(app.getHttpServer())
        .post('/api/admin/users')
        .send({ name: 'Outro', email: 'duplicado@test.com', password: 'senha-segura-12' })

      expect(res.status).toBe(409)
      expect(res.body.error.kind).toBe('EmailAlreadyInUse')
    })

    it('retorna 400 ao criar usuário com body inválido (senha curta)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/users')
        .send({ name: 'X', email: 'x@test.com', password: 'curta' })

      expect(res.status).toBe(400)
    })
  })

  describe('PATCH /api/admin/users/:id', () => {
    it('retorna 200 ao atualizar roleIds do usuário', async () => {
      const role = await prisma.role.create({
        data: { id: 'role-1', name: 'Admin', isSystem: false, createdAt: new Date(), updatedAt: new Date() },
      })
      await createUser()

      const res = await request(app.getHttpServer())
        .patch('/api/admin/users/user-1')
        .send({ roleIds: [role.id] })

      expect(res.status).toBe(200)
      expect(res.body.user.roleIds).toContain(role.id)
    })

    it('retorna 404 quando usuário não existe', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/admin/users/inexistente')
        .send({ roleIds: [] })

      expect(res.status).toBe(404)
      expect(res.body.error.kind).toBe('UserNotFound')
    })
  })

  describe('PATCH /api/admin/users/:id/deactivate', () => {
    it('retorna 200 ao desativar usuário existente', async () => {
      await createUser({ id: 'user-to-deactivate', email: 'deactivate@test.com' })

      const res = await request(app.getHttpServer()).patch('/api/admin/users/user-to-deactivate/deactivate')

      expect(res.status).toBe(200)
      expect(res.body).toEqual({})

      const persisted = await prisma.user.findUnique({ where: { id: 'user-to-deactivate' } })
      expect(persisted!.isActive).toBe(false)
    })

    it('retorna 409 ao tentar desativar usuário protegido', async () => {
      await prisma.user.create({
        data: {
          id: 'protected-user',
          email: 'protected@test.com',
          name: 'Protected',
          emailVerified: false,
          isProtected: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      const res = await request(app.getHttpServer()).patch('/api/admin/users/protected-user/deactivate')

      expect(res.status).toBe(409)
      expect(res.body.error.kind).toBe('ProtectedUser')
    })

    it('retorna 404 quando usuário não existe', async () => {
      const res = await request(app.getHttpServer()).patch('/api/admin/users/inexistente/deactivate')

      expect(res.status).toBe(404)
      expect(res.body.error.kind).toBe('UserNotFound')
    })
  })

  describe('PATCH /api/admin/users/:id/reactivate', () => {
    it('retorna 200 ao reativar usuário inativo', async () => {
      await prisma.user.create({
        data: {
          id: 'inactive-user',
          email: 'inactive@test.com',
          name: 'Inactive',
          emailVerified: false,
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      const res = await request(app.getHttpServer()).patch('/api/admin/users/inactive-user/reactivate')

      expect(res.status).toBe(200)
      expect(res.body).toEqual({})

      const persisted = await prisma.user.findUnique({ where: { id: 'inactive-user' } })
      expect(persisted!.isActive).toBe(true)
    })

    it('retorna 404 quando usuário não existe', async () => {
      const res = await request(app.getHttpServer()).patch('/api/admin/users/inexistente/reactivate')

      expect(res.status).toBe(404)
      expect(res.body.error.kind).toBe('UserNotFound')
    })
  })

  describe('PATCH /api/admin/users/:id/password', () => {
    it('retorna 200 e troca a senha + grava audit atomicamente no DB', async () => {
      await createUser({ id: 'user-pass', email: 'pass@test.com' })
      await prisma.account.create({
        data: {
          id: 'account-pass',
          userId: 'user-pass',
          accountId: 'user-pass',
          providerId: 'credential',
          password: 'old-hash',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      const before = await prisma.account.findFirst({
        where: { userId: 'user-pass', providerId: 'credential' },
      })

      const res = await request(app.getHttpServer())
        .patch('/api/admin/users/user-pass/password')
        .send({ newPassword: 'StrongPass123!' })

      expect(res.status).toBe(200)
      expect(res.body).toEqual({})

      const after = await prisma.account.findFirst({
        where: { userId: 'user-pass', providerId: 'credential' },
      })
      expect(after!.password).not.toBeNull()
      expect(after!.password).not.toBe(before!.password)

      const auditCount = await prisma.auditEvent.count({
        where: { resourceId: 'user-pass', action: 'user.set_password' },
      })
      expect(auditCount).toBe(1)
    })

    it('faz rollback da troca de senha quando o insert de audit falha (transação real)', async () => {
      const schema = globalThis.__E2E_SCHEMA__!
      await createUser({ id: 'user-rollback', email: 'rollback@test.com' })
      await prisma.account.create({
        data: {
          id: 'account-rollback',
          userId: 'user-rollback',
          accountId: 'user-rollback',
          providerId: 'credential',
          password: 'original-hash',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      // Força falha REAL no insert de audit dentro do $transaction via CHECK constraint
      // no Postgres real — exercita o rollback de verdade (sem mock de $transaction).
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "${schema}"."audit_events" ADD CONSTRAINT audit_block_set_password CHECK (action <> 'user.set_password')`,
      )

      try {
        const res = await request(app.getHttpServer())
          .patch('/api/admin/users/user-rollback/password')
          .send({ newPassword: 'StrongPass123!' })

        expect(res.status).toBe(500)

        const after = await prisma.account.findFirst({
          where: { userId: 'user-rollback', providerId: 'credential' },
        })
        expect(after!.password).toBe('original-hash')

        const auditCount = await prisma.auditEvent.count({
          where: { resourceId: 'user-rollback', action: 'user.set_password' },
        })
        expect(auditCount).toBe(0)
      } finally {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "${schema}"."audit_events" DROP CONSTRAINT audit_block_set_password`,
        )
      }
    })

    it('retorna 404 quando usuário não existe', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/admin/users/inexistente/password')
        .send({ newPassword: 'StrongPass123!' })

      expect(res.status).toBe(404)
      expect(res.body.error.kind).toBe('UserNotFound')
    })

    it('retorna 400 quando newPassword tem menos de 12 caracteres', async () => {
      await createUser({ id: 'user-shortpw', email: 'shortpw@test.com' })

      const res = await request(app.getHttpServer())
        .patch('/api/admin/users/user-shortpw/password')
        .send({ newPassword: 'curta' })

      expect(res.status).toBe(400)
    })
  })

  describe('DELETE /api/admin/users/:id', () => {
    it('retorna 200 ao deletar usuário existente diferente do ator', async () => {
      await createUser({ id: ACTOR_ID, email: 'test@example.com', name: 'Test' })
      await createUser({ id: 'user-to-delete', email: 'todelete@test.com', name: 'To Delete' })

      // Cria role com permissão admin para o ator — garantindo que não é o único admin
      const role = await prisma.role.create({
        data: { id: 'role-admin', name: 'Admin', isSystem: false, createdAt: new Date(), updatedAt: new Date() },
      })
      await prisma.rolePermission.create({ data: { roleId: role.id, permission: 'admin:users' } })
      await prisma.userRoleAssignment.create({ data: { userId: ACTOR_ID, roleId: role.id } })
      await prisma.userRoleAssignment.create({ data: { userId: 'user-to-delete', roleId: role.id } })

      const res = await request(app.getHttpServer()).delete('/api/admin/users/user-to-delete')

      expect(res.status).toBe(200)
      expect(res.body).toEqual({})

      const deleted = await prisma.user.findUnique({ where: { id: 'user-to-delete' } })
      expect(deleted).toBeNull()
    })

    it('retorna 400 ao tentar deletar a si mesmo', async () => {
      await createUser({ id: ACTOR_ID, email: 'test@example.com', name: 'Test' })

      const res = await request(app.getHttpServer()).delete(`/api/admin/users/${ACTOR_ID}`)

      expect(res.status).toBe(400)
      expect(res.body.error.kind).toBe('CannotDeleteSelf')
    })

    it('retorna 404 quando usuário não existe', async () => {
      const res = await request(app.getHttpServer()).delete('/api/admin/users/inexistente')

      expect(res.status).toBe(404)
      expect(res.body.error.kind).toBe('UserNotFound')
    })

    it('retorna 409 quando é o último admin (LastAdminError)', async () => {
      await createUser({ id: 'only-admin', email: 'only@test.com', name: 'Only Admin' })
      await prisma.role.create({
        data: { id: 'role-only-admin', name: 'SoloAdmin', isSystem: false, createdAt: new Date(), updatedAt: new Date() },
      })
      await prisma.rolePermission.create({ data: { roleId: 'role-only-admin', permission: 'admin:users' } })
      await prisma.userRoleAssignment.create({ data: { userId: 'only-admin', roleId: 'role-only-admin' } })

      const res = await request(app.getHttpServer()).delete('/api/admin/users/only-admin')

      expect(res.status).toBe(409)
      expect(res.body.error.kind).toBe('LastAdmin')
    })
  })
})
