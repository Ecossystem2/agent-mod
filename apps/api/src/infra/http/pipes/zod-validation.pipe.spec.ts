import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { CustomHttpException } from '../exceptions/custom-http.exception'

import { ZodValidationPipe } from './zod-validation.pipe'

import type { ArgumentMetadata } from '@nestjs/common'

const META: ArgumentMetadata = { type: 'body' }

function parseError(schema: z.ZodTypeAny, value: unknown): CustomHttpException {
  const sut = new ZodValidationPipe(schema)
  try {
    sut.transform(value, META)
    throw new Error('deveria ter lançado')
  } catch (err) {
    if (err instanceof CustomHttpException) return err
    throw err
  }
}

describe('ZodValidationPipe', () => {
  it('retorna o valor transformado em caso de sucesso', () => {
    const schema = z.object({ name: z.string().transform((s) => s.trim()) })
    const sut = new ZodValidationPipe(schema)

    const result = sut.transform({ name: '  ada  ' }, META)

    expect(result).toEqual({ name: 'ada' })
  })

  it('lança CustomHttpException com details em ZodError', () => {
    const schema = z.object({ age: z.number() })
    const sut = new ZodValidationPipe(schema)

    try {
      sut.transform({ age: 'x' }, META)
      expect.unreachable('deveria ter lançado')
    } catch (err) {
      expect(err).toBeInstanceOf(CustomHttpException)
      const exception = err as CustomHttpException
      expect(exception.kind).toBe('bad-request')
      expect(exception.details).toEqual([{ path: 'age', message: expect.any(String) }])
    }
  })

  it('re-lança erros que não são ZodError', () => {
    const boom = new Error('non-zod')
    const schema = {
      parse: () => {
        throw boom
      },
    } as unknown as z.ZodTypeAny
    const sut = new ZodValidationPipe(schema)

    expect(() => {
      sut.transform({}, META)
    }).toThrow(boom)
  })

  describe('ptBrErrorMap — invalid_type', () => {
    it('campo obrigatório quando undefined', () => {
      const err = parseError(z.object({ x: z.string() }), {})
      expect(err.details[0]!.message).toBe('Campo obrigatório.')
    })

    it('tipo inválido para tipo não-undefined', () => {
      const err = parseError(z.object({ x: z.number() }), { x: 'str' })
      expect(err.details[0]!.message).toContain('Tipo inválido')
    })
  })

  describe('ptBrErrorMap — too_small', () => {
    it('string — mínimo de caracteres (plural)', () => {
      const err = parseError(z.object({ x: z.string().min(3) }), { x: 'ab' })
      expect(err.details[0]!.message).toContain('Mínimo 3 caracteres')
    })

    it('string — mínimo de 1 caractere (singular)', () => {
      const err = parseError(z.object({ x: z.string().min(1) }), { x: '' })
      expect(err.details[0]!.message).toContain('Mínimo 1 caractere.')
    })

    it('string — exatamente N caracteres (plural)', () => {
      const err = parseError(z.object({ x: z.string().length(5) }), { x: 'ab' })
      expect(err.details[0]!.message).toContain('Exatamente 5 caracteres')
    })

    it('string — exatamente 1 caractere (singular)', () => {
      const err = parseError(z.object({ x: z.string().length(1) }), { x: '' })
      expect(err.details[0]!.message).toContain('Exatamente 1 caractere.')
    })

    it('array — mínimo de itens (plural)', () => {
      const err = parseError(z.object({ x: z.array(z.string()).min(2) }), { x: ['a'] })
      expect(err.details[0]!.message).toContain('Selecione ao menos 2 item')
    })

    it('array — mínimo de 1 item (singular)', () => {
      const err = parseError(z.object({ x: z.array(z.string()).min(1) }), { x: [] })
      expect(err.details[0]!.message).toContain('Selecione ao menos 1 item')
    })

    it('number — valor mínimo', () => {
      const err = parseError(z.object({ x: z.number().min(10) }), { x: 5 })
      expect(err.details[0]!.message).toContain('Valor mínimo: 10')
    })

    it('bigint — fallback para defaultError', () => {
      const err = parseError(z.object({ x: z.bigint().min(BigInt(10)) }), { x: BigInt(5) })
      expect(err.details[0]!.message).toBeTruthy()
    })
  })

  describe('ptBrErrorMap — too_big', () => {
    it('string — máximo de caracteres (plural)', () => {
      const err = parseError(z.object({ x: z.string().max(3) }), { x: 'abcde' })
      expect(err.details[0]!.message).toContain('Máximo 3 caracteres')
    })

    it('string — máximo de 1 caractere (singular)', () => {
      const err = parseError(z.object({ x: z.string().max(1) }), { x: 'abcde' })
      expect(err.details[0]!.message).toContain('Máximo 1 caractere.')
    })

    it('number — valor máximo', () => {
      const err = parseError(z.object({ x: z.number().max(5) }), { x: 10 })
      expect(err.details[0]!.message).toContain('Valor máximo: 5')
    })

    it('bigint — fallback para defaultError', () => {
      const err = parseError(z.object({ x: z.bigint().max(BigInt(5)) }), { x: BigInt(10) })
      expect(err.details[0]!.message).toBeTruthy()
    })
  })

  describe('ptBrErrorMap — invalid_string', () => {
    it('e-mail inválido', () => {
      const err = parseError(z.object({ x: z.string().email() }), { x: 'not-email' })
      expect(err.details[0]!.message).toBe('E-mail inválido.')
    })

    it('URL inválida', () => {
      const err = parseError(z.object({ x: z.string().url() }), { x: 'not-url' })
      expect(err.details[0]!.message).toBe('URL inválida.')
    })

    it('UUID inválido', () => {
      const err = parseError(z.object({ x: z.string().uuid() }), { x: 'not-uuid' })
      expect(err.details[0]!.message).toBe('ID inválido.')
    })

    it('regex inválido', () => {
      const err = parseError(z.object({ x: z.string().regex(/^\d+$/) }), { x: 'abc' })
      expect(err.details[0]!.message).toBe('Formato inválido.')
    })

    it('datetime — fallback para defaultError', () => {
      const err = parseError(z.object({ x: z.string().datetime() }), { x: 'not-datetime' })
      expect(err.details[0]!.message).toBeTruthy()
    })
  })

  describe('ptBrErrorMap — outros', () => {
    it('invalid_enum_value', () => {
      const err = parseError(z.object({ x: z.enum(['a', 'b'] as const) }), { x: 'c' })
      expect(err.details[0]!.message).toContain('Valor inválido')
    })

    it('invalid_date', () => {
      const err = parseError(z.object({ x: z.coerce.date() }), { x: 'not-a-date' })
      expect(err.details[0]!.message).toBe('Data inválida.')
    })

    it('custom issue com message', () => {
      const err = parseError(
        z.object({ x: z.string().refine(() => false, { message: 'custom msg' }) }),
        { x: 'val' },
      )
      expect(err.details[0]!.message).toBe('custom msg')
    })

    it('custom issue sem message usa defaultError', () => {
      const err = parseError(
        z.object({ x: z.string().refine(() => false) }),
        { x: 'val' },
      )
      expect(err.details[0]!.message).toBeTruthy()
    })
  })
})
