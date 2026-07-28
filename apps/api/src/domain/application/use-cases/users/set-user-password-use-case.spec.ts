import { makeUser } from '@test/factories'
import { InMemoryUserRepository } from '@test/repositories/in-memory-user-repository'
import { beforeEach, describe, expect, it } from 'vitest'

import { UserNotFoundError } from '../errors/user-not-found-error'

import { SetUserPasswordUseCase } from './set-user-password-use-case'

import type { AuditEventInput } from '@/domain/application/repositories/audit-event-repository'

import { UnexpectedError } from '@/core/errors/unexpected-error'
import { SetPasswordPort } from '@/domain/application/ports/set-password-port'

class FakeSetPasswordPort extends SetPasswordPort {
  calls: { userId: string; newPassword: string; audit: AuditEventInput }[] = []
  shouldFail = false

  async setPassword(userId: string, newPassword: string, audit: AuditEventInput): Promise<void> {
    if (this.shouldFail) throw new Error('setPassword failed')
    this.calls.push({ userId, newPassword, audit })
  }
}

describe(SetUserPasswordUseCase.name, () => {
  let userRepo: InMemoryUserRepository
  let setPasswordPort: FakeSetPasswordPort
  let sut: SetUserPasswordUseCase

  beforeEach(() => {
    userRepo = new InMemoryUserRepository()
    setPasswordPort = new FakeSetPasswordPort()
    sut = new SetUserPasswordUseCase(userRepo, setPasswordPort)
  })

  it('retorna UserNotFoundError quando o alvo não existe', async () => {
    const result = await sut.execute({
      targetUserId: 'inexistente',
      newPassword: 'nova-senha-123',
      actorUserId: 'actor-1',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UserNotFoundError)
  })

  it('delega ao SetPasswordPort com userId, newPassword e audit corretos', async () => {
    const user = makeUser({ id: 'user-1', email: 'user-1@example.com' })
    userRepo.users.push(user)

    const result = await sut.execute({
      targetUserId: 'user-1',
      newPassword: 'nova-senha-segura',
      actorUserId: 'actor-1',
    })

    expect(result.isRight()).toBe(true)
    expect(result.value).toBeNull()
    expect(setPasswordPort.calls).toHaveLength(1)
    expect(setPasswordPort.calls[0].userId).toBe('user-1')
    expect(setPasswordPort.calls[0].newPassword).toBe('nova-senha-segura')
    expect(setPasswordPort.calls[0].audit.action).toBe('user.set_password')
    expect(setPasswordPort.calls[0].audit.actorUserId).toBe('actor-1')
    expect(setPasswordPort.calls[0].audit.resourceId).toBe('user-1')
  })

  it('retorna UnexpectedError quando SetPasswordPort lança erro', async () => {
    const user = makeUser({ id: 'user-1', email: 'user-1@example.com' })
    userRepo.users.push(user)
    setPasswordPort.shouldFail = true

    const result = await sut.execute({
      targetUserId: 'user-1',
      newPassword: 'nova-senha',
      actorUserId: 'actor-1',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnexpectedError)
  })
})
