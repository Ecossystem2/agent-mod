import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { EnvService } from '@/infra/env/env.service'

const sendMailMock = vi.fn()
const closeMock = vi.fn()
const createTransportMock = vi.fn()

vi.mock('nodemailer', () => ({
  createTransport: (config: unknown) => {
    createTransportMock(config)
    return { sendMail: sendMailMock, close: closeMock }
  },
}))

const { NodemailerMailProvider } = await import('./nodemailer-mail-provider')

function makeEnv(overrides: Record<string, unknown> = {}): EnvService {
  const values: Record<string, unknown> = {
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: 587,
    SMTP_USER: 'user',
    SMTP_PASS: 'pass',
    SMTP_SECURE: false,
    SMTP_FROM: 'no-reply@example.com',
    ...overrides,
  }
  return { get: (key: string) => values[key] } as unknown as EnvService
}

describe('NodemailerMailProvider', () => {
  beforeEach(() => {
    sendMailMock.mockReset().mockResolvedValue(undefined)
    closeMock.mockReset()
    createTransportMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lança quando SMTP_HOST ou SMTP_PORT faltam', () => {
    expect(() => {
      new NodemailerMailProvider(makeEnv({ SMTP_HOST: undefined }))
    }).toThrow('SMTP_HOST and SMTP_PORT are required')
  })

  it('configura auth quando user e pass estão presentes', () => {
    new NodemailerMailProvider(makeEnv())

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: { user: 'user', pass: 'pass' },
      }),
    )
  })

  it('deixa auth undefined sem credenciais', () => {
    new NodemailerMailProvider(makeEnv({ SMTP_USER: undefined }))

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ auth: undefined }),
    )
  })

  it('envia usando o from da mensagem e header de tag', async () => {
    const sut = new NodemailerMailProvider(makeEnv())

    await sut.send({
      to: 'dest@example.com',
      subject: 'Oi',
      from: 'custom@example.com',
      tag: 'welcome',
    })

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'custom@example.com',
        to: 'dest@example.com',
        headers: { 'X-Mail-Tag': 'welcome' },
      }),
    )
  })

  it('usa o defaultFrom quando a mensagem não traz from e sem tag', async () => {
    const sut = new NodemailerMailProvider(makeEnv())

    await sut.send({ to: 'dest@example.com', subject: 'Oi' })

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'no-reply@example.com', headers: undefined }),
    )
  })

  it('lança quando não há from na mensagem nem SMTP_FROM', async () => {
    const sut = new NodemailerMailProvider(makeEnv({ SMTP_FROM: undefined }))

    await expect(sut.send({ to: 'dest@example.com', subject: 'Oi' })).rejects.toThrow(
      'MailMessage.from is required',
    )
  })

  it('onModuleDestroy fecha o transporter', () => {
    const sut = new NodemailerMailProvider(makeEnv())

    sut.onModuleDestroy()

    expect(closeMock).toHaveBeenCalledOnce()
  })
})
