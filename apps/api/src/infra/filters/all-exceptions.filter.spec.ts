import { HttpException, HttpStatus, Logger, type ArgumentsHost } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AllExceptionsFilter } from './all-exceptions.filter'

function makeHost() {
  const json = vi.fn()
  const status = vi.fn().mockReturnValue({ json })
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
    }),
  } as unknown as ArgumentsHost

  return { host, status, json }
}

describe('AllExceptionsFilter', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('repassa HttpException com corpo objeto', () => {
    const sut = new AllExceptionsFilter()
    const { host, status, json } = makeHost()
    const exception = new HttpException({ error: { kind: 'x', message: 'y' } }, HttpStatus.CONFLICT)

    sut.catch(exception, host)

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT)
    expect(json).toHaveBeenCalledWith({ error: { kind: 'x', message: 'y' } })
  })

  it('loga server-side quando HttpException tem status >= 500', () => {
    const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    const sut = new AllExceptionsFilter()
    const { host, status, json } = makeHost()
    const exception = new HttpException(
      { error: { kind: 'UnexpectedError', message: 'Ocorreu um erro inesperado.' } },
      HttpStatus.INTERNAL_SERVER_ERROR,
    )

    sut.catch(exception, host)

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
    expect(json).toHaveBeenCalledWith({
      error: { kind: 'UnexpectedError', message: 'Ocorreu um erro inesperado.' },
    })
    expect(errorSpy).toHaveBeenCalledOnce()
  })

  it('envelopa HttpException com corpo string', () => {
    const sut = new AllExceptionsFilter()
    const { host, status, json } = makeHost()
    const exception = new HttpException('plain message', HttpStatus.BAD_REQUEST)

    sut.catch(exception, host)

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
    expect(json).toHaveBeenCalledWith({ error: { message: 'plain message' } })
  })

  it('trata erro genérico como 500 sem vazar stack e loga', () => {
    const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    const sut = new AllExceptionsFilter()
    const { host, status, json } = makeHost()
    const exception = new Error('boom')

    sut.catch(exception, host)

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
    expect(json).toHaveBeenCalledWith({
      error: {
        kind: 'internal-error',
        message: 'Erro interno. Tente novamente em alguns instantes.',
      },
    })
    expect(errorSpy).toHaveBeenCalledWith('Unhandled: boom', exception.stack)
  })

  it('lida com exceção não-Error sem mensagem nem stack', () => {
    const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    const sut = new AllExceptionsFilter()
    const { host, status } = makeHost()

    sut.catch(null, host)

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
    expect(errorSpy).toHaveBeenCalledWith('Unhandled: unknown', undefined)
  })
})
