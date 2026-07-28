import { describe, expect, it, vi } from 'vitest'

import { BetterAuthSetPasswordAdapter } from './better-auth-set-password.adapter'

import type { AuditEventInput } from '@/domain/application/repositories/audit-event-repository'
import type { PrismaService } from '@/infra/database/prisma/prisma.service'

vi.mock('better-auth/crypto', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
}))

const audit: AuditEventInput = {
  actorUserId: 'actor-1',
  action: 'user.set_password',
  resourceType: 'user',
  resourceId: 'user-1',
}

function makePrisma(updateManyResult: { count: number }) {
  const updateManyMock = vi.fn().mockResolvedValue(updateManyResult)
  const auditCreateMock = vi.fn().mockResolvedValue(undefined)
  const tx = {
    account: { updateMany: updateManyMock },
    auditEvent: { create: auditCreateMock },
  }
  const prisma = {
    $transaction: vi.fn(async (cb: (tx: typeof tx) => Promise<void>) => cb(tx)),
  } as unknown as PrismaService
  return { prisma, updateManyMock, auditCreateMock }
}

describe(BetterAuthSetPasswordAdapter.name, () => {
  it('hash a senha e atualiza o account credential dentro de uma transação', async () => {
    const { hashPassword } = await import('better-auth/crypto')
    const { prisma, updateManyMock } = makePrisma({ count: 1 })
    const sut = new BetterAuthSetPasswordAdapter(prisma)

    await sut.setPassword('user-1', 'nova-senha', audit)

    expect(hashPassword).toHaveBeenCalledWith('nova-senha')
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { userId: 'user-1', providerId: 'credential' },
      data: { password: 'hashed-password' },
    })
  })

  it('persiste o audit event atomicamente com a troca de senha', async () => {
    const { prisma, auditCreateMock } = makePrisma({ count: 1 })
    const sut = new BetterAuthSetPasswordAdapter(prisma)

    await sut.setPassword('user-1', 'nova-senha', audit)

    expect(auditCreateMock).toHaveBeenCalledWith({
      data: {
        actorUserId: 'actor-1',
        action: 'user.set_password',
        resourceType: 'user',
        resourceId: 'user-1',
        metadata: undefined,
      },
    })
  })

  it('persiste metadata do audit quando informado', async () => {
    const { prisma, auditCreateMock } = makePrisma({ count: 1 })
    const sut = new BetterAuthSetPasswordAdapter(prisma)

    await sut.setPassword('user-1', 'nova-senha', { ...audit, metadata: { reason: 'reset' } })

    expect(auditCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ metadata: { reason: 'reset' } }) }),
    )
  })

  it('usa o userId correto ao atualizar a conta', async () => {
    const { prisma, updateManyMock } = makePrisma({ count: 1 })
    const sut = new BetterAuthSetPasswordAdapter(prisma)

    await sut.setPassword('another-user-id', 'qualquer-senha', { ...audit, resourceId: 'another-user-id' })

    expect(updateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'another-user-id' }) }),
    )
  })

  it('lança erro e não grava audit quando nenhuma conta credential é encontrada', async () => {
    const { prisma, auditCreateMock } = makePrisma({ count: 0 })
    const sut = new BetterAuthSetPasswordAdapter(prisma)

    await expect(sut.setPassword('user-sem-conta', 'qualquer-senha', audit)).rejects.toThrow(
      'No credential account found for user "user-sem-conta"',
    )
    expect(auditCreateMock).not.toHaveBeenCalled()
  })
})
