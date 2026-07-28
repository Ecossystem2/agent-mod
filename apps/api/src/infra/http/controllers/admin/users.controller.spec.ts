import { APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import { makeUser } from '@test/factories'
import request from 'supertest'
import { describe, beforeEach, afterAll, it, expect, vi } from 'vitest'

import { UsersController } from './users.controller'

import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common'

import { left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/not-allowed-error'
import { CannotDeleteSelfError } from '@/domain/application/use-cases/errors/cannot-delete-self-error'
import { EmailAlreadyInUseError } from '@/domain/application/use-cases/errors/email-already-in-use-error'
import { LastAdminError } from '@/domain/application/use-cases/errors/last-admin-error'
import { ProtectedUserError } from '@/domain/application/use-cases/errors/protected-user-error'
import { UserNotFoundError } from '@/domain/application/use-cases/errors/user-not-found-error'
import { CreateAdminUserUseCase } from '@/domain/application/use-cases/users/create-admin-user-use-case'
import { DeactivateUserUseCase } from '@/domain/application/use-cases/users/deactivate-user-use-case'
import { DeleteUserUseCase } from '@/domain/application/use-cases/users/delete-user-use-case'
import { ListUsersUseCase } from '@/domain/application/use-cases/users/list-users-use-case'
import { ReactivateUserUseCase } from '@/domain/application/use-cases/users/reactivate-user-use-case'
import { SetUserPasswordUseCase } from '@/domain/application/use-cases/users/set-user-password-use-case'
import { UpdateUserUseCase } from '@/domain/application/use-cases/users/update-user-use-case'


const mockActor = { id: 'actor-1', email: 'actor@test.com', name: 'Actor', emailVerified: true, permissions: ['admin:users'] }

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


describe(UsersController.name, () => {
  let app: INestApplication
  const listUsers = { execute: vi.fn() }
  const createAdminUser = { execute: vi.fn() }
  const updateUser = { execute: vi.fn() }
  const deleteUser = { execute: vi.fn() }
  const deactivateUser = { execute: vi.fn() }
  const reactivateUser = { execute: vi.fn() }
  const setUserPassword = { execute: vi.fn() }

  beforeEach(async () => {
    vi.clearAllMocks()
    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: APP_GUARD, useClass: MockAuthGuard },
        { provide: APP_GUARD, useClass: MockPermissionGuard },
        { provide: ListUsersUseCase, useValue: listUsers },
        { provide: CreateAdminUserUseCase, useValue: createAdminUser },
        { provide: UpdateUserUseCase, useValue: updateUser },
        { provide: DeleteUserUseCase, useValue: deleteUser },
        { provide: DeactivateUserUseCase, useValue: deactivateUser },
        { provide: ReactivateUserUseCase, useValue: reactivateUser },
        { provide: SetUserPasswordUseCase, useValue: setUserPassword },
      ],
    }).compile()

    app = module.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('GET /admin/users', () => {
    it('retorna 200 com lista de usuários e nextCursor', async () => {
      const user = makeUser()
      listUsers.execute.mockResolvedValue(
        right({ users: [{ user, roleIds: ['role-1'] }], nextCursor: 'user-1' }),
      )

      const res = await request(app.getHttpServer()).get('/admin/users')

      expect(res.status).toBe(200)
      expect(res.body.users).toHaveLength(1)
      expect(res.body.users[0].id).toBe('user-1')
      expect(res.body.users[0].roleIds).toEqual(['role-1'])
      expect(res.body.nextCursor).toBe('user-1')
    })

    it('usa cursor e limit do query', async () => {
      listUsers.execute.mockResolvedValue(right({ users: [], nextCursor: null }))

      await request(app.getHttpServer()).get('/admin/users?cursor=abc&limit=10')

      expect(listUsers.execute).toHaveBeenCalledWith({ cursor: 'abc', limit: 10 })
    })

    it('usa default limit=20 e cursor undefined quando query vazio', async () => {
      listUsers.execute.mockResolvedValue(right({ users: [], nextCursor: null }))

      await request(app.getHttpServer()).get('/admin/users')

      expect(listUsers.execute).toHaveBeenCalledWith({ cursor: undefined, limit: 20 })
    })

    it('retorna 400 quando query inválido (limit=200)', async () => {
      const res = await request(app.getHttpServer()).get('/admin/users?limit=200')

      expect(res.status).toBe(400)
    })

    it('repassa erro genérico via fromUseCaseError quando list falha', async () => {
      listUsers.execute.mockResolvedValue(left(new NotAllowedError()))

      const res = await request(app.getHttpServer()).get('/admin/users')

      expect(res.status).toBe(403)
    })
  })

  describe('POST /admin/users', () => {
    it('retorna 201 ao criar usuário', async () => {
      const user = makeUser()
      createAdminUser.execute.mockResolvedValue(right({ user }))

      const res = await request(app.getHttpServer())
        .post('/admin/users')
        .send({ name: 'Test User', email: 'user@test.com', password: 'StrongPass123!' })

      expect(res.status).toBe(201)
      expect(res.body.user.id).toBe('user-1')
    })

    it('retorna 400 quando body inválido (email inválido)', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/users')
        .send({ name: 'Test', email: 'not-an-email', password: 'StrongPass123!' })

      expect(res.status).toBe(400)
    })

    it('retorna 400 quando senha muito curta', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/users')
        .send({ name: 'Test', email: 'user@test.com', password: 'short' })

      expect(res.status).toBe(400)
    })

    it('retorna 400 quando senha não atende política (≥12 chars mas fraca)', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/users')
        .send({ name: 'Test', email: 'user@test.com', password: 'aaaaaaaaaaaa' })

      expect(res.status).toBe(400)
    })

    it('retorna 409 quando email já em uso (EmailAlreadyInUseError)', async () => {
      createAdminUser.execute.mockResolvedValue(left(new EmailAlreadyInUseError('user@test.com')))

      const res = await request(app.getHttpServer())
        .post('/admin/users')
        .send({ name: 'Test', email: 'user@test.com', password: 'StrongPass123!' })

      expect(res.status).toBe(409)
      expect(res.body.error.kind).toBe('EmailAlreadyInUse')
    })

    it('repassa erro genérico via fromUseCaseError no fallback do create', async () => {
      createAdminUser.execute.mockResolvedValue(left(new NotAllowedError()))

      const res = await request(app.getHttpServer())
        .post('/admin/users')
        .send({ name: 'Test', email: 'user@test.com', password: 'StrongPass123!' })

      expect(res.status).toBe(403)
    })
  })

  describe('PATCH /admin/users/:id', () => {
    it('retorna 200 ao atualizar usuário', async () => {
      const user = makeUser()
      updateUser.execute.mockResolvedValue(right({ user }))

      const res = await request(app.getHttpServer())
        .patch('/admin/users/user-1')
        .send({ roleIds: ['role-2'] })

      expect(res.status).toBe(200)
      expect(res.body.user.id).toBe('user-1')
    })

    it('retorna 200 com body vazio (sem roleIds)', async () => {
      const user = makeUser()
      updateUser.execute.mockResolvedValue(right({ user }))

      const res = await request(app.getHttpServer())
        .patch('/admin/users/user-1')
        .send({})

      expect(res.status).toBe(200)
    })

    it('retorna 404 quando usuário não encontrado (UserNotFoundError)', async () => {
      updateUser.execute.mockResolvedValue(left(new UserNotFoundError()))

      const res = await request(app.getHttpServer())
        .patch('/admin/users/nonexistent')
        .send({ roleIds: [] })

      expect(res.status).toBe(404)
    })

    it('retorna 409 quando email já em uso (EmailAlreadyInUseError)', async () => {
      updateUser.execute.mockResolvedValue(left(new EmailAlreadyInUseError('taken@test.com')))

      const res = await request(app.getHttpServer())
        .patch('/admin/users/user-1')
        .send({ email: 'taken@test.com' })

      expect(res.status).toBe(409)
      expect(res.body.error.kind).toBe('EmailAlreadyInUse')
    })

    it('retorna 409 quando é o último admin (LastAdminError)', async () => {
      updateUser.execute.mockResolvedValue(left(new LastAdminError()))

      const res = await request(app.getHttpServer())
        .patch('/admin/users/user-1')
        .send({ roleIds: [] })

      expect(res.status).toBe(409)
      expect(res.body.error.kind).toBe('LastAdmin')
    })

    it('repassa erro genérico via fromUseCaseError no fallback do update', async () => {
      updateUser.execute.mockResolvedValue(left(new NotAllowedError()))

      const res = await request(app.getHttpServer())
        .patch('/admin/users/user-1')
        .send({ roleIds: [] })

      expect(res.status).toBe(403)
    })
  })

  describe('DELETE /admin/users/:id', () => {
    it('retorna 200 ao remover usuário', async () => {
      deleteUser.execute.mockResolvedValue(right(null))

      const res = await request(app.getHttpServer()).delete('/admin/users/user-2')

      expect(res.status).toBe(200)
      expect(res.body).toEqual({})
    })

    it('retorna 404 quando usuário não encontrado (UserNotFoundError)', async () => {
      deleteUser.execute.mockResolvedValue(left(new UserNotFoundError()))

      const res = await request(app.getHttpServer()).delete('/admin/users/nonexistent')

      expect(res.status).toBe(404)
    })

    it('retorna 409 quando usuário é protegido (ProtectedUserError)', async () => {
      deleteUser.execute.mockResolvedValue(left(new ProtectedUserError('user-1')))

      const res = await request(app.getHttpServer()).delete('/admin/users/user-1')

      expect(res.status).toBe(409)
      expect(res.body.error.kind).toBe('ProtectedUser')
    })

    it('retorna 400 quando tentando excluir a si mesmo (CannotDeleteSelfError)', async () => {
      deleteUser.execute.mockResolvedValue(left(new CannotDeleteSelfError()))

      const res = await request(app.getHttpServer()).delete('/admin/users/actor-1')

      expect(res.status).toBe(400)
      expect(res.body.error.kind).toBe('CannotDeleteSelf')
    })

    it('retorna 409 quando é o último admin (LastAdminError)', async () => {
      deleteUser.execute.mockResolvedValue(left(new LastAdminError()))

      const res = await request(app.getHttpServer()).delete('/admin/users/user-1')

      expect(res.status).toBe(409)
      expect(res.body.error.kind).toBe('LastAdmin')
    })

    it('repassa erro genérico via fromUseCaseError no fallback do delete', async () => {
      deleteUser.execute.mockResolvedValue(left(new NotAllowedError()))

      const res = await request(app.getHttpServer()).delete('/admin/users/user-1')

      expect(res.status).toBe(403)
    })
  })

  describe('PATCH /admin/users/:id/deactivate', () => {
    it('retorna 200 ao desativar usuário normal', async () => {
      deactivateUser.execute.mockResolvedValue(right(null))

      const res = await request(app.getHttpServer()).patch('/admin/users/user-1/deactivate')

      expect(res.status).toBe(200)
      expect(res.body).toEqual({})
    })

    it('retorna 409 quando o usuário é protegido (ProtectedUserError)', async () => {
      deactivateUser.execute.mockResolvedValue(left(new ProtectedUserError('user-1')))

      const res = await request(app.getHttpServer()).patch('/admin/users/user-1/deactivate')

      expect(res.status).toBe(409)
      expect(res.body.error.kind).toBe('ProtectedUser')
    })

    it('retorna 404 quando usuário não encontrado (UserNotFoundError)', async () => {
      deactivateUser.execute.mockResolvedValue(left(new UserNotFoundError()))

      const res = await request(app.getHttpServer()).patch('/admin/users/nonexistent/deactivate')

      expect(res.status).toBe(404)
      expect(res.body.error.kind).toBe('UserNotFound')
    })

    it('retorna 400 quando ator tenta desativar a si mesmo (CannotDeleteSelfError)', async () => {
      deactivateUser.execute.mockResolvedValue(left(new CannotDeleteSelfError()))

      const res = await request(app.getHttpServer()).patch('/admin/users/actor-1/deactivate')

      expect(res.status).toBe(400)
      expect(res.body.error.kind).toBe('CannotDeleteSelf')
    })

    it('retorna 409 quando é o último admin (LastAdminError)', async () => {
      deactivateUser.execute.mockResolvedValue(left(new LastAdminError()))

      const res = await request(app.getHttpServer()).patch('/admin/users/user-1/deactivate')

      expect(res.status).toBe(409)
      expect(res.body.error.kind).toBe('LastAdmin')
    })

    it('repassa erro genérico via fromUseCaseError no fallback do deactivate', async () => {
      deactivateUser.execute.mockResolvedValue(left(new NotAllowedError()))

      const res = await request(app.getHttpServer()).patch('/admin/users/user-1/deactivate')

      expect(res.status).toBe(403)
    })
  })

  describe('PATCH /admin/users/:id/reactivate', () => {
    it('retorna 200 ao reativar usuário', async () => {
      reactivateUser.execute.mockResolvedValue(right(null))

      const res = await request(app.getHttpServer()).patch('/admin/users/user-1/reactivate')

      expect(res.status).toBe(200)
      expect(res.body).toEqual({})
    })

    it('retorna 404 quando usuário não encontrado (UserNotFoundError)', async () => {
      reactivateUser.execute.mockResolvedValue(left(new UserNotFoundError()))

      const res = await request(app.getHttpServer()).patch('/admin/users/nonexistent/reactivate')

      expect(res.status).toBe(404)
      expect(res.body.error.kind).toBe('UserNotFound')
    })

    it('repassa erro genérico via fromUseCaseError no fallback do reactivate', async () => {
      reactivateUser.execute.mockResolvedValue(left(new NotAllowedError()))

      const res = await request(app.getHttpServer()).patch('/admin/users/user-1/reactivate')

      expect(res.status).toBe(403)
    })
  })

  describe('PATCH /admin/users/:id/password', () => {
    it('retorna 200 ao alterar senha com body válido', async () => {
      setUserPassword.execute.mockResolvedValue(right(null))

      const res = await request(app.getHttpServer())
        .patch('/admin/users/user-1/password')
        .send({ newPassword: 'StrongPass123!' })

      expect(res.status).toBe(200)
      expect(res.body).toEqual({})
    })

    it('retorna 404 quando usuário não encontrado (UserNotFoundError)', async () => {
      setUserPassword.execute.mockResolvedValue(left(new UserNotFoundError()))

      const res = await request(app.getHttpServer())
        .patch('/admin/users/nonexistent/password')
        .send({ newPassword: 'StrongPass123!' })

      expect(res.status).toBe(404)
      expect(res.body.error.kind).toBe('UserNotFound')
    })

    it('retorna 400 quando body inválido (senha muito curta)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/admin/users/user-1/password')
        .send({ newPassword: 'curta' })

      expect(res.status).toBe(400)
    })

    it('retorna 400 quando senha não atende política (≥12 chars mas fraca)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/admin/users/user-1/password')
        .send({ newPassword: 'aaaaaaaaaaaa' })

      expect(res.status).toBe(400)
    })

    it('retorna 400 quando body não tem newPassword', async () => {
      const res = await request(app.getHttpServer())
        .patch('/admin/users/user-1/password')
        .send({})

      expect(res.status).toBe(400)
    })

    it('repassa erro genérico via fromUseCaseError no fallback do password', async () => {
      setUserPassword.execute.mockResolvedValue(left(new NotAllowedError()))

      const res = await request(app.getHttpServer())
        .patch('/admin/users/user-1/password')
        .send({ newPassword: 'StrongPass123!' })

      expect(res.status).toBe(403)
    })
  })
})
