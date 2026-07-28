import { makeUser } from '@test/factories'
import { InMemoryCacheRepository } from '@test/repositories/in-memory-cache-repository'
import { InMemoryUserRepository } from '@test/repositories/in-memory-user-repository'
import { InMemoryUserRoleAssignmentRepository } from '@test/repositories/in-memory-user-role-assignment-repository'
import { beforeEach, describe, expect, it } from 'vitest'

import { EmailAlreadyInUseError } from '../errors/email-already-in-use-error'
import { LastAdminError } from '../errors/last-admin-error'
import { UserNotFoundError } from '../errors/user-not-found-error'

import { UpdateUserUseCase } from './update-user-use-case'

import { UnexpectedError } from '@/core/errors/unexpected-error'
import { permissionsCacheKey } from '@/domain/application/cache/permissions-cache'

describe(UpdateUserUseCase.name, () => {
  let userRepo: InMemoryUserRepository
  let assignmentRepo: InMemoryUserRoleAssignmentRepository
  let cache: InMemoryCacheRepository
  let sut: UpdateUserUseCase

  beforeEach(() => {
    userRepo = new InMemoryUserRepository()
    assignmentRepo = new InMemoryUserRoleAssignmentRepository()
    cache = new InMemoryCacheRepository()
    userRepo.assignmentRepo = assignmentRepo
    sut = new UpdateUserUseCase(userRepo, assignmentRepo, cache)
  })

  it('retorna UserNotFoundError quando usuário não existe', async () => {
    const result = await sut.execute({
      userId: 'inexistente',
      actorUserId: 'actor-1',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UserNotFoundError)
  })

  it('atualiza roles do usuário com sucesso', async () => {
    const user = makeUser({ id: 'user-1', email: 'user-1@example.com' })
    userRepo.users.push(user)

    const result = await sut.execute({
      userId: 'user-1',
      roleIds: ['role-admin', 'role-gestor'],
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    const roleIds = await assignmentRepo.findRoleIdsByUserId('user-1')
    expect(roleIds).toEqual(expect.arrayContaining(['role-admin', 'role-gestor']))
  })

  it('substitui roles existentes ao atualizar', async () => {
    const user = makeUser({ id: 'user-1', email: 'user-1@example.com' })
    userRepo.users.push(user)
    await assignmentRepo.replaceAll('user-1', ['role-antigo'], {
      actorUserId: 'seed',
      action: 'user.update',
      resourceType: 'user',
    })

    await sut.execute({
      userId: 'user-1',
      roleIds: ['role-novo'],
      actorUserId: 'actor-1',
    })

    const roleIds = await assignmentRepo.findRoleIdsByUserId('user-1')
    expect(roleIds).toEqual(['role-novo'])
    expect(roleIds).not.toContain('role-antigo')
  })

  it('não altera roles quando roleIds não informado', async () => {
    const user = makeUser({ id: 'user-1', email: 'user-1@example.com' })
    userRepo.users.push(user)
    await assignmentRepo.replaceAll('user-1', ['role-existente'], {
      actorUserId: 'seed',
      action: 'user.update',
      resourceType: 'user',
    })

    await sut.execute({
      userId: 'user-1',
      actorUserId: 'actor-1',
    })

    const roleIds = await assignmentRepo.findRoleIdsByUserId('user-1')
    expect(roleIds).toEqual(['role-existente'])
  })

  it('retorna o usuário atualizado', async () => {
    const user = makeUser({ id: 'user-1', email: 'user-1@example.com' })
    userRepo.users.push(user)

    const result = await sut.execute({
      userId: 'user-1',
      roleIds: ['role-admin'],
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    expect(result.value.user.id.toString()).toBe('user-1')
  })

  it('retorna LastAdminError ao remover roles do único admin', async () => {
    const user = makeUser({ id: 'user-1', email: 'user-1@example.com' })
    userRepo.users.push(user)
    assignmentRepo._rolePermissions.set('role-admin', ['admin:users'])
    await assignmentRepo.replaceAll('user-1', ['role-admin'], {
      actorUserId: 'seed',
      action: 'user.update',
      resourceType: 'user',
    })

    const result = await sut.execute({
      userId: 'user-1',
      roleIds: [],
      actorUserId: 'actor-999',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(LastAdminError)
  })

  it('permite atualizar roles de admin quando há múltiplos admins', async () => {
    const user1 = makeUser({ id: 'user-1', email: 'user-1@example.com' })
    const user2 = makeUser({ id: 'user-2', email: 'user-2@example.com' })
    userRepo.users.push(user1, user2)
    assignmentRepo._rolePermissions.set('role-admin', ['admin:users'])
    await assignmentRepo.replaceAll('user-1', ['role-admin'], {
      actorUserId: 'seed',
      action: 'user.update',
      resourceType: 'user',
    })
    await assignmentRepo.replaceAll('user-2', ['role-admin'], {
      actorUserId: 'seed',
      action: 'user.update',
      resourceType: 'user',
    })

    const result = await sut.execute({
      userId: 'user-1',
      roleIds: [],
      actorUserId: 'actor-999',
    })

    expect(result.isRight()).toBe(true)
  })

  it('grava auditoria após atualizar usuário', async () => {
    const user = makeUser({ id: 'user-1', email: 'user-1@example.com' })
    userRepo.users.push(user)

    const result = await sut.execute({
      userId: 'user-1',
      roleIds: ['role-x'],
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    expect(assignmentRepo.auditEvents).toHaveLength(1)
    expect(assignmentRepo.auditEvents[0].action).toBe('user.update')
    expect(assignmentRepo.auditEvents[0].actorUserId).toBe('actor-1')
  })

  it('retorna os roleIds atualizados na entidade sem recarregar do repositório', async () => {
    const user = makeUser({ id: 'user-1', email: 'user-1@example.com' })
    userRepo.users.push(user)

    const result = await sut.execute({
      userId: 'user-1',
      roleIds: ['role-novo-a', 'role-novo-b'],
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect([...result.value.user.roleIds]).toEqual(['role-novo-a', 'role-novo-b'])
    }
  })

  it('falha na operação inteira quando assignmentRepo lança erro (atomicidade)', async () => {
    const user = makeUser({ id: 'user-1', email: 'user-1@example.com' })
    userRepo.users.push(user)
    assignmentRepo.shouldFailOnReplaceAll = true

    const result = await sut.execute({ userId: 'user-1', roleIds: ['role-x'], actorUserId: 'actor-1' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnexpectedError)
    expect(assignmentRepo.auditEvents).toHaveLength(0)
  })

  it('atualiza name do usuário com sucesso', async () => {
    const user = makeUser({ id: 'user-1', name: 'Nome Antigo', email: 'user-1@example.com' })
    userRepo.users.push(user)

    const result = await sut.execute({
      userId: 'user-1',
      name: 'Nome Novo',
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    const persisted = await userRepo.findById('user-1')
    expect(persisted!.name).toBe('Nome Novo')
    expect(userRepo.auditEvents).toHaveLength(1)
    expect(userRepo.auditEvents[0].action).toBe('user.update')
  })

  it('atualiza email do usuário com sucesso', async () => {
    const user = makeUser({ id: 'user-1', email: 'antigo@example.com' })
    userRepo.users.push(user)

    const result = await sut.execute({
      userId: 'user-1',
      email: 'novo@example.com',
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    const persisted = await userRepo.findById('user-1')
    expect(persisted!.email).toBe('novo@example.com')
  })

  it('retorna EmailAlreadyInUseError quando email já pertence a outro usuário', async () => {
    const user1 = makeUser({ id: 'user-1', email: 'user1@example.com' })
    const user2 = makeUser({ id: 'user-2', email: 'user2@example.com' })
    userRepo.users.push(user1, user2)

    const result = await sut.execute({
      userId: 'user-1',
      email: 'user2@example.com',
      actorUserId: 'actor-1',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(EmailAlreadyInUseError)
  })

  it('permite atualizar email para o mesmo email atual do usuário', async () => {
    const user = makeUser({ id: 'user-1', email: 'mesmo@example.com' })
    userRepo.users.push(user)

    const result = await sut.execute({
      userId: 'user-1',
      email: 'mesmo@example.com',
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
  })

  it('invalida o cache de permissões do usuário quando roleIds muda', async () => {
    const user = makeUser({ id: 'user-1', email: 'user-1@example.com' })
    userRepo.users.push(user)

    const result = await sut.execute({
      userId: 'user-1',
      roleIds: ['role-x'],
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    expect(cache.deletedKeys).toContain(permissionsCacheKey('user-1'))
  })

  it('não invalida o cache de permissões quando roleIds não é informado', async () => {
    const user = makeUser({ id: 'user-1', email: 'user-1@example.com' })
    userRepo.users.push(user)

    const result = await sut.execute({
      userId: 'user-1',
      name: 'Novo Nome',
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    expect(cache.deletedKeys).toHaveLength(0)
  })
})
