import { makeUser } from '@test/factories'
import { InMemoryUserRepository } from '@test/repositories/in-memory-user-repository'
import { InMemoryUserRoleAssignmentRepository } from '@test/repositories/in-memory-user-role-assignment-repository'
import { beforeEach, describe, expect, it } from 'vitest'

import { CannotDeleteSelfError } from '../errors/cannot-delete-self-error'
import { LastAdminError } from '../errors/last-admin-error'
import { ProtectedUserError } from '../errors/protected-user-error'
import { UserNotFoundError } from '../errors/user-not-found-error'

import { DeactivateUserUseCase } from './deactivate-user-use-case'

import { UnexpectedError } from '@/core/errors/unexpected-error'

describe(DeactivateUserUseCase.name, () => {
  let userRepo: InMemoryUserRepository
  let assignmentRepo: InMemoryUserRoleAssignmentRepository
  let sut: DeactivateUserUseCase

  beforeEach(() => {
    userRepo = new InMemoryUserRepository()
    assignmentRepo = new InMemoryUserRoleAssignmentRepository()
    sut = new DeactivateUserUseCase(userRepo, assignmentRepo)
  })

  it('retorna UserNotFoundError quando o alvo não existe', async () => {
    const result = await sut.execute({
      targetUserId: 'inexistente',
      actorUserId: 'actor-1',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UserNotFoundError)
  })

  it('retorna CannotDeleteSelfError quando targetUserId === actorUserId', async () => {
    const user = makeUser({ id: 'actor-1', email: 'actor-1@example.com', isActive: true })
    userRepo.users.push(user)

    const result = await sut.execute({
      targetUserId: 'actor-1',
      actorUserId: 'actor-1',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(CannotDeleteSelfError)
  })

  it('retorna ProtectedUserError quando o usuário é protegido', async () => {
    const user = makeUser({ id: 'user-1', email: 'user-1@example.com', isProtected: true })
    userRepo.users.push(user)

    const result = await sut.execute({
      targetUserId: 'user-1',
      actorUserId: 'actor-1',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ProtectedUserError)
  })

  it('retorna LastAdminError quando o alvo é o único admin', async () => {
    const user = makeUser({ id: 'user-1', email: 'user-1@example.com', isActive: true })
    userRepo.users.push(user)
    assignmentRepo._rolePermissions.set('role-admin', ['admin:users'])
    await assignmentRepo.replaceAll('user-1', ['role-admin'], {
      actorUserId: 'seed',
      action: 'user.update',
      resourceType: 'user',
    })

    const result = await sut.execute({
      targetUserId: 'user-1',
      actorUserId: 'actor-1',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(LastAdminError)
  })

  it('desativa usuário ativo com sucesso e persiste no repositório', async () => {
    const user = makeUser({ id: 'user-1', email: 'user-1@example.com', isActive: true, isProtected: false })
    userRepo.users.push(user)

    const result = await sut.execute({
      targetUserId: 'user-1',
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    expect(result.value).toBeNull()

    const persisted = await userRepo.findById('user-1')
    expect(persisted!.isActive).toBe(false)
  })

  it('grava auditoria após desativar usuário', async () => {
    const user = makeUser({ id: 'user-1', email: 'user-1@example.com', isActive: true })
    userRepo.users.push(user)

    await sut.execute({ targetUserId: 'user-1', actorUserId: 'actor-1' })

    expect(userRepo.auditEvents).toHaveLength(1)
    expect(userRepo.auditEvents[0].action).toBe('user.deactivate')
    expect(userRepo.auditEvents[0].actorUserId).toBe('actor-1')
    expect(userRepo.auditEvents[0].resourceId).toBe('user-1')
  })

  it('é idempotente — desativar usuário já inativo retorna right(null)', async () => {
    const user = makeUser({ id: 'user-1', email: 'user-1@example.com', isActive: false, isProtected: false })
    userRepo.users.push(user)

    const result = await sut.execute({
      targetUserId: 'user-1',
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    expect(result.value).toBeNull()

    const persisted = await userRepo.findById('user-1')
    expect(persisted!.isActive).toBe(false)
  })

  it('retorna UnexpectedError quando userRepo.save lança erro', async () => {
    const user = makeUser({ id: 'user-1', email: 'user-1@example.com', isActive: true })
    userRepo.users.push(user)
    userRepo.shouldFailOnSave = true

    const result = await sut.execute({ targetUserId: 'user-1', actorUserId: 'actor-1' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnexpectedError)
    expect(userRepo.auditEvents).toHaveLength(0)
  })

  it('permite desativar admin quando há múltiplos admins', async () => {
    const user1 = makeUser({ id: 'user-1', email: 'user-1@example.com', isActive: true })
    const user2 = makeUser({ id: 'user-2', email: 'user-2@example.com', isActive: true })
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
      targetUserId: 'user-1',
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    const persisted = await userRepo.findById('user-1')
    expect(persisted!.isActive).toBe(false)
  })
})
