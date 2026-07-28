import { APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import { makeRole } from '@test/factories'
import request from 'supertest'
import { describe, beforeEach, afterAll, it, expect, vi } from 'vitest'

import { RolesController } from './roles.controller'

import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common'

import { left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/not-allowed-error'
import { RoleInUseError } from '@/domain/application/use-cases/errors/role-in-use-error'
import { RoleIsSystemError } from '@/domain/application/use-cases/errors/role-is-system-error'
import { RoleNameTakenError } from '@/domain/application/use-cases/errors/role-name-taken-error'
import { RoleNotFoundError } from '@/domain/application/use-cases/errors/role-not-found-error'
import { CreateRoleUseCase } from '@/domain/application/use-cases/roles/create-role-use-case'
import { DeleteRoleUseCase } from '@/domain/application/use-cases/roles/delete-role-use-case'
import { ListRolesUseCase } from '@/domain/application/use-cases/roles/list-roles-use-case'
import { UpdateRoleUseCase } from '@/domain/application/use-cases/roles/update-role-use-case'


const mockActor = { id: 'actor-1', email: 'actor@test.com', name: 'Actor', emailVerified: true, permissions: ['admin:roles'] }

class MockAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest()
    req.user = mockActor
    return true
  }
}

class MockPermissionGuard implements CanActivate {
  canActivate(): boolean {
    return true
  }
}


