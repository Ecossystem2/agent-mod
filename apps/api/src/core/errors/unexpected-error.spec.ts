import { describe, expect, it } from 'vitest'

import { UnexpectedError } from './unexpected-error'

describe(UnexpectedError.name, () => {
  it('tem kind "UnexpectedError" e mensagem padrão', () => {
    const sut = new UnexpectedError()

    expect(sut.kind).toBe('UnexpectedError')
    expect(sut.message).toBe('Ocorreu um erro inesperado.')
  })

  it('expõe a causa original quando fornecida', () => {
    const cause = new Error('falha interna')
    const sut = new UnexpectedError(cause)

    expect(sut.originalCause).toBe(cause)
  })

  it('originalCause é undefined quando não fornecida', () => {
    const sut = new UnexpectedError()

    expect(sut.originalCause).toBeUndefined()
  })
})
