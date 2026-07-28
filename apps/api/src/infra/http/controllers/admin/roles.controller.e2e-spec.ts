import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { RolesController } from './roles.controller'

import type { AppAuth } from '@/infra/auth/auth'
import type { INestApplication } from '@nestjs/common'
import type { PrismaClient } from '@prisma/client'

import { AppModule } from '@/infra/app.module'
import { AUTH_INSTANCE, AuthService } from '@/infra/auth/auth.service'


const mockUser = {
  id: 'test-actor',
  email: 'test@example.com',
  name: 'Test',
  emailVerified: true,
  permissions: ['admin:roles', 'admin:users'],
}

describe(RolesController.name + ' (e2e)', () => {
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
    await prisma.user.deleteMany()
  })

  describe('GET /api/admin/roles', () => {
    it('retorna 200 com lista vazia', async () => {
      const res = await request(app.getHttpServer()).get('/api/admin/roles')

      expect(res.status).toBe(200)
      expect(res.body.roles).toEqual([])
      expect(res.body.nextCursor).toBeNull()
    })

    it('retorna 200 com roles criadas', async () => {
      await prisma.role.create({
        data: { id: 'role-e2e-1', name: 'Admin', isSystem: false, createdAt: new Date(), updatedAt: new Date() },
      })

      const res = await request(app.getHttpServer()).get('/api/admin/roles')

      expect(res.status).toBe(200)
      expect(res.body.roles).toHaveLength(1)
      expect(res.body.roles[0].id).toBe('role-e2e-1')
      expect(res.body).toHaveProperty('nextCursor')
    })
  })

  describe('POST /api/admin/roles', () => {
    it('retorna 201 ao criar role com body válido', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/roles')
        .send({ name: 'Gerente', permissions: ['admin:users'] })

      expect(res.status).toBe(201)
      expect(res.body.role.name).toBe('Gerente')
    })

    it('retorna 409 quando nome já existe', async () => {
      await prisma.role.create({
        data: { id: 'role-dup', name: 'Duplicado', isSystem: false, createdAt: new Date(), updatedAt: new Date() },
      })

      const res = await request(app.getHttpServer())
        .post('/api/admin/roles')
        .send({ name: 'Duplicado' })

      expect(res.status).toBe(409)
      expect(res.body.error.kind).toBe('RoleNameTaken')
    })

    it('retorna 400 quando name está vazio', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/roles')
        .send({ name: '' })

      expect(res.status).toBe(400)
    })
  })

  describe('PATCH /api/admin/roles/:id', () => {
    it('retorna 200 ao atualizar role existente', async () => {
      await prisma.role.create({
        data: { id: 'role-upd', name: 'Original', isSystem: false, createdAt: new Date(), updatedAt: new Date() },
      })

      const res = await request(app.getHttpServer())
        .patch('/api/admin/roles/role-upd')
        .send({ name: 'Atualizado' })

      expect(res.status).toBe(200)
      expect(res.body.role.name).toBe('Atualizado')
    })

    it('retorna 404 quando role não existe', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/admin/roles/inexistente')
        .send({ name: 'X' })

      expect(res.status).toBe(404)
      expect(res.body.error.kind).toBe('RoleNotFound')
    })

    it('retorna 409 quando role é de sistema', async () => {
      await prisma.role.create({
        data: { id: 'role-system', name: 'System Role', isSystem: true, createdAt: new Date(), updatedAt: new Date() },
      })

      const res = await request(app.getHttpServer())
        .patch('/api/admin/roles/role-system')
        .send({ name: 'Tentativa de alterar' })

      expect(res.status).toBe(409)
      expect(res.body.error.kind).toBe('RoleIsSystem')
    })
  })

  describe('DELETE /api/admin/roles/:id', () => {
    it('retorna 200 ao remover role existente', async () => {
      await prisma.role.create({
        data: { id: 'role-del', name: 'Deletavel', isSystem: false, createdAt: new Date(), updatedAt: new Date() },
      })

      const res = await request(app.getHttpServer()).delete('/api/admin/roles/role-del')

      expect(res.status).toBe(200)
      expect(res.body).toEqual({})
    })

    it('retorna 404 quando role não existe', async () => {
      const res = await request(app.getHttpServer()).delete('/api/admin/roles/inexistente')

      expect(res.status).toBe(404)
      expect(res.body.error.kind).toBe('RoleNotFound')
    })

    it('retorna 409 quando role é de sistema', async () => {
      await prisma.role.create({
        data: { id: 'role-sys-del', name: 'System Del', isSystem: true, createdAt: new Date(), updatedAt: new Date() },
      })

      const res = await request(app.getHttpServer()).delete('/api/admin/roles/role-sys-del')

      expect(res.status).toBe(409)
      expect(res.body.error.kind).toBe('RoleIsSystem')
    })

    it('retorna 409 quando role tem usuários atribuídos (RoleInUse)', async () => {
      await prisma.role.create({
        data: { id: 'role-inuse', name: 'InUse Role', isSystem: false, createdAt: new Date(), updatedAt: new Date() },
      })
      await prisma.user.create({
        data: { id: 'user-with-role', email: 'wrl@test.com', name: 'With Role', emailVerified: false, createdAt: new Date(), updatedAt: new Date() },
      })
      await prisma.userRoleAssignment.create({ data: { userId: 'user-with-role', roleId: 'role-inuse' } })

      const res = await request(app.getHttpServer()).delete('/api/admin/roles/role-inuse')

      expect(res.status).toBe(409)
      expect(res.body.error.kind).toBe('RoleInUse')
    })
  })
})