describe(RolesController.name, () => {
  let app: INestApplication
  const listRoles = { execute: vi.fn() }
  const createRole = { execute: vi.fn() }
  const updateRole = { execute: vi.fn() }
  const deleteRole = { execute: vi.fn() }

  beforeEach(async () => {
    vi.clearAllMocks()
    const module = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        { provide: APP_GUARD, useClass: MockAuthGuard },
        { provide: APP_GUARD, useClass: MockPermissionGuard },
        { provide: ListRolesUseCase, useValue: listRoles },
        { provide: CreateRoleUseCase, useValue: createRole },
        { provide: UpdateRoleUseCase, useValue: updateRole },
        { provide: DeleteRoleUseCase, useValue: deleteRole },
      ],
    }).compile()

    app = module.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('GET /admin/roles', () => {
    it('retorna 200 com lista de cargos e nextCursor', async () => {
      const role = makeRole()
      listRoles.execute.mockResolvedValue(
        right({ roles: [{ role, assignedUserCount: 3 }], nextCursor: 'role-1' }),
      )

      const res = await request(app.getHttpServer()).get('/admin/roles')

      expect(res.status).toBe(200)
      expect(res.body.roles).toHaveLength(1)
      expect(res.body.roles[0].id).toBe('role-1')
      expect(res.body.roles[0].assignedUserCount).toBe(3)
      expect(res.body.nextCursor).toBe('role-1')
    })

    it('usa cursor e limit do query', async () => {
      listRoles.execute.mockResolvedValue(right({ roles: [], nextCursor: null }))

      await request(app.getHttpServer()).get('/admin/roles?cursor=xyz&limit=5')

      expect(listRoles.execute).toHaveBeenCalledWith({ cursor: 'xyz', limit: 5 })
    })

    it('usa default limit=20 e cursor undefined quando query vazio', async () => {
      listRoles.execute.mockResolvedValue(right({ roles: [], nextCursor: null }))

      await request(app.getHttpServer()).get('/admin/roles')

      expect(listRoles.execute).toHaveBeenCalledWith({ cursor: undefined, limit: 20 })
    })

    it('retorna 400 quando query inválido (limit=0)', async () => {
      const res = await request(app.getHttpServer()).get('/admin/roles?limit=0')

      expect(res.status).toBe(400)
    })

    it('repassa erro genérico via fromUseCaseError quando list falha', async () => {
      listRoles.execute.mockResolvedValue(left(new NotAllowedError()))

      const res = await request(app.getHttpServer()).get('/admin/roles')

      expect(res.status).toBe(403)
    })
  })

  describe('POST /admin/roles', () => {
    it('retorna 201 ao criar cargo', async () => {
      const role = makeRole()
      createRole.execute.mockResolvedValue(right({ role }))

      const res = await request(app.getHttpServer())
        .post('/admin/roles')
        .send({ name: 'Admin', permissions: ['admin:users'] })

      expect(res.status).toBe(201)
      expect(res.body.role.id).toBe('role-1')
      expect(res.body.role.assignedUserCount).toBe(0)
    })

    it('retorna 400 quando body inválido (name vazio)', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/roles')
        .send({ name: '' })

      expect(res.status).toBe(400)
    })

    it('retorna 400 quando permissão inválida (fora do catálogo)', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/roles')
        .send({ name: 'Teste', permissions: ['permissao:invalida'] })

      expect(res.status).toBe(400)
    })

    it('retorna 409 quando nome já existe (RoleNameTakenError)', async () => {
      createRole.execute.mockResolvedValue(left(new RoleNameTakenError('Admin')))

      const res = await request(app.getHttpServer())
        .post('/admin/roles')
        .send({ name: 'Admin' })

      expect(res.status).toBe(409)
      expect(res.body.error.kind).toBe('RoleNameTaken')
    })

    it('repassa erro genérico via fromUseCaseError no fallback do create', async () => {
      createRole.execute.mockResolvedValue(left(new NotAllowedError()))

      const res = await request(app.getHttpServer())
        .post('/admin/roles')
        .send({ name: 'Admin' })

      expect(res.status).toBe(403)
    })
  })

  describe('PATCH /admin/roles/:id', () => {
    it('retorna 200 ao atualizar cargo', async () => {
      const role = makeRole({ name: 'Updated' })
      updateRole.execute.mockResolvedValue(right({ role }))

      const res = await request(app.getHttpServer())
        .patch('/admin/roles/role-1')
        .send({ name: 'Updated' })

      expect(res.status).toBe(200)
      expect(res.body.role.name).toBe('Updated')
    })

    it('retorna 404 quando cargo não encontrado (RoleNotFoundError)', async () => {
      updateRole.execute.mockResolvedValue(left(new RoleNotFoundError()))

      const res = await request(app.getHttpServer())
        .patch('/admin/roles/nonexistent')
        .send({ name: 'X' })

      expect(res.status).toBe(404)
    })

    it('retorna 409 quando cargo é de sistema (RoleIsSystemError)', async () => {
      updateRole.execute.mockResolvedValue(left(new RoleIsSystemError()))

      const res = await request(app.getHttpServer())
        .patch('/admin/roles/role-1')
        .send({ name: 'X' })

      expect(res.status).toBe(409)
      expect(res.body.error.kind).toBe('RoleIsSystem')
    })

    it('retorna 409 quando nome já existe (RoleNameTakenError)', async () => {
      updateRole.execute.mockResolvedValue(left(new RoleNameTakenError('Dup')))

      const res = await request(app.getHttpServer())
        .patch('/admin/roles/role-1')
        .send({ name: 'Dup' })

      expect(res.status).toBe(409)
      expect(res.body.error.kind).toBe('RoleNameTaken')
    })

    it('retorna 400 quando body inválido (name vazio)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/admin/roles/role-1')
        .send({ name: '' })

      expect(res.status).toBe(400)
    })

    it('repassa erro genérico via fromUseCaseError no fallback do update', async () => {
      updateRole.execute.mockResolvedValue(left(new NotAllowedError()))

      const res = await request(app.getHttpServer())
        .patch('/admin/roles/role-1')
        .send({ name: 'X' })

      expect(res.status).toBe(403)
    })
  })

  describe('DELETE /admin/roles/:id', () => {
    it('retorna 200 ao remover cargo', async () => {
      deleteRole.execute.mockResolvedValue(right(null))

      const res = await request(app.getHttpServer()).delete('/admin/roles/role-1')

      expect(res.status).toBe(200)
      expect(res.body).toEqual({})
    })

    it('retorna 404 quando cargo não encontrado (RoleNotFoundError)', async () => {
      deleteRole.execute.mockResolvedValue(left(new RoleNotFoundError()))

      const res = await request(app.getHttpServer()).delete('/admin/roles/nonexistent')

      expect(res.status).toBe(404)
    })

    it('retorna 409 quando cargo é de sistema (RoleIsSystemError)', async () => {
      deleteRole.execute.mockResolvedValue(left(new RoleIsSystemError()))

      const res = await request(app.getHttpServer()).delete('/admin/roles/role-1')

      expect(res.status).toBe(409)
      expect(res.body.error.kind).toBe('RoleIsSystem')
    })

    it('retorna 409 quando cargo está em uso (RoleInUseError)', async () => {
      deleteRole.execute.mockResolvedValue(left(new RoleInUseError(5)))

      const res = await request(app.getHttpServer()).delete('/admin/roles/role-1')

      expect(res.status).toBe(409)
      expect(res.body.error.kind).toBe('RoleInUse')
    })

    it('repassa erro genérico via fromUseCaseError no fallback do delete', async () => {
      deleteRole.execute.mockResolvedValue(left(new NotAllowedError()))

      const res = await request(app.getHttpServer()).delete('/admin/roles/role-1')

      expect(res.status).toBe(403)
    })
  })
})
