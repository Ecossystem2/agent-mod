import { Logger } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { NoopMailProvider } from './noop-mail-provider'

describe('NoopMailProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loga warn com destinatário único', async () => {
    const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    const sut = new NoopMailProvider()

    await sut.send({ to: 'ada@example.com', subject: 'Olá' })

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('ada@example.com'))
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Olá'))
  })

  it('loga warn juntando array de destinatários', async () => {
    const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    const sut = new NoopMailProvider()

    await sut.send({ to: ['a@x.com', 'b@x.com'], subject: 'Multi' })

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('a@x.com, b@x.com'))
  })
})
