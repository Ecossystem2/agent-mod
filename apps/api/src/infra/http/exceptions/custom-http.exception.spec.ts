import { HttpStatus } from '@nestjs/common'
import { describe, expect, it } from 'vitest'

import { CustomHttpException } from './custom-http.exception'

import { NotAllowedError } from '@/core/errors/not-allowed-error'
import { ResourceAlreadyExistsError } from '@/core/errors/resource-already-exists-error'
import { ResourceNotFoundError } from '@/core/errors/resource-not-found-error'
import { UnexpectedError } from '@/core/errors/unexpected-error'
import { UseCaseError } from '@/core/errors/use-case-error'


class GenericUseCaseError extends UseCaseError<'generic'> {
  readonly kind = 'generic' as const
}

describe('CustomHttpException', () => {
  it('monta o corpo padronizado', () => {
    const sut = new CustomHttpException('x', 'msg', HttpStatus.CONFLICT, { a: 1 })

    expect(sut.kind).toBe('x')
    expect(sut.details).toEqual({ a: 1 })
    expect(sut.getStatus()).toBe(HttpStatus.CONFLICT)
    expect(sut.getResponse()).toEqual({ error: { kind: 'x', message: 'msg', details: { a: 1 } } })
  })

  describe('fromUseCaseError', () => {
    it('mapeia ResourceNotFoundError para 404', () => {
      const sut = CustomHttpException.fromUseCaseError(new ResourceNotFoundError())

      expect(sut.getStatus()).toBe(HttpStatus.NOT_FOUND)
      expect(sut.kind).toBe('resource-not-found')
    })

    it('mapeia NotAllowedError para 403', () => {
      const sut = CustomHttpException.fromUseCaseError(new NotAllowedError())

      expect(sut.getStatus()).toBe(HttpStatus.FORBIDDEN)
    })

    it('mapeia ResourceAlreadyExistsError para 409', () => {
      const sut = CustomHttpException.fromUseCaseError(new ResourceAlreadyExistsError())

      expect(sut.getStatus()).toBe(HttpStatus.CONFLICT)
    })

    it('mapeia erro genérico para 400', () => {
      const sut = CustomHttpException.fromUseCaseError(new GenericUseCaseError('falhou'))

      expect(sut.getStatus()).toBe(HttpStatus.BAD_REQUEST)
      expect(sut.kind).toBe('generic')
    })

    it('mapeia UnexpectedError para 500 com mensagem genérica', () => {
      const sut = CustomHttpException.fromUseCaseError(new UnexpectedError(new Error('detalhe interno')))

      expect(sut.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR)
      expect(sut.kind).toBe('UnexpectedError')
      expect((sut.getResponse() as { error: { message: string } }).error.message).toBe(
        'Ocorreu um erro inesperado.',
      )
    })
  })

  describe('factories', () => {
    it('badRequest', () => {
      const sut = CustomHttpException.badRequest('inválido', [{ path: 'x' }])

      expect(sut.kind).toBe('bad-request')
      expect(sut.getStatus()).toBe(HttpStatus.BAD_REQUEST)
      expect(sut.details).toEqual([{ path: 'x' }])
    })

    it('unauthorized usa mensagem default', () => {
      const sut = CustomHttpException.unauthorized()

      expect(sut.kind).toBe('unauthorized')
      expect(sut.getStatus()).toBe(HttpStatus.UNAUTHORIZED)
    })

    it('forbidden aceita mensagem custom', () => {
      const sut = CustomHttpException.forbidden('bloqueado')

      expect(sut.kind).toBe('forbidden')
      expect(sut.getStatus()).toBe(HttpStatus.FORBIDDEN)
      expect((sut.getResponse() as { error: { message: string } }).error.message).toBe('bloqueado')
    })
  })
})
