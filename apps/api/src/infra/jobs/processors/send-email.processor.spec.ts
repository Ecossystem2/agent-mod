import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'


import { SEND_EMAIL_JOB, type SendEmailJobData } from './send-email.job'
import { SendEmailProcessor } from './send-email.processor'

import type { MailProvider } from '@/domain/application/providers/mail-provider'
import type { RedisService } from '@/infra/cache/redis/redis.service'
import type { DeadLetterService } from '@/infra/jobs/dead-letter.service'
import type { Job } from 'bullmq'

type JobProcessor = (job: Job<SendEmailJobData>) => Promise<{ sent: boolean }>

let capturedProcessor: JobProcessor | undefined
const mockOn = vi.fn()
const mockClose = vi.fn().mockResolvedValue(undefined)

vi.mock('bullmq', () => {
  class MockWorker {
    on = mockOn
    close = mockClose
    constructor(_queue: string, processor: JobProcessor) {
      capturedProcessor = processor
    }
  }
  return { Worker: MockWorker }
})

function makeJob(override: Partial<SendEmailJobData> = {}): Job<SendEmailJobData> {
  return {
    data: {
      to: 'user@example.com',
      subject: 'Bem-vindo',
      html: '<p>Olá!</p>',
      ...override,
    },
  } as unknown as Job<SendEmailJobData>
}

describe(SendEmailProcessor.name, () => {
  let sut: SendEmailProcessor
  let mail: { send: ReturnType<typeof vi.fn> }
  let dlq: { record: ReturnType<typeof vi.fn> }
  let connection: { quit: ReturnType<typeof vi.fn> }
  let redis: { duplicate: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()
    capturedProcessor = undefined
    mockClose.mockResolvedValue(undefined)

    mail = { send: vi.fn().mockResolvedValue(undefined) }
    dlq = { record: vi.fn().mockResolvedValue(undefined) }
    connection = { quit: vi.fn().mockResolvedValue(undefined) }
    redis = { duplicate: vi.fn().mockReturnValue(connection) }

    sut = new SendEmailProcessor(
      mail as unknown as MailProvider,
      redis as unknown as RedisService,
      dlq as unknown as DeadLetterService,
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exporta SEND_EMAIL_JOB como constante de string', () => {
    expect(SEND_EMAIL_JOB).toBe('send-email')
  })

  it('onModuleInit cria o Worker com conexão dedicada e registra handler de failed', () => {
    sut.onModuleInit()

    expect(redis.duplicate).toHaveBeenCalledOnce()
    expect(mockOn).toHaveBeenCalledWith('failed', expect.any(Function))
  })

  it('onModuleDestroy fecha o Worker e a conexão dedicada', async () => {
    sut.onModuleInit()
    await sut.onModuleDestroy()

    expect(mockClose).toHaveBeenCalled()
    expect(connection.quit).toHaveBeenCalledOnce()
  })

  it('callback de job processa e delega para process()', async () => {
    sut.onModuleInit()
    expect(capturedProcessor).toBeDefined()

    const job = makeJob()
    const result = await capturedProcessor!(job)

    expect(mail.send).toHaveBeenCalled()
    expect(result).toEqual({ sent: true })
  })

  it('handler failed chama dlq.record quando job está definido', async () => {
    sut.onModuleInit()

    const [[, failedHandler]] = mockOn.mock.calls as [[string, (job: Job | undefined, err: Error) => void]]
    const job = makeJob()
    const err = new Error('falha')

    failedHandler(job, err)
    await vi.waitFor(() => expect(dlq.record).toHaveBeenCalled())

    expect(dlq.record).toHaveBeenCalledWith(expect.stringContaining('emails'), job, err)
  })

  it('handler failed não chama dlq.record quando job é undefined', async () => {
    sut.onModuleInit()

    const [[, failedHandler]] = mockOn.mock.calls as [[string, (job: Job | undefined, err: Error) => void]]

    failedHandler(undefined, new Error('falha'))

    expect(dlq.record).not.toHaveBeenCalled()
  })

  it('envia email com sucesso', async () => {
    const job = makeJob()

    const result = await sut.process(job)

    expect(mail.send).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Bem-vindo',
      html: '<p>Olá!</p>',
    })
    expect(result).toEqual({ sent: true })
  })

  it('lança erro quando MailProvider falha', async () => {
    mail.send.mockRejectedValue(new Error('SMTP offline'))
    const job = makeJob()

    await expect(sut.process(job)).rejects.toThrow('SMTP offline')
  })

  it('loga o erro antes de re-throw', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const smtpError = new Error('timeout')
    mail.send.mockRejectedValue(smtpError)
    const job = makeJob()

    await expect(sut.process(job)).rejects.toThrow('timeout')

    expect(errSpy).toHaveBeenCalledWith('[SendEmailProcessor]', smtpError)
  })
})
