import { describe, expect, it } from 'vitest'

import type { AxiosError } from 'axios'

import { ApiError } from '@/lib/api-error'


function makeAxiosError(partial: Partial<AxiosError>): AxiosError {
  return partial as AxiosError
}

describe('ApiError', () => {
  describe('fromAxiosError', () => {
    it('mapeia o corpo de erro estruturado da API (kind/message/details)', () => {
      const err = makeAxiosError({
        response: {
          status: 400,
          data: {
            error: {
              kind: 'bad-request',
              message: 'Validação falhou',
              details: [{ path: 'email', message: 'E-mail inválido' }],
            },
          },
        } as AxiosError['response'],
      })

      const sut = ApiError.fromAxiosError(err)

      expect(sut.kind).toBe('bad-request')
      expect(sut.message).toBe('Validação falhou')
      expect(sut.status).toBe(400)
      expect(sut.details).toEqual([{ path: 'email', message: 'E-mail inválido' }])
      expect(sut.isValidation).toBe(true)
    })

    it('usa details vazio quando a API não envia details', () => {
      const err = makeAxiosError({
        response: {
          status: 409,
          data: { error: { kind: 'conflict', message: 'Conflito' } },
        } as AxiosError['response'],
      })

      const sut = ApiError.fromAxiosError(err)

      expect(sut.details).toEqual([])
      expect(sut.isConflict).toBe(true)
      expect(sut.isValidation).toBe(false)
    })

    it('mapeia erro de rede quando não há response', () => {
      const sut = ApiError.fromAxiosError(makeAxiosError({ response: undefined }))

      expect(sut.kind).toBe('network-error')
      expect(sut.status).toBe(0)
      expect(sut.isNetworkError).toBe(true)
    })

    it('mapeia 429 como rate-limited', () => {
      const err = makeAxiosError({
        response: { status: 429, data: {} } as AxiosError['response'],
      })

      const sut = ApiError.fromAxiosError(err)

      expect(sut.kind).toBe('rate-limited')
      expect(sut.isRateLimit).toBe(true)
    })

    it('mapeia 5xx como internal-error', () => {
      const err = makeAxiosError({
        response: { status: 503, data: {} } as AxiosError['response'],
      })

      const sut = ApiError.fromAxiosError(err)

      expect(sut.kind).toBe('internal-error')
      expect(sut.isServerError).toBe(true)
    })

    it('cai em unknown-error para 4xx sem corpo estruturado', () => {
      const err = makeAxiosError({
        response: { status: 418, data: {} } as AxiosError['response'],
      })

      const sut = ApiError.fromAxiosError(err)

      expect(sut.kind).toBe('unknown-error')
      expect(sut.status).toBe(418)
    })
  })

  describe('getters de classificação', () => {
    it('reflete corretamente cada faixa de status', () => {
      expect(new ApiError('x', 'm', 404).isNotFound).toBe(true)
      expect(new ApiError('x', 'm', 403).isForbidden).toBe(true)
      expect(new ApiError('x', 'm', 409).isConflict).toBe(true)
      expect(new ApiError('x', 'm', 200).isNotFound).toBe(false)
    })
  })
})
