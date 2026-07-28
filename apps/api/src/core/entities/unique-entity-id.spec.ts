import { describe, expect, it } from 'vitest'

import { UniqueEntityID } from './unique-entity-id'

describe('UniqueEntityID', () => {
  it('gera um UUID quando nenhum valor é fornecido', () => {
    const sut = new UniqueEntityID()

    expect(sut.toString()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
  })

  it('usa o valor fornecido', () => {
    const sut = new UniqueEntityID('fixed-id')

    expect(sut.toString()).toBe('fixed-id')
    expect(sut.toValue()).toBe('fixed-id')
  })

  it('compara por valor com equals', () => {
    const a = new UniqueEntityID('same')
    const b = new UniqueEntityID('same')
    const c = new UniqueEntityID('other')

    expect(a.equals(b)).toBe(true)
    expect(a.equals(c)).toBe(false)
  })
})
