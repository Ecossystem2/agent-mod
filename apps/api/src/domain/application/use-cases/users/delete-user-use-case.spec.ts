import { makeUser } from '@test/factories'
import { InMemoryCacheRepository } from '@test/repositories/in-memory-cache-repository'
import { InMemoryUserRepository } from '@test/repositories/in-memory-user-repository'
import { InMemoryUserRoleAssignmentRepository } from '@test/repositories/in-memory-user-role-assignment-repository'
import { beforeEach, describe, expect, it } from 'vitest'

import { CannotDeleteSelfError } from '../errors/cannot-delete-self-error'
import { LastAdminError } from '../errors/last-admin-error'
import { ProtectedUserError } from '../errors/protected-user-error'
import { UserNotFoundError } from '../errors/user-not-found-error'

import { DeleteUserUseCase } from './delete-user-use-case'

import { UnexpectedError } from '@/core/errors/unexpected-error'
import { permissionsCacheKey } from '@/domain/application/cache/permissions-cache'

describe(DeleteUserUseCase.name, () => {
  let userRepo: InMemoryUserRepository
  let assignmentRepo: InMemoryUserRoleAssignmentRepository
  let cache: InMemoryCacheRepository
  let sut: DeleteUserUseCase

  beforeEach(() => {
    userRepo = new InMemoryUserRepository()
    assignmentRepo = new InMemoryUserRoleAssignmentRepository()
    cache = new InMemoryCacheRepository()
    sut = new DeleteUserUseCase(userRepo, assignmentRepo, cache)
  })

  it('retorna CannotDeleteSelfError quando ator tenta se excluir', async () => {
    const actor = makeUser({ id: 'actor-1', email: 'actor@example.com' })
    userRepo.users.push(actor)

    const result = await sut.execute({
      userId: 'actor-1',
      actorUserId: 'actor-1',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(CannotDeleteSelfError)
  })

  it('retorna UserNotFoundError quando usuário não existe', async () => {
    const actor = makeUser({ id: 'actor-1', email: 'actor@example.com' })
    userRepo.users.push(actor)
    assignmentRepo._rolePermissions.set('role-admin', ['admin:users'])
    await assignmentRepo.replaceAll('actor-1', ['role-admin'], {
      actorUserId: 'seed',
      action: 'user.update',
      resourceType: 'user',
    })

    const result = await sut.execute({
      userId: 'inexistente',
      actorUserId: 'actor-1',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UserNotFoundError)
  })

  it('retorna ProtectedUserError quando o alvo é um usuário protegido', async () => {
    const protectedUser = makeUser({ id: 'protected-1', email: 'protected@example.com', isProtected: true })
    userRepo.users.push(protectedUser)

    const result = await sut.execute({
      userId: 'protected-1',
      actorUserId: 'other-actor',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ProtectedUserError)
  })

  it('prioriza ProtectedUserError antes de LastAdminError', async () => {
    const protectedAdmin = makeUser({ id: 'admin-1', email: 'admin@example.com', isProtected: true })
    userRepo.users.push(protectedAdmin)
    assignmentRepo._rolePermissions.set('role-admin', ['admin:users', 'admin:roles'])
    await assignmentRepo.replaceAll('admin-1', ['role-admin'], {
      actorUserId: 'seed',
      action: 'user.update',
      resourceType: 'user',
    })

    const result = await sut.execute({
      userId: 'admin-1',
      actorUserId: 'other-actor',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ProtectedUserError)
  })

  it('retorna LastAdminError quando o alvo é o único administrador', async () => {
    const admin = makeUser({ id: 'admin-1', email: 'admin@example.com' })
    userRepo.users.push(admin)
    assignmentRepo._rolePermissions.set('role-admin', ['admin:users', 'admin:roles'])
    await assignmentRepo.replaceAll('admin-1', ['role-admin'], {
      actorUserId: 'seed',
      action: 'user.update',
      resourceType: 'user',
    })

    const result = await sut.execute({
      userId: 'admin-1',
      actorUserId: 'other-actor',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(LastAdminError)
  })

  it('permite deletar usuário não-admin mesmo quando há apenas 1 admin', async () => {
    const admin = makeUser({ id: 'admin-1', email: 'admin@example.com' })
    const target = makeUser({ id: 'user-1', email: 'user@example.com' })
    userRepo.users.push(admin, target)
    assignmentRepo._rolePermissions.set('role-admin', ['admin:users', 'admin:roles'])
    await assignmentRepo.replaceAll('admin-1', ['role-admin'], {
      actorUserId: 'seed',
      action: 'user.update',
      resourceType: 'user',
    })

    const result = await sut.execute({
      userId: 'user-1',
      actorUserId: 'admin-1',
    })

    expect(result.isRight()).toBe(true)
    expect(result.value).toBeNull()
  })

  it('deleta usuário com sucesso quando há múltiplos admins', async () => {
    const admin1 = makeUser({ id: 'admin-1', email: 'admin1@example.com' })
    const admin2 = makeUser({ id: 'admin-2', email: 'admin2@example.com' })
    const target = makeUser({ id: 'user-1', email: 'user@example.com' })
    userRepo.users.push(admin1, admin2, target)
    assignmentRepo._rolePermissions.set('role-admin', ['admin:users', 'admin:roles'])
    await assignmentRepo.replaceAll('admin-1', ['role-admin'], {
      actorUserId: 'seed',
      action: 'user.update',
      resourceType: 'user',
    })
    await assignmentRepo.replaceAll('admin-2', ['role-admin'], {
      actorUserId: 'seed',
      action: 'user.update',
      resourceType: 'user',
    })

    const result = await sut.execute({
      userId: 'user-1',
      actorUserId: 'admin-1',
    })

    expect(result.isRight()).toBe(true)
    expect(result.value).toBeNull()
    expect(userRepo.users).toHaveLength(2)
  })

  it('permite deletar admin quando há múltiplos administradores', async () => {
    const admin1 = makeUser({ id: 'admin-1', email: 'admin1@example.com' })
    const admin2 = makeUser({ id: 'admin-2', email: 'admin2@example.com' })
    userRepo.users.push(admin1, admin2)
    assignmentRepo._rolePermissions.set('role-admin', ['admin:users', 'admin:roles'])
    await assignmentRepo.replaceAll('admin-1', ['role-admin'], {
      actorUserId: 'seed',
      action: 'user.update',
      resourceType: 'user',
    })
    await assignmentRepo.replaceAll('admin-2', ['role-admin'], {
      actorUserId: 'seed',
      action: 'user.update',
      resourceType: 'user',
    })

    const result = await sut.execute({
      userId: 'admin-1',
      actorUserId: 'admin-2',
    })

    expect(result.isRight()).toBe(true)
    expect(result.value).toBeNull()
    expect(userRepo.users).toHaveLength(1)
  })

  it('verifica tanto admin:users quanto admin:roles para contagem de admins', async () => {
    const admin1 = makeUser({ id: 'admin-1', email: 'admin1@example.com' })
    const admin2 = makeUser({ id: 'admin-2', email: 'admin2@example.com' })
    const target = makeUser({ id: 'user-1', email: 'user@example.com' })
    userRepo.users.push(admin1, admin2, target)
    assignmentRepo._rolePermissions.set('role-users', ['admin:users'])
    assignmentRepo._rolePermissions.set('role-roles', ['admin:roles'])
    await assignmentRepo.replaceAll('admin-1', ['role-users'], {
      actorUserId: 'seed',
      action: 'user.update',
      resourceType: 'user',
    })
    await assignmentRepo.replaceAll('admin-2', ['role-roles'], {
      actorUserId: 'seed',
      action: 'user.update',
      resourceType: 'user',
    })

    const result = await sut.execute({
      userId: 'user-1',
      actorUserId: 'admin-1',
    })

    expect(result.isRight()).toBe(true)
  })

  it('retorna UserNotFoundError quando userId=actorUserId mas usuário não existe', async () => {
    // use-case verifica findById antes de CannotDeleteSelf
    const result = await sut.execute({
      userId: 'actor-inexistente',
      actorUserId: 'actor-inexistente',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UserNotFoundError)
  })

  it('grava auditoria após deletar usuário', async () => {
    const admin1 = makeUser({ id: 'admin-1', email: 'admin1@example.com' })
    const admin2 = makeUser({ id: 'admin-2', email: 'admin2@example.com' })
    const target = makeUser({ id: 'user-1', email: 'user@example.com' })
    userRepo.users.push(admin1, admin2, target)
    assignmentRepo._rolePermissions.set('role-admin', ['admin:users', 'admin:roles'])
    await assignmentRepo.replaceAll('admin-1', ['role-admin'], {
      actorUserId: 'seed',
      action: 'user.update',
      resourceType: 'user',
    })
    await assignmentRepo.replaceAll('admin-2', ['role-admin'], {
      actorUserId: 'seed',
      action: 'user.update',
      resourceType: 'user',
    })
    assignmentRepo.auditEvents = []

    const result = await sut.execute({ userId: 'user-1', actorUserId: 'admin-1' })

    expect(result.isRight()).toBe(true)
    expect(userRepo.auditEvents).toHaveLength(1)
    expect(userRepo.auditEvents[0].action).toBe('user.delete')
    expect(userRepo.auditEvents[0].actorUserId).toBe('admin-1')
  })

  it('invalida o cache de permissões do usuário deletado', async () => {
    const admin1 = makeUser({ id: 'admin-1', email: 'admin1@example.com' })
    const admin2 = makeUser({ id: 'admin-2', email: 'admin2@example.com' })
    const target = makeUser({ id: 'user-1', email: 'user@example.com' })
    userRepo.users.push(admin1, admin2, target)
    assignmentRepo._rolePermissions.set('role-admin', ['admin:users', 'admin:roles'])
    await assignmentRepo.replaceAll('admin-1', ['role-admin'], {
      actorUserId: 'seed',
      action: 'user.update',
      resourceType: 'user',
    })
    await assignmentRepo.replaceAll('admin-2', ['role-admin'], {
      actorUserId: 'seed',
      action: 'user.update',
      resourceType: 'user',
    })

    const result = await sut.execute({ userId: 'user-1', actorUserId: 'admin-1' })

    expect(result.isRight()).toBe(true)
    expect(cache.deletedKeys).toContain(permissionsCacheKey('user-1'))
  })

  it('não invalida o cache quando a deleção falha', async () => {
    const target = makeUser({ id: 'user-1', email: 'user@example.com' })
    userRepo.users.push(target)
    userRepo.shouldFailOnDeleteById = true

    const result = await sut.execute({ userId: 'user-1', actorUserId: 'actor-99' })

    expect(result.isLeft()).toBe(true)
    expect(cache.deletedKeys).not.toContain(permissionsCacheKey('user-1'))
  })

  it('falha na operação inteira quando userRepo lança erro (atomicidade)', async () => {
    const target = makeUser({ id: 'user-1', email: 'user@example.com' })
    userRepo.users.push(target)
    userRepo.shouldFailOnDeleteById = true

    const result = await sut.execute({ userId: 'user-1', actorUserId: 'actor-99' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnexpectedError)
    expect(userRepo.users).toHaveLength(1)
    expect(userRepo.auditEvents).toHaveLength(0)
  })
})
