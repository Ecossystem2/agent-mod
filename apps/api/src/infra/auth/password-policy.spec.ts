import { describe, expect, it } from 'vitest'

import { checkPassword, isStrongPassword } from './password-policy'

describe('checkPassword', () => {
  it('rejeita senha abaixo do mínimo', () => {
    const sut = checkPassword('Ab1!xyz')

    expect(sut.ok).toBe(false)
    expect(sut.reason).toContain('mínimo')
  })

  it('rejeita senha acima do máximo', () => {
    const sut = checkPassword(`Ab1!${'x'.repeat(130)}`)

    expect(sut.ok).toBe(false)
    expect(sut.reason).toContain('máximo')
  })

  it('rejeita quando há menos de 3 classes de caracteres', () => {
    const sut = checkPassword('abcdefghijklmnop')

    expect(sut.ok).toBe(false)
    expect(sut.reason).toContain('3 das 4 classes')
  })

  it('rejeita sequências triviais', () => {
    const sut = checkPassword('Xy9!abcdefghZ')

    expect(sut.ok).toBe(false)
    expect(sut.reason).toContain('sequências triviais')
  })

  it('rejeita repetições longas de caractere', () => {
    const sut = checkPassword('Zaaaaa1!bcdef')

    expect(sut.ok).toBe(false)
    expect(sut.reason).toContain('repetidos')
  })

  it('aceita senha forte', () => {
    const sut = checkPassword('Str0ng!Passw0rd')

    expect(sut.ok).toBe(true)
    expect(sut.reason).toBeUndefined()
  })
})

describe('isStrongPassword', () => {
  it('retorna true para senha forte', () => {
    expect(isStrongPassword('Str0ng!Passw0rd')).toBe(true)
  })

  it('retorna false para senha fraca', () => {
    expect(isStrongPassword('weak')).toBe(false)
  })
})
