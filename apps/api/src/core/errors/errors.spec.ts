import { describe, expect, it } from 'vitest'

import { NotAllowedError } from './not-allowed-error'
import { ResourceAlreadyExistsError } from './resource-already-exists-error'
import { ResourceNotFoundError } from './resource-not-found-error'

describe('NotAllowedError', () => {
  it('usa a mensagem default e o kind', () => {
    const sut = new NotAllowedError()

    expect(sut.kind).toBe('not-allowed')
    expect(sut.message).toBe('Operação não permitida.')
    expect(sut.name).toBe('NotAllowedError')
  })

  it('aceita mensagem customizada', () => {
    const sut = new NotAllowedError('Sem acesso.')

    expect(sut.message).toBe('Sem acesso.')
  })
})

describe('ResourceNotFoundError', () => {
  it('usa a mensagem default e o kind', () => {
    const sut = new ResourceNotFoundError()

    expect(sut.kind).toBe('resource-not-found')
    expect(sut.message).toBe('Recurso não encontrado.')
    expect(sut.name).toBe('ResourceNotFoundError')
  })

  it('aceita mensagem customizada', () => {
    const sut = new ResourceNotFoundError('Usuário não encontrado.')

    expect(sut.message).toBe('Usuário não encontrado.')
  })
})

describe('ResourceAlreadyExistsError', () => {
  it('usa a mensagem default e o kind', () => {
    const sut = new ResourceAlreadyExistsError()

    expect(sut.kind).toBe('resource-already-exists')
    expect(sut.message).toBe('Recurso já existe.')
    expect(sut.name).toBe('ResourceAlreadyExistsError')
  })

  it('aceita mensagem customizada', () => {
    const sut = new ResourceAlreadyExistsError('Email já cadastrado.')

    expect(sut.message).toBe('Email já cadastrado.')
  })
})
