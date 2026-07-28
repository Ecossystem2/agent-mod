import { makeUser } from '@test/factories'
import { InMemoryUserRepository } from '@test/repositories/in-memory-user-repository'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UserNotFoundError } from '../errors/user-not-found-error'

import { ReactivateUserUseCase } from './reactivate-user-use-case'

import { UnexpectedError } from '@/core/errors/unexpected-error'

describe(ReactivateUserUseCase.name, () => {
  let userRepo: InMemoryUserRepository
  let sut: ReactivateUserUseCase

  beforeEach(() => {
    userRepo = new InMemoryUserRepository()
    sut = new ReactivateUserUseCase(userRepo)
  })

  it('retorna UserNotFoundError quando o alvo não existe', async () => {
    const result = await sut.execute({
      targetUserId: 'inexistente',
      actorUserId: 'actor-1',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UserNotFoundError)
  })

  it('reativa usuário inativo com sucesso e persiste no repositório', async () => {
    const user = makeUser({ id: 'user-1', email: 'user-1@example.com', isActive: false })
    userRepo.users.push(user)

    const result = await sut.execute({
      targetUserId: 'user-1',
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    expect(result.value).toBeNull()

    const persisted = await userRepo.findById('user-1')
    expect(persisted!.isActive).toBe(true)
  })

  it('grava auditoria após reativar usuário', async () => {
    const user = makeUser({ id: 'user-1', email: 'user-1@example.com', isActive: false })
    userRepo.users.push(user)

    await sut.execute({ targetUserId: 'user-1', actorUserId: 'actor-1' })

    expect(userRepo.auditEvents).toHaveLength(1)
    expect(userRepo.auditEvents[0].action).toBe('user.reactivate')
    expect(userRepo.auditEvents[0].actorUserId).toBe('actor-1')
    expect(userRepo.auditEvents[0].resourceId).toBe('user-1')
  })

  it('é idempotente — reativar usuário já ativo retorna right(null) sem chamar save ou auditoria', async () => {
    const user = makeUser({ id: 'user-1', email: 'user-1@example.com', isActive: true })
    userRepo.users.push(user)

    const saveSpy = vi.spyOn(userRepo, 'saveWithAudit')

    const result = await sut.execute({
      targetUserId: 'user-1',
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    expect(result.value).toBeNull()
    expect(saveSpy).not.toHaveBeenCalled()
    expect(userRepo.auditEvents).toHaveLength(0)

    const persisted = await userRepo.findById('user-1')
    expect(persisted!.isActive).toBe(true)
  })

  it('retorna UnexpectedError quando userRepo.save lança erro', async () => {
    const user = makeUser({ id: 'user-1', email: 'user-1@example.com', isActive: false })
    userRepo.users.push(user)
    userRepo.shouldFailOnSave = true

    const result = await sut.execute({ targetUserId: 'user-1', actorUserId: 'actor-1' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnexpectedError)
    expect(userRepo.auditEvents).toHaveLength(0)
  })
})
