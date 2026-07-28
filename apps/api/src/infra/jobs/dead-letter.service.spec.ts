import { Logger } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'


import { DeadLetterService } from './dead-letter.service'

import type { PrismaService } from '@/infra/database/prisma/prisma.service'
import type { Job } from 'bullmq'


function makeJob(override: Partial<Job> = {}): Job {
  return {
    name: 'send-email',
    data: { foo: 'bar' },
    attemptsMade: 3,
    opts: { attempts: 3 },
    id: 'job-1',
    ...override,
  } as unknown as Job
}

describe('DeadLetterService', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('ignora quando ainda há retries restantes', async () => {
    const create = vi.fn()
    const prisma = { deadLetterJob: { create } } as unknown as PrismaService
    const sut = new DeadLetterService(prisma)

    await sut.record('q', makeJob({ attemptsMade: 1, opts: { attempts: 3 } }), new Error('e'))

    expect(create).not.toHaveBeenCalled()
  })

  it('usa default de 1 tentativa quando opts.attempts não está definido', async () => {
    const create = vi.fn().mockResolvedValue(undefined)
    const prisma = { deadLetterJob: { create } } as unknown as PrismaService
    const sut = new DeadLetterService(prisma)

    await sut.record('q', makeJob({ attemptsMade: 1, opts: {} }), new Error('e'))

    expect(create).toHaveBeenCalledOnce()
  })

  it('grava na DLQ quando esgotou as tentativas e loga warn', async () => {
    const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    const create = vi.fn().mockResolvedValue(undefined)
    const prisma = { deadLetterJob: { create } } as unknown as PrismaService
    const sut = new DeadLetterService(prisma)
    const err = new Error('boom')
    err.stack = 'stack-trace'

    await sut.record('emails', makeJob(), err)

    expect(create).toHaveBeenCalledWith({
      data: {
        queueName: 'emails',
        jobName: 'send-email',
        payload: { foo: 'bar' },
        attempts: 3,
        errorName: 'Error',
        errorMessage: 'boom',
        errorStack: 'stack-trace',
      },
    })
    expect(warnSpy).toHaveBeenCalledOnce()
  })

  it('usa null quando o erro não tem stack', async () => {
    const create = vi.fn().mockResolvedValue(undefined)
    const prisma = { deadLetterJob: { create } } as unknown as PrismaService
    const sut = new DeadLetterService(prisma)
    const err = new Error('boom')
    err.stack = undefined

    await sut.record('emails', makeJob(), err)

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ errorStack: null }) }),
    )
  })

  it('loga error sem relançar quando a escrita na DLQ falha', async () => {
    const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    const dbErr = new Error('db down')
    const create = vi.fn().mockRejectedValue(dbErr)
    const prisma = { deadLetterJob: { create } } as unknown as PrismaService
    const sut = new DeadLetterService(prisma)

    await expect(sut.record('emails', makeJob(), new Error('boom'))).resolves.toBeUndefined()

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Falha ao gravar DLQ'), dbErr)
  })
})
